const express = require('express');
const router = express.Router();
const db = require('../db.js');
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/highlight-car-gallery/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'car-' + uniqueSuffix + path.extname(file.originalname));
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

// GET all gallery items
router.get('/highlight-gallery', async (req, res) => {
  const sql = 'SELECT * FROM car_highlight_gallery ORDER BY created_at DESC';

  try {
    // logger.info('Fetching car gallery data');

    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} gallery items`);
    res.status(200).json({
      message: 'Car gallery data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car gallery data: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car gallery data',
      success: false,
      error: err.message
    });
  }
});

// GET single gallery item by ID
router.get('/highlight-gallery/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_highlight_gallery WHERE id = ?';

  try {
    // logger.info(`Fetching car gallery item with ID: ${id}`);

    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Gallery item not found',
        success: false
      });
    }

    // logger.info('Successfully fetched gallery item');
    res.status(200).json({
      message: 'Car gallery item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car gallery item',
      success: false,
      error: err.message
    });
  }
});

// POST new gallery item with image upload
router.post('/highlight-gallery', upload.single('image'), async (req, res) => {
  const { car_name } = req.body;
  
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!car_name) {
    return res.status(400).json({
      message: 'Car name is required',
      success: false
    });
  }

  const image_url = `uploads/highlight-car-gallery/${req.file.filename}`;
  const sql = 'INSERT INTO car_highlight_gallery (image_url, car_name) VALUES (?, ?)';

  try {
    const [result] = await db.query(sql, [image_url, car_name]);
    res.status(201).json({
      message: 'Car added to gallery successfully',
      success: true,
      data: {
        id: result.insertId,
        image_url,
        car_name,
        created_at: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to add car to gallery',
      success: false,
      error: err.message
    });
  }
});

// PUT update gallery item (with optional image update)
router.put('/highlight-gallery/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { car_name } = req.body;
  
  if (!car_name) {
    return res.status(400).json({
      message: 'Car name is required',
      success: false
    });
  }

  try {
    const [existing] = await db.query('SELECT * FROM car_highlight_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Gallery item not found',
        success: false
      });
    }

    let image_url = existing[0].image_url;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      image_url = `uploads/highlight-car-gallery/${req.file.filename}`;
    }

    const sql = 'UPDATE car_highlight_gallery SET image_url = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
    await db.query(sql, [image_url, car_name, id]);

    res.status(200).json({
      message: 'Car gallery item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        image_url,
        car_name
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update car gallery item',
      success: false,
      error: err.message
    });
  }
});


// DELETE gallery item
router.delete('/highlight-gallery/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_highlight_gallery WHERE id = ?';

  try {
    // logger.info(`Deleting car gallery item with ID: ${id}`);

    // First, check if the item exists and get the image path
    const [existing] = await db.query('SELECT * FROM car_highlight_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Gallery item not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].image_url);

    // logger.info('Successfully deleted gallery item');
    res.status(200).json({
      message: 'Car gallery item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car gallery item',
      success: false,
      error: err.message
    });
  }
});

module.exports = router;