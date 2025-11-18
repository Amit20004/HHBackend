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
    cb(null, 'uploads/car-convenience/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'convenience-' + uniqueSuffix + path.extname(file.originalname));
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

// GET all car convenience feature items
router.get('/car-convenience-feature', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_convenience_features ORDER BY created_at DESC';

  try {
    // logger.info('Fetching car convenience feature data');
    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} car convenience feature records`);
    res.status(200).json({
      message: 'Car convenience feature data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car convenience feature data: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car convenience feature data',
      success: false,
      error: err.message
    });
  }
}));

// GET single car convenience feature item by ID
router.get('/car-convenience-feature/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_convenience_features WHERE id = ?';

  try {
    // logger.info(`Fetching car convenience feature item with ID: ${id}`);
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car convenience feature item not found',
        success: false
      });
    }

    // logger.info('Successfully fetched car convenience feature item');
    res.status(200).json({
      message: 'Car convenience feature item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car convenience feature item: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car convenience feature item',
      success: false,
      error: err.message
    });
  }
}));

// POST new car convenience feature item with image upload
router.post('/car-convenience-feature', upload.single('image'), asyncHandler(async (req, res) => {
  const { title, content, car_name } = req.body;
  
  // Validation
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!title || !content || !car_name) {
    return res.status(400).json({
      message: 'Title, content, and car name are required',
      success: false
    });
  }

  const image = req.file.path;
  const sql = 'INSERT INTO car_convenience_features (title, content, image, car_name) VALUES (?, ?, ?, ?)';
  const values = [title, content, image, car_name];

  try {
    // logger.info('Adding new car convenience feature item');
    const [result] = await db.query(sql, values);

    // logger.info(`Successfully added car convenience feature item with ID: ${result.insertId}`);
    res.status(201).json({
      message: 'Car convenience feature item created successfully',
      success: true,
      data: {
        id: result.insertId,
        title,
        content,
        image,
        car_name,
        created_at: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error creating car convenience feature item: ' + err.message);
    res.status(500).json({
      message: 'Failed to create car convenience feature item',
      success: false,
      error: err.message
    });
  }
}));

// PUT update car convenience feature item (with optional image update)
router.put('/car-convenience-feature/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, car_name } = req.body;
  
  // Validation
  if (!title || !content || !car_name) {
    return res.status(400).json({
      message: 'Title, content, and car name are required',
      success: false
    });
  }

  try {
    // logger.info(`Updating car convenience feature item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_convenience_features WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car convenience feature item not found',
        success: false
      });
    }

    let image = existing[0].image;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      image = req.file.path;
      // In a real application, you might want to delete the old image file here
    }

    const sql = 'UPDATE car_convenience_features SET title = ?, content = ?, image = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
    const values = [title, content, image, car_name, id];
    
    const [result] = await db.query(sql, values);

    // logger.info('Successfully updated car convenience feature item');
    res.status(200).json({
      message: 'Car convenience feature item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        title,
        content,
        image,
        car_name
      }
    });
  } catch (err) {
    // logger.error('Error updating car convenience feature item: ' + err.message);
    res.status(500).json({
      message: 'Failed to update car convenience feature item',
      success: false,
      error: err.message
    });
  }
}));

// DELETE car convenience feature item
router.delete('/car-convenience-feature/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_convenience_features WHERE id = ?';

  try {
    // logger.info(`Deleting car convenience feature item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_convenience_features WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car convenience feature item not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].image);

    // logger.info('Successfully deleted car convenience feature item');
    res.status(200).json({
      message: 'Car convenience feature item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car convenience feature item: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car convenience feature item',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;