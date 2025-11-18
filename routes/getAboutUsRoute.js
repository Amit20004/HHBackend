const express = require('express');
const router = express.Router();
const db = require('../db.js');
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/about-us/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'about-' + uniqueSuffix + path.extname(file.originalname));
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

// GET about us data
router.get('/about-us', asyncHandler(async (req, res) => {
  const sql = `SELECT * FROM about_us LIMIT 1`;

  const [result] = await db.query(sql);

  if (result.length > 0) {
    // logger.info('Fetched About Us data successfully');
    res.json({
      success: true,
      data: result[0]
    });
  } else {
    // logger.warn('No About Us data found');
    res.status(404).json({
      success: false,
      message: 'No About Us content found'
    });
  }
}));

// POST new about us content
router.post('/about-us', upload.fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const { company_name, page_heading, p1, p2, p3, p4 } = req.body;

  // Check if there's already content
  const [existing] = await db.query('SELECT * FROM about_us LIMIT 1');
  
  if (existing.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'About content already exists. Use PUT to update.'
    });
  }

  let img1_url = null;
  let img2_url = null;

  if (req.files?.img1) {
    img1_url = `/uploads/about-us/${req.files.img1[0].filename}`;
  }

  if (req.files?.img2) {
    img2_url = `/uploads/about-us/${req.files.img2[0].filename}`;
  }

  const sql = `INSERT INTO about_us 
    (company_name, page_heading, img1, img2, p1, p2, p3, p4) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const [result] = await db.query(sql, [
    company_name, page_heading, img1_url, img2_url, p1, p2, p3, p4
  ]);

  res.status(201).json({
    success: true,
    message: 'About content created successfully',
    data: {
      id: result.insertId,
      company_name,
      page_heading,
      img1: img1_url,
      img2: img2_url,
      p1, p2, p3, p4
    }
  });
}));

// PUT update about us content
router.put('/about-us/:id', upload.fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { company_name, page_heading, p1, p2, p3, p4 } = req.body;

  // Get existing data to preserve image URLs if not updated
  const [existing] = await db.query('SELECT * FROM about_us WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'About content not found'
    });
  }

  let img1_url = existing[0].img1;
  let img2_url = existing[0].img2;

  // Update image URLs if new files are uploaded
  if (req.files?.img1) {
    img1_url = `/uploads/about-us/${req.files.img1[0].filename}`;
  }

  if (req.files?.img2) {
    img2_url = `/uploads/about-us/${req.files.img2[0].filename}`;
  }

  const sql = `UPDATE about_us SET 
    company_name = ?, page_heading = ?, img1 = ?, img2 = ?, 
    p1 = ?, p2 = ?, p3 = ?, p4 = ?, updated_at = NOW() 
    WHERE id = ?`;
  
  await db.query(sql, [
    company_name, page_heading, img1_url, img2_url, 
    p1, p2, p3, p4, id
  ]);

  res.json({
    success: true,
    message: 'About content updated successfully',
    data: {
      id: parseInt(id),
      company_name,
      page_heading,
      img1: img1_url,
      img2: img2_url,
      p1, p2, p3, p4
    }
  });
}));

// DELETE about us content
router.delete('/about-us/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await db.query('DELETE FROM about_us WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: 'About content not found'
    });
  }

  res.json({
    success: true,
    message: 'About content deleted successfully'
  });
}));

module.exports = router;