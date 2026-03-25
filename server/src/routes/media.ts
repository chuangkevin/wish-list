import { Router } from 'express';
import { db } from '../db/index.js';
import { media, issues } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const dataDir = process.env.DATA_DIR || './data';
const uploadsDir = path.resolve(dataDir, 'uploads');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const issueId = req.params.id as string;
    const dir = path.join(uploadsDir, issueId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const videoTypes = ['video/mp4', 'video/webm'];
const allowedTypes = [...imageTypes, ...videoTypes];

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (for videos)
  },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的檔案類型: ${file.mimetype}`));
    }
  },
});

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Upload media to an issue
router.post('/', upload.array('files', 20), (req: AuthRequest, res) => {
  const issueId = req.params.id as string;
  const { commentId } = req.body;

  // Verify issue exists
  const issue = db.select().from(issues).where(eq(issues.id, issueId)).get();
  if (!issue) {
    res.status(404).json({ error: '找不到該問題' });
    return;
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: '請選擇檔案' });
    return;
  }

  const results = files.map((file) => {
    const id = uuidv4();
    const relativePath = `uploads/${issueId}/${file.filename}`;
    db.insert(media).values({
      id,
      issueId,
      commentId: commentId || null,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: relativePath,
    }).run();
    return { id, filename: file.originalname, mimetype: file.mimetype, size: file.size, path: relativePath };
  });

  res.status(201).json(results);
});

// Get media file
router.get('/:mediaId', (req: AuthRequest, res) => {
  const record = db.select().from(media).where(eq(media.id, req.params.mediaId as string)).get();
  if (!record) {
    res.status(404).json({ error: '找不到該檔案' });
    return;
  }

  const filePath = path.resolve(dataDir, record.path);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '檔案不存在' });
    return;
  }

  res.sendFile(filePath);
});

// Delete media
router.delete('/:mediaId', (req: AuthRequest, res) => {
  const record = db.select().from(media).where(eq(media.id, req.params.mediaId as string)).get();
  if (!record) {
    res.status(404).json({ error: '找不到該檔案' });
    return;
  }

  // Delete file from filesystem
  const filePath = path.resolve(dataDir, record.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from database
  db.delete(media).where(eq(media.id, req.params.mediaId as string)).run();

  res.json({ message: '已刪除' });
});

export default router;
