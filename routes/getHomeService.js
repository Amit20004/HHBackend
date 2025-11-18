const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db.js'); // mysql2/promise
const fs=require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'home-services');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + '-' + file.originalname.replace(/\s+/g, '_')
    );
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// -------------------- GET --------------------
router.get('/home-services', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM home_services');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- POST --------------------
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { serviceName } = req.body;
    const imageUrl = req.file ? `/uploads/home-services/${req.file.filename}` : null;

    const [result] = await db.query(
      'INSERT INTO home_services (serviceName, imageUrl) VALUES (?, ?)',
      [serviceName, imageUrl]
    );

    res.json({ success: true, message: 'Service added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- PUT --------------------
router.put('/home-services/:id', upload.single('image'), async (req, res) => {
  try {
    const { serviceName } = req.body;
    const { id } = req.params;

    let sql = 'UPDATE home_services SET serviceName = ?';
    const params = [serviceName];

    if (req.file) {
      sql += ', imageUrl = ?';
      params.push(`/uploads/home-services/${req.file.filename}`);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.query(sql, params);

    res.json({ success: true, message: 'Service updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- DELETE --------------------
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM home_services WHERE id = ?', [id]);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
