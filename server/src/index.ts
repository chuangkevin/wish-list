import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/index.js';
import authRouter from './routes/auth.js';
import issuesRouter from './routes/issues.js';
import commentsRouter from './routes/comments.js';
import mediaRouter from './routes/media.js';
import sseRouter from './routes/sse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3737;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve uploaded media
app.use('/uploads', express.static(path.resolve(process.env.DATA_DIR || './data', 'uploads')));

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/issues/:id/comments', commentsRouter);
app.use('/api/issues/:id/media', mediaRouter);
app.use('/api/issues/:id/events', sseRouter);

// Serve client in production
const clientDist = path.resolve(__dirname, '../../client/dist');
import fs from 'fs';
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function main() {
  initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();
