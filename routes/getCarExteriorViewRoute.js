const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Ensure this uses mysql2/promise
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/car-exterior/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'exterior-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
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

// GET all exterior views
router.get('/exterior-views', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_exterior_views ORDER BY created_at DESC';
  // logger.info('Fetching car exterior views data');

  try {
    const [results] = await db.query(sql);
    // logger.info(`Successfully fetched ${results.length} car exterior views`);

    res.status(200).json({
      message: 'Car exterior views data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car exterior views data: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car exterior views data',
      success: false,
      error: err.message
    });
  }
}));

// GET single exterior view by ID
router.get('/exterior-views/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_exterior_views WHERE id = ?';

  try {
    // logger.info(`Fetching car exterior view with ID: ${id}`);
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car exterior view not found',
        success: false
      });
    }

    // logger.info('Successfully fetched car exterior view');
    res.status(200).json({
      message: 'Car exterior view fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car exterior view: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car exterior view',
      success: false,
      error: err.message
    });
  }
}));

// POST new exterior view with image upload
router.post('/exterior-views', upload.single('image'), asyncHandler(async (req, res) => {
  const { label, caption, car_name } = req.body;
  
  // Validation
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!label || !caption || !car_name) {
    return res.status(400).json({
      message: 'Label, caption, and car name are required',
      success: false
    });
  }

  const img_url = req.file.path;
  const sql = 'INSERT INTO car_exterior_views (label, img_url, caption, car_name) VALUES (?, ?, ?, ?)';
  const values = [label, img_url, caption, car_name];

  try {
    // logger.info('Adding new car exterior view');
    const [result] = await db.query(sql, values);

    // logger.info(`Successfully added car exterior view with ID: ${result.insertId}`);
    res.status(201).json({
      message: 'Car exterior view created successfully',
      success: true,
      data: {
        id: result.insertId,
        label,
        img_url,
        caption,
        car_name,
        created_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error creating car exterior view: ' + err.message);
    res.status(500).json({
      message: 'Failed to create car exterior view',
      success: false,
      error: err.message
    });
  }
}));

// PUT update exterior view (with optional image update)
router.put('/exterior-views/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, caption, car_name } = req.body;
  
  // Validation
  if (!label || !caption || !car_name) {
    return res.status(400).json({
      message: 'Label, caption, and car name are required',
      success: false
    });
  }

  try {
    // logger.info(`Updating car exterior view with ID: ${id}`);

    // First, check if the view exists
    const [existing] = await db.query('SELECT * FROM car_exterior_views WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car exterior view not found',
        success: false
      });
    }

    let img_url = existing[0].img_url;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      img_url = req.file.path;
      // In a real application, you might want to delete the old image file here
    }

    const sql = 'UPDATE car_exterior_views SET label = ?, img_url = ?, caption = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
    const values = [label, img_url, caption, car_name, id];
    
    const [result] = await db.query(sql, values);

    // logger.info('Successfully updated car exterior view');
    res.status(200).json({
      message: 'Car exterior view updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        label,
        img_url,
        caption,
        car_name
      }
    });
  } catch (err) {
    // logger.error('Error updating car exterior view: ' + err.message);
    res.status(500).json({
      message: 'Failed to update car exterior view',
      success: false,
      error: err.message
    });
  }
}));

// DELETE exterior view
router.delete('/exterior-views/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_exterior_views WHERE id = ?';

  try {
    // logger.info(`Deleting car exterior view with ID: ${id}`);

    // First, check if the view exists
    const [existing] = await db.query('SELECT * FROM car_exterior_views WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car exterior view not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].img_url);

    // logger.info('Successfully deleted car exterior view');
    res.status(200).json({
      message: 'Car exterior view deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car exterior view: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car exterior view',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;