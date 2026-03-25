import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: { id: string; nickname: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: '請先設定暱稱' });
    return;
  }

  const user = db.select().from(users).where(eq(users.token, token)).get();
  if (!user) {
    res.status(401).json({ error: 'Token 無效，請重新設定暱稱' });
    return;
  }

  req.user = { id: user.id, nickname: user.nickname };
  next();
}
