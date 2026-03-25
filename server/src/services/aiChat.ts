import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/index.js';
import { aiChats, issues, media, comments, users } from '../db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getGeminiApiKey, getGeminiApiKeyExcluding, getGeminiModel, trackUsage } from './geminiKeys.js';
import fs from 'fs';
import path from 'path';

const dataDir = process.env.DATA_DIR || './data';

function buildSystemPrompt(issue: any, issueMedia: any[], issueComments: any[]): string {
  let prompt = `你是一位專業的工作問題顧問。使用者在工作中遇到困難，請你根據問題的描述、附件（圖片/影片）以及留言討論，給出具體可行的建議。

## 問題資訊
- 標題：${issue.title}
- 描述：${issue.description || '（無描述）'}
- 狀態：${issue.status}
- 優先級：${issue.priority}
- 建立時間：${issue.createdAt}
`;

  if (issueComments.length > 0) {
    prompt += `\n## 留言討論\n`;
    issueComments.forEach((c) => {
      prompt += `- ${c.authorNickname}：${c.content}\n`;
    });
  }

  if (issueMedia.length > 0) {
    prompt += `\n## 附件\n共有 ${issueMedia.length} 個附件（圖片/影片），已包含在對話中供你參考。\n`;
  }

  prompt += `\n請用繁體中文回覆。分析問題並給出具體建議，如果有附件請一併分析。`;
  return prompt;
}

async function loadMediaParts(issueMedia: any[]): Promise<{ inlineData: { mimeType: string; data: string } }[]> {
  const parts: { inlineData: { mimeType: string; data: string } }[] = [];

  for (const m of issueMedia) {
    // Only include images (Gemini vision)
    if (!m.mimetype.startsWith('image/')) continue;
    const filePath = path.resolve(dataDir, m.path);
    if (!fs.existsSync(filePath)) continue;

    try {
      const data = fs.readFileSync(filePath);
      parts.push({
        inlineData: {
          mimeType: m.mimetype,
          data: data.toString('base64'),
        },
      });
    } catch {
      // Skip files that can't be read
    }
  }
  return parts;
}

export async function chatWithAI(issueId: string, userMessage: string): Promise<{ reply: string; error?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { reply: '', error: '尚未設定 Gemini API Key，請至設定頁面新增' };
  }

  // Load issue context
  const issue = db.select().from(issues).where(eq(issues.id, issueId)).get();
  if (!issue) {
    return { reply: '', error: '找不到該問題' };
  }

  // Load media
  const issueMedia = db.select().from(media).where(eq(media.issueId, issueId)).all();

  // Load comments with author names
  const issueComments = db
    .select({
      content: comments.content,
      authorNickname: users.nickname,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.issueId, issueId))
    .orderBy(asc(comments.createdAt))
    .all();

  // Load chat history
  const history = db
    .select()
    .from(aiChats)
    .where(eq(aiChats.issueId, issueId))
    .orderBy(asc(aiChats.createdAt))
    .all();

  // Save user message
  db.insert(aiChats).values({
    id: uuidv4(),
    issueId,
    role: 'user',
    content: userMessage,
    createdAt: new Date().toISOString(),
  }).run();

  // Build conversation
  const systemPrompt = buildSystemPrompt(issue, issueMedia, issueComments);
  const mediaParts = await loadMediaParts(issueMedia);

  let currentKey = apiKey;
  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries) {
    try {
      const genai = new GoogleGenerativeAI(currentKey);
      const model = genai.getGenerativeModel({
        model: getGeminiModel(),
        systemInstruction: systemPrompt,
      });

      // Build chat history for Gemini
      const geminiHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

      for (const msg of history) {
        geminiHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const chat = model.startChat({
        history: geminiHistory.length > 0 ? geminiHistory : undefined,
      });

      // Build message parts: text + images
      const messageParts: any[] = [{ text: userMessage }];
      // Include media on first message only
      if (history.length === 0 && mediaParts.length > 0) {
        messageParts.push(...mediaParts);
      }

      const result = await chat.sendMessage(messageParts);
      const reply = result.response.text();

      // Track usage
      trackUsage(currentKey.slice(-4), getGeminiModel(), 'ai-chat', result.response.usageMetadata);

      // Save assistant reply
      db.insert(aiChats).values({
        id: uuidv4(),
        issueId,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      }).run();

      return { reply };
    } catch (err: any) {
      const msg = err?.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests');

      if (isRateLimit && retries < maxRetries) {
        const altKey = getGeminiApiKeyExcluding(currentKey);
        if (altKey) {
          console.warn(`[ai-chat] 429 on key ...${currentKey.slice(-4)}, retrying with ...${altKey.slice(-4)}`);
          currentKey = altKey;
          retries++;
          continue;
        }
      }

      console.error('[ai-chat] Error:', msg);
      return { reply: '', error: `AI 回覆失敗: ${msg}` };
    }
  }

  return { reply: '', error: 'AI 回覆失敗，已達最大重試次數' };
}

export function getChatHistory(issueId: string) {
  return db
    .select()
    .from(aiChats)
    .where(eq(aiChats.issueId, issueId))
    .orderBy(asc(aiChats.createdAt))
    .all();
}

export function clearChatHistory(issueId: string) {
  db.delete(aiChats).where(eq(aiChats.issueId, issueId)).run();
}
