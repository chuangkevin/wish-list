import { Router } from 'express';
import { db } from '../db/index.js';
import { comments, users, media } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { issueEvents } from './sse.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Get comments for an issue
router.get('/', (req: AuthRequest, res) => {
  const issueId = req.params.id as string;

  const result = db
    .select({
      id: comments.id,
      issueId: comments.issueId,
      authorId: comments.authorId,
      authorNickname: users.nickname,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.issueId, issueId))
    .orderBy(asc(comments.createdAt))
    .all();

  // Get media for each comment
  const commentsWithMedia = result.map((comment) => {
    const commentMedia = db
      .select()
      .from(media)
      .where(eq(media.commentId, comment.id))
      .all();
    return { ...comment, media: commentMedia };
  });

  res.json(commentsWithMedia);
});

// Add comment to an issue
router.post('/', (req: AuthRequest, res) => {
  const issueId = req.params.id as string;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '留言內容不能為空' });
    return;
  }

  const id = uuidv4();
  db.insert(comments).values({
    id,
    issueId,
    authorId: req.user!.id,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }).run();

  const comment = db
    .select({
      id: comments.id,
      issueId: comments.issueId,
      authorId: comments.authorId,
      authorNickname: users.nickname,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.id, id))
    .get();

  // Notify SSE subscribers
  issueEvents.emit(issueId as string, { type: 'new_comment', data: comment });

  res.status(201).json(comment);
});

export default router;
