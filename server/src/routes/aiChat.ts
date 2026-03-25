import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { chatWithAI, getChatHistory, clearChatHistory } from '../services/aiChat.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// Get chat history for an issue
router.get('/', (req: AuthRequest, res) => {
  const issueId = req.params.id as string;
  const history = getChatHistory(issueId);
  res.json(history);
});

// Send message to AI
router.post('/', async (req: AuthRequest, res) => {
  const issueId = req.params.id as string;
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: '請輸入訊息' });
    return;
  }

  const result = await chatWithAI(issueId, message.trim());
  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json({ reply: result.reply });
});

// Clear chat history
router.delete('/', (req: AuthRequest, res) => {
  const issueId = req.params.id as string;
  clearChatHistory(issueId);
  res.json({ message: '已清除對話記錄' });
});

export default router;
