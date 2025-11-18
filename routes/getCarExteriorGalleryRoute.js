const express = require('express');
const router = express.Router();
const db = require('../db.js'); // mysql2 promise pool
const multer = require('multer');
const path = require('path');
// const logger = require('../utils/logger/logger.js');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/car-ext-gallery/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ext-gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) =>{
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

// GET /car-ext-gallery
router.get('/car-ext-gallery', async (req, res) => {
  const sql = `
    SELECT 
      id,
      car_name,
      image_url,
      description,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM car_ext_gallery
    ORDER BY created_at DESC
  `;

  try {
    // logger.info('Fetching car ext gallery data');

    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} records from car_ext_gallery`);

    res.status(200).json({
      message: 'Car ext gallery data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car ext gallery data: ' + err.message);

    res.status(500).json({
      message: 'Failed to fetch car ext gallery data',
      success: false,
      error: err.message
    });
  }
});

// GET single car ext gallery item by ID
router.get('/car-ext-gallery/:id', async (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      id,
      car_name,
      image_url,
      description,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM car_ext_gallery 
    WHERE id = ?
  `;

  try {
    // logger.info(`Fetching car ext gallery item with ID: ${id}`);

    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car ext gallery item not found',
        success: false
      });
    }

    // logger.info('Successfully fetched car ext gallery item');
    res.status(200).json({
      message: 'Car ext gallery item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    // logger.error('Error fetching car ext gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car ext gallery item',
      success: false,
      error: err.message
    });
  }
});

// POST new car ext gallery item with image upload
router.post('/car-ext-gallery', upload.single('image'), async (req, res) => {
  const { car_name, description } = req.body;
  
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
  const sql = 'INSERT INTO car_ext_gallery (car_name, image_url, description) VALUES (?, ?, ?)';

  try {
    // logger.info('Adding new car to ext gallery');

    const [result] = await db.query(sql, [car_name, image_url, description]);

    // logger.info(`Successfully added car to ext gallery with ID: ${result.insertId}`);
    res.status(201).json({
      message: 'Car added to ext gallery successfully',
      success: true,
      data: {
        id: result.insertId,
        car_name,
        image_url,
        description,
        createdAt: new Date()
      }
    });
  } catch (err) {
    // logger.error('Error adding car to ext gallery: ' + err.message);
    res.status(500).json({
      message: 'Failed to add car to ext gallery',
      success: false,
      error: err.message
    });
  }
});

// PUT update car ext gallery item (with optional image update)
router.put('/car-ext-gallery/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { car_name, description } = req.body;
  
  if (!car_name || !description) {
    return res.status(400).json({
      message: 'Car name and description are required',
      success: false
    });
  }

  try {
    // logger.info(`Updating car ext gallery item with ID: ${id}`);

    // First, check if the item exists
    const [existing] = await db.query('SELECT * FROM car_ext_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car ext gallery item not found',
        success: false
      });
    }

    let image_url = existing[0].image_url;
    
    // If a new image was uploaded, use its path
    if (req.file) {
      image_url = req.file.path;
      // In a real application, you might want to delete the old image file here
    }

    const sql = 'UPDATE car_ext_gallery SET car_name = ?, image_url = ?, description = ?, updated_at = NOW() WHERE id = ?';
    const [result] = await db.query(sql, [car_name, image_url, description, id]);

    // logger.info('Successfully updated car ext gallery item');
    res.status(200).json({
      message: 'Car ext gallery item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        car_name,
        image_url,
        description
      }
    });
  } catch (err) {
    // logger.error('Error updating car ext gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to update car ext gallery item',
      success: false,
      error: err.message
    });
  }
});

// DELETE car ext gallery item
router.delete('/car-ext-gallery/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_ext_gallery WHERE id = ?';

  try {
    // logger.info(`Deleting car ext gallery item with ID: ${id}`);

    // First, check if the item exists and get the image path
    const [existing] = await db.query('SELECT * FROM car_ext_gallery WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car ext gallery item not found',
        success: false
      });
    }

    const [result] = await db.query(sql, [id]);

    // In a real application, you might want to delete the image file here
    // fs.unlinkSync(existing[0].image_url);

    // logger.info('Successfully deleted car ext gallery item');
    res.status(200).json({
      message: 'Car ext gallery item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    // logger.error('Error deleting car ext gallery item: ' + err.message);
    res.status(500).json({
      message: 'Failed to delete car ext gallery item',
      success: false,
      error: err.message
    });
  }
});

module.exports = router;