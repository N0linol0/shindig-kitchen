const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

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

  // Use Cloudinary if configured, otherwise fall back to local storage
  if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
    try {
      const cloudinary = require('cloudinary').v2;
      // Config is automatic if CLOUDINARY_URL env var is set
      if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
      }
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'shindig-kitchen',
            transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      return res.json({ url: result.secure_url, thumb: result.secure_url.replace('/upload/', '/upload/w_400,h_300,c_fill/') });
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      return res.status(500).json({ error: 'Image upload failed: ' + err.message });
    }
  }

  // Local fallback (ephemeral on Railway — images lost on redeploy)
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(1200, 800, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(filepath);
    res.json({ url: `/uploads/${filename}`, thumb: `/uploads/${filename}` });
  } catch (err) {
    console.error('Local upload failed:', err.message);
    res.status(500).json({ error: 'Image upload failed: ' + err.message });
  }
});

module.exports = router;
