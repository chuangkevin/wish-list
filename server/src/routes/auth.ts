import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register with nickname
router.post('/register', (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    res.status(400).json({ error: '請輸入暱稱' });
    return;
  }

  const trimmed = nickname.trim();
  if (trimmed.length > 20) {
    res.status(400).json({ error: '暱稱不能超過 20 個字' });
    return;
  }

  // Check if nickname already exists
  const existing = db.select().from(users).where(eq(users.nickname, trimmed)).get();
  if (existing) {
    res.status(409).json({ error: '暱稱已被使用，請更換' });
    return;
  }

  const id = uuidv4();
  const token = uuidv4();
  db.insert(users).values({ id, nickname: trimmed, token, createdAt: new Date().toISOString() }).run();

  res.status(201).json({ id, nickname: trimmed, token });
});

// List all users (for login selection)
router.get('/users', (_req, res) => {
  const result = db.select({ id: users.id, nickname: users.nickname }).from(users).all();
  res.json(result);
});

// Login as existing user
router.post('/login', (req, res) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: '請選擇使用者' });
    return;
  }
  const user = db.select().from(users).where(eq(users.id, id as string)).get();
  if (!user) {
    res.status(404).json({ error: '使用者不存在' });
    return;
  }
  res.json({ id: user.id, nickname: user.nickname, token: user.token });
});

// Get current user info
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ id: req.user!.id, nickname: req.user!.nickname });
});

export default router;
