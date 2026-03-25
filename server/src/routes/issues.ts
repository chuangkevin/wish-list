import { Router } from 'express';
import { db } from '../db/index.js';
import { issues, users, comments, media } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All issue routes require auth
router.use(authMiddleware);

// Create issue
router.post('/', (req: AuthRequest, res) => {
  const { title, description, priority } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: '請輸入問題標題' });
    return;
  }

  const validPriorities = ['low', 'medium', 'high'];
  const issuePriority = validPriorities.includes(priority) ? priority : 'medium';

  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(issues).values({
    id,
    title: title.trim(),
    description: description?.trim() || '',
    status: 'open',
    priority: issuePriority,
    authorId: req.user!.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  const issue = db.select().from(issues).where(eq(issues.id, id)).get();
  res.status(201).json(issue);
});

// List issues with optional status filter
router.get('/', (req: AuthRequest, res) => {
  const { status } = req.query;
  const validStatuses = ['open', 'in_progress', 'resolved'];

  let query = db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      authorId: issues.authorId,
      authorNickname: users.nickname,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.issue_id = ${issues.id})`,
      mediaCount: sql<number>`(SELECT COUNT(*) FROM media WHERE media.issue_id = ${issues.id} AND media.comment_id IS NULL)`,
    })
    .from(issues)
    .leftJoin(users, eq(issues.authorId, users.id))
    .orderBy(desc(issues.createdAt));

  if (status && typeof status === 'string' && validStatuses.includes(status)) {
    query = query.where(eq(issues.status, status)) as typeof query;
  }

  const result = query.all();
  res.json(result);
});

// Get single issue with details
router.get('/:id', (req: AuthRequest, res) => {
  const issue = db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      authorId: issues.authorId,
      authorNickname: users.nickname,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .leftJoin(users, eq(issues.authorId, users.id))
    .where(eq(issues.id, req.params.id as string))
    .get();

  if (!issue) {
    res.status(404).json({ error: '找不到該問題' });
    return;
  }

  // Get media for this issue (not attached to comments)
  const issueMedia = db
    .select()
    .from(media)
    .where(and(eq(media.issueId, req.params.id as string), sql`${media.commentId} IS NULL`))
    .all();

  res.json({ ...issue, media: issueMedia });
});

// Update issue (title, description, status, priority)
router.patch('/:id', (req: AuthRequest, res) => {
  const existing = db.select().from(issues).where(eq(issues.id, req.params.id as string)).get();
  if (!existing) {
    res.status(404).json({ error: '找不到該問題' });
    return;
  }

  const updates: Record<string, string> = {};
  const { title, description, status, priority } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: '標題不能為空' });
      return;
    }
    updates.title = title.trim();
  }
  if (description !== undefined) updates.description = description?.trim() || '';
  if (status !== undefined) {
    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: '無效的狀態' });
      return;
    }
    updates.status = status;
  }
  if (priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ error: '無效的優先級' });
      return;
    }
    updates.priority = priority;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: '沒有要更新的欄位' });
    return;
  }

  db.update(issues)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(issues.id, req.params.id as string))
    .run();

  const updated = db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      authorId: issues.authorId,
      authorNickname: users.nickname,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .leftJoin(users, eq(issues.authorId, users.id))
    .where(eq(issues.id, req.params.id as string))
    .get();

  res.json(updated);
});

export default router;
