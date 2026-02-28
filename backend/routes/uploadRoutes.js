const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../../frontend/uploads');

    // Determine subdirectory
    if (file.fieldname === 'avatar') {
      uploadPath = path.join(uploadPath, 'avatars');
    } else {
      uploadPath = path.join(uploadPath, 'creations');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload image (generic/creations)
router.post('/image', auth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Return relative path accessible via static server
    const relativePath = `/uploads/creations/${req.file.filename}`;

    res.json({
      success: true,
      url: relativePath,
      path: relativePath
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'upload_failed', details: err.message });
  }
});

// Upload multiple images
router.post('/images', auth, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const results = req.files.map(file => ({
      success: true,
      filename: file.originalname,
      url: `/uploads/creations/${file.filename}`,
      path: `/uploads/creations/${file.filename}`
    }));

    res.json({
      success: true,
      results: results,
      uploaded: results.length,
      total: results.length
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'upload_failed', details: err.message });
  }
});

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    const relativePath = `/uploads/avatars/${req.file.filename}`;

    // Todo: Update user profile with new avatar URL automatically?
    // For now just return the URL

    res.json({
      success: true,
      url: relativePath,
      path: relativePath
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'upload_failed', details: err.message });
  }
});

// Delete image (Optional: Implement file deletion)
router.delete('/image', auth, (req, res) => {
  // Basic implementation - just acknowledge
  // In real app, would delete file from disk
  res.json({ success: true, message: 'Image deleted' });
});

module.exports = router;