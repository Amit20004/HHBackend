const express = require('express');
const router = express.Router();
const db = require('../db.js'); // mysql2 promise pool
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/car-performance/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'performance-' + uniqueSuffix + path.extname(file.originalname));
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

// GET all car performance engine items
router.get('/car-performance-engine', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_performance ORDER BY created_at DESC';

  try {
    // logger.info('Fetching car performance data');
    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} car performance records`);
    res.status(200).json({
      message: 'Car performance data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car performance data: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car performance data',
      success: false,
      error: err.message
    });
  }
}));

// GET single car performance engine item by ID
router.get('/car-performance-engine/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_performance WHERE id = ?';

  try {
    // logger.info(`Fetching car performance item with ID: ${id}`);
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car performance item not found',
        success: false
      });
    }

    // logger.info('Successfully fetched car performance item');
    res.status(200).json({
      message: 'Car performance item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car performance item: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car performance item',
      success: false,
      error: err.message
    });
  }
}));

// POST new car performance engine item with image upload
router.post('/car-performance-engine', upload.single('image'), asyncHandler(async (req, res) => {
  const { car_variant, tab_title, short_description, long_description, car_name } = req.body;
  
  // Validation
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!car_variant || !tab_title || !short_description || !long_description || !car_name) {
    return res.status(400).json({
      message: 'All fields are required',
      success: false
    });
  }

  const image_url = req.file.path.replace(/\\/g, "/");
  const sql = 'INSERT INTO car_performance (car_variant, tab_title, image_url, short_description, long_description, car_name) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [car_variant, tab_title, image_url, short_description, long_description, car_name];

  try {
    // logger.info('Adding new car performance item');
    const [result] = await db.query(sql, values);

    // logger.info(`Successfully added car performance item with ID: ${result.insertId}`);
    res.status(201).json({
      message: 'Car performance item created successfully',
      success: true,
      data: {
        id: result.insertId,
        car_variant,
        tab_title,
        image_url,
        short_description,
        long_description,
        car_name,
        created_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error creating car performance item: ' + err.message);
    res.status(500).json({
      message: 'Failed to create car performance item',
      success: false,
      error: err.message
    });
  }
}));

// PUT update car performance engine item (with optional image update)
router.put('/car-performance-engine/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { car_variant, tab_title, short_description, long_description, car_name } = req.body;
  
  // Validation
  if (!car_variant || !tab_title || !short_description || !long_description || !car_name) {
    return res.status(400).json({
      message: 'All fields are required',
      success: false
    });
  }

  try {
    // logger.info(`Updating car performance item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_performance WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car performance item not found',
        success: false
      });
    }

    let image_url = existing[0].image_url;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      image_url = req.file.path.replace(/\\/g, "/");
      // In a real application, you might want to delete the old image file here
    }

    const sql = 'UPDATE car_performance SET car_variant = ?, tab_title = ?, image_url = ?, short_description = ?, long_description = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
    const values = [car_variant, tab_title, image_url, short_description, long_description, car_name, id];
    
    const [result] = await db.query(sql, values);

    // logger.info('Successfully updated car performance item');
    res.status(200).json({
      message: 'Car performance item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        car_variant,
        tab_title,
        image_url,
        short_description,
        long_description,
        car_name
      }
    });
  } catch (err) {
    // logger.error('Error updating car performance item: ' + err.message);
    res.status(500).json({
      message: 'Failed to update car performance item',
      success: false,
      error: err.message
    });
  }
}));

// DELETE car performance engine item
router.delete('/car-performance-engine/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_performance WHERE id = ?';

  try {
    // logger.info(`Deleting car performance item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_performance WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car performance item not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].image_url);

    // logger.info('Successfully deleted car performance item');
    res.status(200).json({
      message: 'Car performance item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car performance item: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car performance item',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;