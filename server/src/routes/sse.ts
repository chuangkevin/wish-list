import { Router } from 'express';
import { EventEmitter } from 'events';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

export const issueEvents = new EventEmitter();
issueEvents.setMaxListeners(50);

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// SSE endpoint for real-time updates on an issue
router.get('/', (req: AuthRequest, res) => {
  const issueId = req.params.id as string;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const handler = (event: { type: string; data: unknown }) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  issueEvents.on(issueId, handler);

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    issueEvents.off(issueId, handler);
    clearInterval(keepAlive);
  });
});

export default router;
