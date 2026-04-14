const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(1200, 800, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(filepath);
    const thumb = `thumb-${filename}`;
    const thumbpath = path.join(uploadDir, thumb);
    await sharp(req.file.buffer)
      .resize(400, 300, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toFile(thumbpath);
    res.json({
      url: `/uploads/${filename}`,
      thumb: `/uploads/${thumb}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

module.exports = router;
