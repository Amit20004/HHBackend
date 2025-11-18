const express = require('express');
const router = express.Router();
const db = require('../db.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler.js');

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/car-safety/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'safety-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
    fileSize: 5 * 1024 * 1024
  }
});

// GET all car safety and security items
router.get('/car-safety-security', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_safety_features ORDER BY created_at DESC';

  try {
    const [results] = await db.query(sql);
    res.status(200).json({
      message: 'Car safety and security data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Failed to fetch car safety and security data',
      success: false,
      error: err.message
    });
  }
}));

// GET single car safety and security item by ID
router.get('/car-safety-security/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_safety_features WHERE id = ?';

  try {
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Car safety and security item not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Car safety and security item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Failed to fetch car safety and security item',
      success: false,
      error: err.message
    });
  }
}));

// POST new car safety and security item with image upload
router.post('/car-safety-security', upload.single('image'), asyncHandler(async (req, res) => {
  const { title, category, description, car_name } = req.body;
  
  if (!req.file) {
    return res.status(400).json({
      message: 'Image file is required',
      success: false
    });
  }

  if (!title || !category || !description || !car_name) {
    // Delete the uploaded file if validation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      message: 'All fields are required',
      success: false
    });
  }

  const image = req.file.path;
  const sql = 'INSERT INTO car_safety_features (title, image, description, car_name) VALUES ( ?, ?, ?, ?)';
  const values = [title, image, description, car_name];

  try {
    const [result] = await db.query(sql, values);

    res.status(201).json({
      message: 'Car safety and security item created successfully',
      success: true,
      data: {
        id: result.insertId,
        title,
        image,
        description,
        car_name,
        created_at: new Date()
      }
    });
  } catch (err) {
    // Delete the uploaded file if database operation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Failed to create car safety and security item',
      success: false,
      error: err.message
    });
  }
}));

// PUT update car safety and security item (with optional image update)
router.put('/car-safety-security/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, car_name } = req.body;
  
  if (!title ||  !description || !car_name) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      message: 'All fields are required',
      success: false
    });
  }

  try {
    const [existing] = await db.query('SELECT * FROM car_safety_features WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        message: 'Car safety and security item not found',
        success: false
      });
    }

    let image = existing[0].image;
    
    if (req.file) {
      // Delete the old image if it exists
      if (existing[0].image && fs.existsSync(existing[0].image)) {
        fs.unlinkSync(existing[0].image);
      }
      image = req.file.path;
    }

    const sql = 'UPDATE car_safety_features SET title = ?, image = ?, description = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
    const values = [title, image, description, car_name, id];
    
    const [result] = await db.query(sql, values);

    res.status(200).json({
      message: 'Car safety and security item updated successfully',
      success: true,
      data: {
        id: parseInt(id),
        title,
        
        image,
        description,
        car_name
      }
    });
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Failed to update car safety and security item',
      success: false,
      error: err.message
    });
  }
}));

// DELETE car safety and security item
router.delete('/car-safety-security/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM car_safety_features WHERE id = ?';

  try {
    const [existing] = await db.query('SELECT * FROM car_safety_features WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Car safety and security item not found',
        success: false
      });
    }

    // Delete the associated image file
    if (existing[0].image && fs.existsSync(existing[0].image)) {
      fs.unlinkSync(existing[0].image);
    }

    const [result] = await db.query(sql, [id]);

    res.status(200).json({
      message: 'Car safety and security item deleted successfully',
      success: true,
      data: {
        id: parseInt(id)
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      message: 'Failed to delete car safety and security item',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;