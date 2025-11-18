const express = require('express');
const router = express.Router();
const db = require('../db.js');
const multer = require('multer');
const path = require('path');
const fs =require('fs')
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'home-carousel');
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

// GET all carousel items
router.get('/home-carousel', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM home_carousel ORDER BY created_at DESC';

  // logger.info('Fetching all home carousel data');

  const [results] = await db.query(sql);

  // logger.info(`Successfully fetched ${results.length} home carousel records`);
  res.status(200).json({
    message: 'Home carousel data fetched successfully',
    success: true,
    data: results
  });
}));

// GET single carousel item
router.get('/home-carousel/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM home_carousel WHERE id = ?';

  const [results] = await db.query(sql, [id]);

  if (results.length === 0) {
    return res.status(404).json({
      message: 'Carousel item not found',
      success: false
    });
  }

  res.status(200).json({
    message: 'Home carousel item fetched successfully',
    success: true,
    data: results[0]
  });
}));

// POST new carousel item
router.post('/home-carousel', upload.single('image'), asyncHandler(async (req, res) => {
  const { image_name } = req.body;
  
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  const image_url = `/uploads/home-carousel/${req.file.filename}`;
  const sql = 'INSERT INTO home_carousel (image_name, image_url) VALUES (?, ?)';
  
  const [result] = await db.query(sql, [image_name, image_url]);

  // logger.info(`Created new carousel item with ID: ${result.insertId}`);
  res.status(201).json({
    message: 'Carousel item created successfully',
    success: true,
    data: {
      id: result.insertId,
      image_name,
      image_url,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
}));

// PUT update carousel item
router.put('/home-carousel/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { image_name } = req.body;

  // Check if item exists
  const [checkResults] = await db.query('SELECT * FROM home_carousel WHERE id = ?', [id]);
  
  if (checkResults.length === 0) {
    return res.status(404).json({
      message: 'Carousel item not found',
      success: false
    });
  }

  let image_url = checkResults[0].image_url;
  
  // If new image is uploaded, update the image_url
  if (req.file) {
    image_url = `/uploads/home-carousel/${req.file.filename}`;
  }

  const sql = 'UPDATE home_carousel SET image_name = ?, image_url = ?, updated_at = NOW() WHERE id = ?';
  
  await db.query(sql, [image_name, image_url, id]);

  // logger.info(`Updated carousel item with ID: ${id}`);
  res.status(200).json({
    message: 'Carousel item updated successfully',
    success: true,
    data: {
      id: parseInt(id),
      image_name,
      image_url,
      updated_at: new Date()
    }
  });
}));

// DELETE carousel item
router.delete('/home-carousel/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if item exists
  const [checkResults] = await db.query('SELECT * FROM home_carousel WHERE id = ?', [id]);
  
  if (checkResults.length === 0) {
    return res.status(404).json({
      message: 'Carousel item not found',
      success: false
    });
  }

  const sql = 'DELETE FROM home_carousel WHERE id = ?';
  
  await db.query(sql, [id]);

  // logger.info(`Deleted carousel item with ID: ${id}`);
  res.status(200).json({
    message: 'Carousel item deleted successfully',
    success: true
  });
}));

module.exports = router;