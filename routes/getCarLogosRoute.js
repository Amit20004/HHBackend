const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../db'); // MySQL connection (promise-based)
// const logger = require('../utils/logger/logger'); // custom logger module

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// GET all car logos
router.get('/car-logos', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_logos';

  // logger.info('Fetching all car logos');

  const [results] = await db.query(sql);

  // logger.info(`Successfully fetched ${results.length} car logos`);

  res.status(200).json({
    message: 'Car logos fetched successfully',
    success: true,
    data: results
  });
}));

// GET single car logo by ID
router.get('/car-logos/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM car_logos WHERE id = ?';

  const [results] = await db.query(sql, [id]);

  if (results.length === 0) {
    return res.status(404).json({
      message: 'Car logo not found',
      success: false
    });
  }

  res.status(200).json({
    message: 'Car logo fetched successfully',
    success: true,
    data: results[0]
  });
}));

// POST - Create new car logo with image upload
router.post('/car-logos', upload.single('image'), asyncHandler(async (req, res) => {
  const { name, category } = req.body;

  if (!req.file) {
    return res.status(400).json({
      message: 'Image is required',
      success: false
    });
  }

  const imagePath = `uploads/${req.file.filename}`;
  const sql = 'INSERT INTO car_logos (name, category, image) VALUES (?, ?, ?)';

  const [result] = await db.query(sql, [name, category, imagePath]);

  // logger.info(`Car logo created with ID: ${result.insertId}`);

  res.status(201).json({
    message: 'Car logo created successfully',
    success: true,
    data: {
      id: result.insertId,
      name,
      category,
      image: imagePath
    }
  });
}));

// PUT - Update car logo (with optional image update)
router.put('/car-logos/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category } = req.body;

  // First, get the current logo to delete the old file if updating
  const [currentLogo] = await db.query('SELECT image FROM car_logos WHERE id = ?', [id]);

  if (currentLogo.length === 0) {
    return res.status(404).json({
      message: 'Car logo not found',
      success: false
    });
  }

  let imagePath = currentLogo[0].image;
  let updateFields = [];
  let updateValues = [];

  if (name) {
    updateFields.push('name = ?');
    updateValues.push(name);
  }

  if (category) {
    updateFields.push('category = ?');
    updateValues.push(category);
  }

  // If new image is uploaded
  if (req.file) {
    // Delete old image file
    if (currentLogo[0].image) {
      const oldImagePath = path.join('public', currentLogo[0].image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    imagePath = `uploads/${req.file.filename}`;
    updateFields.push('image = ?');
    updateValues.push(imagePath);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      message: 'No fields to update',
      success: false
    });
  }

  updateValues.push(id);
  const sql = `UPDATE car_logos SET ${updateFields.join(', ')} WHERE id = ?`;

  await db.query(sql, updateValues);

  // logger.info(`Car logo with ID: ${id} updated successfully`);

  res.status(200).json({
    message: 'Car logo updated successfully',
    success: true,
    data: {
      id: parseInt(id),
      name,
      category,
      image: imagePath
    }
  });
}));

// DELETE car logo
router.delete('/car-logos/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // First get the image path to delete the file
  const [logo] = await db.query('SELECT image FROM car_logos WHERE id = ?', [id]);

  if (logo.length === 0) {
    return res.status(404).json({
      message: 'Car logo not found',
      success: false
    });
  }

  // Delete the image file
  if (logo[0].image) {
    const filePath = path.join('public', logo[0].image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Delete from database
  await db.query('DELETE FROM car_logos WHERE id = ?', [id]);

  // logger.info(`Car logo with ID: ${id} deleted successfully`);

  res.status(200).json({
    message: 'Car logo deleted successfully',
    success: true
  });
}));

module.exports = router;