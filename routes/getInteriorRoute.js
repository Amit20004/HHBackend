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
    cb(null, 'uploads/car-interior/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'interior-' + uniqueSuffix + path.extname(file.originalname));
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

// GET all interior gallery items
router.get('/car-int-gallery', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_int_gallery ORDER BY created_at DESC';

  // logger.info('Fetching car interior gallery');

  try {
    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} car interior gallery records`);

    res.status(200).json({
      message: 'Car interior gallery fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car interior gallery: ' + err.message);

    res.status(500).json({
      message: 'Failed to fetch car interior gallery data',
      success: false,
      error: err.message
    });
  }
}));

// GET single interior gallery item by ID
router.get('/car-int-gallery/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_int_gallery WHERE id = ?';

  try {
    // logger.info(`Fetching car interior gallery item with ID: ${id}`);
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car interior gallery item not found',
        success: false
      });
    }

    // logger.info('Successfully fetched car interior gallery item');
    res.status(200).json({
      message: 'Car interior gallery item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car interior gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car interior gallery item',
      success: false,
      error: err.message
    });
  }
}));

// POST new interior gallery item with image upload
router.post('/car-int-gallery', upload.single('image'), asyncHandler(async (req, res) => {
  const { car_name, description } = req.body;
  
  // Validation
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!car_name || !description) {
    return res.status(400).json({
      message: 'Car name and description are required',
      success: false
    });
  }

  const image_url = req.file.path;
  const sql = 'INSERT INTO car_int_gallery (car_name, image_url, description) VALUES (?, ?, ?)';
  const values = [car_name, image_url, description];

  try {
    // logger.info('Adding new car to interior gallery');
    const [result] = await db.query(sql, values);

    // logger.info(`Successfully added car to interior gallery with ID: ${result.insertId}`);
    res.status(201).json({
      message: 'Car interior gallery item created successfully',
      success: true,
      data: {
        id: result.insertId,
        car_name,
        image_url,
        description,
        created_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error creating car interior gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to create car interior gallery item',
      success: false,
      error: err.message
    });
  }
}));

// PUT update interior gallery item (with optional image update)
router.put('/car-int-gallery/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { car_name, description } = req.body;
  
  // Validation
  if (!car_name || !description) {
    return res.status(400).json({
      message: 'Car name and description are required',
      success: false
    });
  }

  try {
    // logger.info(`Updating car interior gallery item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_int_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car interior gallery item not found',
        success: false
      });
    }

    let image_url = existing[0].image_url;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      image_url = req.file.path;
      // In a real application, you might want to delete the old image file here
    }

    const sql = 'UPDATE car_int_gallery SET car_name = ?, image_url = ?, description = ?, updated_at = NOW() WHERE id = ?';
    const values = [car_name, image_url, description, id];
    
    const [result] = await db.query(sql, values);

    // logger.info('Successfully updated car interior gallery item');
    res.status(200).json({
      message: 'Car interior gallery item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        car_name,
        image_url,
        description
      }
    });
  } catch (err) {
    // logger.error('Error updating car interior gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to update car interior gallery item',
      success: false,
      error: err.message
    });
  }
}));

// DELETE interior gallery item
router.delete('/car-int-gallery/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_int_gallery WHERE id = ?';

  try {
    // logger.info(`Deleting car interior gallery item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_int_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car interior gallery item not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].image_url);

    // logger.info('Successfully deleted car interior gallery item');
    res.status(200).json({
      message: 'Car interior gallery item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car interior gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car interior gallery item',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;