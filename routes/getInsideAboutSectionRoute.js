const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/highlightaboutus/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// GET all about us sections
router.get('/inside-about-us', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM highlight_about_us_section';
  const [results] = await db.query(sql);
  res.status(200).json({
    message: 'About us section data fetched successfully',
    success: true,
    data: results
  });
}));

// POST a new about us section with image upload
router.post('/inside-about-us', upload.single('image'), asyncHandler(async (req, res) => {
  const { section_title, heading, description, car_name } = req.body;
  
  // Get the uploaded file path
  const image_url = req.file ? req.file.path : null;
  
  const sql = 'INSERT INTO highlight_about_us_section (section_title, heading, description, image_url, car_name) VALUES (?, ?, ?, ?, ?)';
  const [result] = await db.query(sql, [section_title, heading, description, image_url, car_name]);
  
  res.status(201).json({
    message: 'About us section created successfully',
    success: true,
    data: { 
      id: result.insertId, 
      section_title, 
      heading, 
      description, 
      image_url, 
      car_name 
    }
  });
}));

// PUT (update) an existing about us section with optional image upload
router.put('/inside-about-us/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { section_title, heading, description, car_name } = req.body;
  
  // If a new image was uploaded, use its path, otherwise keep the existing image
  let image_url = req.body.existing_image; // This will be sent from the frontend
  if (req.file) {
    image_url = req.file.path;
  }
  
  const sql = 'UPDATE highlight_about_us_section SET section_title = ?, heading = ?, description = ?, image_url = ?, car_name = ? WHERE id = ?';
  await db.query(sql, [section_title, heading, description, image_url, car_name, id]);
  
  res.status(200).json({
    message: 'About us section updated successfully',
    success: true,
    data: { 
      id: parseInt(id), 
      section_title, 
      heading, 
      description, 
      image_url, 
      car_name 
    }
  });
}));

// DELETE an about us section
router.delete('/inside-about-us/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM highlight_about_us_section WHERE id = ?';
  await db.query(sql, [id]);
  res.status(200).json({
    message: 'About us section deleted successfully',
    success: true
  });
}));

module.exports = router;