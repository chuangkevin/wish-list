import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getAllKeys, addApiKey, removeApiKey, getUsageStats, invalidateKeyCache, getGeminiModel } from '../services/geminiKeys.js';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
router.use(authMiddleware);

// List all API keys with usage stats
router.get('/api-keys', (_req, res) => {
  const keys = getAllKeys();
  const model = getGeminiModel();
  res.json({ keys, model });
});

// Add single API key
router.post('/api-keys', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    res.status(400).json({ error: '請輸入 API Key' });
    return;
  }

  const trimmed = apiKey.trim();
  if (!trimmed.startsWith('AIza') || trimmed.length < 20) {
    res.status(400).json({ error: 'API Key 格式不正確，應以 AIza 開頭' });
    return;
  }

  // Validate key by making a test call
  try {
    const genai = new GoogleGenerativeAI(trimmed);
    const model = genai.getGenerativeModel({ model: getGeminiModel() });
    await model.generateContent('Say OK');
  } catch (err: any) {
    res.status(400).json({ error: `API Key 驗證失敗: ${err.message}` });
    return;
  }

  addApiKey(trimmed);
  res.status(201).json({ message: '已新增', suffix: trimmed.slice(-4) });
});

// Batch import keys
router.post('/api-keys/batch', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: '請輸入 API Keys' });
    return;
  }

  const lines = text.split('\n');
  let added = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('AIza') && trimmed.length >= 20) {
      addApiKey(trimmed);
      added++;
    }
  }

  res.json({ message: `已匯入 ${added} 把 Key`, added });
});

// Delete API key by suffix
router.delete('/api-keys/:suffix', (req, res) => {
  const suffix = req.params.suffix as string;
  removeApiKey(suffix);
  res.json({ message: '已刪除' });
});

// Get token usage stats
router.get('/token-usage', (_req, res) => {
  const stats = getUsageStats();
  res.json(stats);
});

// Update model
router.put('/model', (req, res) => {
  const { model } = req.body;
  const validModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
  if (!validModels.includes(model)) {
    res.status(400).json({ error: '無效的模型' });
    return;
  }

  const existing = db.select().from(settings).where(eq(settings.key, 'gemini_model')).get();
  if (existing) {
    db.update(settings).set({ value: model, updatedAt: new Date().toISOString() }).where(eq(settings.key, 'gemini_model')).run();
  } else {
    db.insert(settings).values({ key: 'gemini_model', value: model, updatedAt: new Date().toISOString() }).run();
  }

  invalidateKeyCache();
  res.json({ message: '已更新', model });
});

export default router;
