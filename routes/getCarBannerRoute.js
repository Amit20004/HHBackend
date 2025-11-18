const express = require('express');
const router = express.Router();
const db = require('../db.js'); // This should be mysql2/promise pool
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/bannerImage/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET all banners
router.get('/page-banner', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_banner_img';

  // logger.info('Fetching page banner');

  try {
    const [results] = await db.query(sql); // Promise-based query

    // logger.info(`Successfully fetched ${results.length} page banner records`);
    res.status(200).json({
      message: 'Page banner fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching page banner: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch page banner data',
      success: false,
      error: err.message
    });
  }
}));

// GET single banner by ID
router.get('/page-banner/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_banner_img WHERE id = ?';

  try {
    const [results] = await db.query(sql, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        message: 'Banner not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Banner fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching banner: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch banner',
      success: false,
      error: err.message
    });
  }
}));

// GET banner by slug
router.get('/page-banner/slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const sql = 'SELECT * FROM car_banner_img WHERE slug = ?';

  try {
    const [results] = await db.query(sql, [slug]);
    
    if (results.length === 0) {
      return res.status(404).json({
        message: 'Banner not found for the given slug',
        success: false
      });
    }

    res.status(200).json({
      message: 'Banner fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching banner by slug: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch banner by slug',
      success: false,
      error: err.message
    });
  }
}));

// POST create new banner
router.post('/page-banner', upload.single('car_image'), asyncHandler(async (req, res) => {
  const { slug } = req.body;
  const car_image = req.file ? req.file.filename : null;

  if (!car_image) {
    return res.status(400).json({
      message: 'Image is required',
      success: false
    });
  }

  const sql = 'INSERT INTO car_banner_img (slug, car_image) VALUES (?, ?)';
  
  try {
    const [result] = await db.query(sql, [slug, car_image]);
    
    // logger.info('Banner created successfully with ID: ' + result.insertId);
    res.status(201).json({
      message: 'Banner created successfully',
      success: true,
      data: {
        id: result.insertId,
        slug,
        car_image,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error creating banner: ' + err.message);
    res.status(500).json({
      message: 'Failed to create banner',
      success: false,
      error: err.message
    });
  }
}));

// PUT update banner
router.put('/page-banner/:id', upload.single('car_image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug } = req.body;
  
  // Check if banner exists
  const checkSql = 'SELECT * FROM car_banner_img WHERE id = ?';
  const [checkResults] = await db.query(checkSql, [id]);
  
  if (checkResults.length === 0) {
    return res.status(404).json({
      message: 'Banner not found',
      success: false
    });
  }

  let updateSql, params;
  
  // If new image is uploaded
  if (req.file) {
    const car_image = req.file.filename;
    updateSql = 'UPDATE car_banner_img SET slug = ?, car_image = ?, updated_at = NOW() WHERE id = ?';
    params = [slug, car_image, id];
  } else {
    // Only update slug
    updateSql = 'UPDATE car_banner_img SET slug = ?, updated_at = NOW() WHERE id = ?';
    params = [slug, id];
  }

  try {
    await db.query(updateSql, params);
    
    // logger.info('Banner updated successfully with ID: ' + id);
    res.status(200).json({
      message: 'Banner updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        slug,
        updated_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error updating banner: ' + err.message);
    res.status(500).json({
      message: 'Failed to update banner',
      success: false,
      error: err.message
    });
  }
}));

// DELETE banner
router.delete('/page-banner/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if banner exists
  const checkSql = 'SELECT * FROM car_banner_img WHERE id = ?';
  const [checkResults] = await db.query(checkSql, [id]);
  
  if (checkResults.length === 0) {
    return res.status(404).json({
      message: 'Banner not found',
      success: false
    });
  }

  const deleteSql = 'DELETE FROM car_banner_img WHERE id = ?';
  
  try {
    await db.query(deleteSql, [id]);
    
    // logger.info('Banner deleted successfully with ID: ' + id);
    res.status(200).json({
      message: 'Banner deleted successfully',
      success: true
    });
  } catch (err) {
    // logger.error('Error deleting banner: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete banner',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;