const express = require('express');
const router = express.Router();
const db = require('../db.js');
const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = "uploads/gallery";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET all galleries
router.get('/galleries', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, slug, title, image_array, created_at, updated_at 
     FROM gallery 
     ORDER BY created_at DESC`
  );

  // Parse image_array if it's a string
  const galleries = rows.map(gallery => {
    let images = gallery.image_array;
    try {
      if (typeof images === 'string') {
        images = JSON.parse(images);
      }
    } catch (err) {
      logger.error('Failed to parse image_array', err);
      images = [];
    }
    return {
      ...gallery,
      image_array: images
    };
  });

  res.status(200).json({
    success: true,
    data: galleries
  });
}));

// GET gallery by slug
router.get('/gallery/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const [rows] = await db.query(
    `SELECT id, slug, title, image_array, created_at, updated_at
     FROM gallery 
     WHERE slug = ? 
     LIMIT 1`,
    [slug]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  let images = rows[0].image_array;

  // If stored as JSON string, parse it
  try {
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
  } catch (err) {
    logger.error('Failed to parse image_array', err);
    images = [];
  }

  res.status(200).json({
    success: true,
    data: {
      id: rows[0].id,
      slug: rows[0].slug,
      title: rows[0].title,
      images,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at
    }
  });
}));

// POST create new gallery
router.post('/gallery', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { slug, title } = req.body;
  
  if (!slug || !title) {
    return res.status(400).json({
      success: false,
      message: 'Slug and title are required'
    });
  }

  // Process uploaded files
  const images = req.files ? req.files.map(file => `/uploads/gallery/${file.filename}`) : [];

  const [result] = await db.query(
    `INSERT INTO gallery (slug, title, image_array) 
     VALUES (?, ?, ?)`,
    [slug, title, JSON.stringify(images)]
  );

  res.status(201).json({
    success: true,
    message: 'Gallery created successfully',
    data: {
      id: result.insertId,
      slug,
      title,
      images
    }
  });
}));

// ✅ GET gallery by slug
router.get('/gallery/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const [rows] = await db.query(
    `SELECT id, slug, title, image_array, created_at, updated_at
     FROM gallery 
     WHERE slug = ? 
     LIMIT 1`,
    [slug]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  let images = rows[0].image_array;

  // Parse JSON image array if stored as string
  try {
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
  } catch (err) {
    logger.error('Failed to parse image_array', err);
    images = [];
  }

  res.status(200).json({
    success: true,
    data: {
      id: rows[0].id,
      slug: rows[0].slug,
      title: rows[0].title,
      images,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at
    }
  });
}));


// PUT update gallery
router.put('/gallery/:id', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug, title, existingImages } = req.body;
  
  if (!slug || !title) {
    return res.status(400).json({
      success: false,
      message: 'Slug and title are required'
    });
  }

  // Get existing images
  let currentImages = [];
  try {
    if (existingImages) {
      currentImages = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages);
    }
  } catch (err) {
    logger.error('Failed to parse existing images', err);
  }

  // Process new uploaded files
  const newImages = req.files ? req.files.map(file => `/uploads/gallery/${file.filename}`) : [];
  
  // Combine existing and new images
  const allImages = [...currentImages, ...newImages];

  const [result] = await db.query(
    `UPDATE gallery 
     SET slug = ?, title = ?, image_array = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [slug, title, JSON.stringify(allImages), id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Gallery updated successfully',
    data: {
      id,
      slug,
      title,
      images: allImages
    }
  });
}));

// DELETE gallery
router.delete('/gallery/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // First get the gallery to delete associated images
  const [rows] = await db.query(
    `SELECT image_array FROM gallery WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  // Delete associated images from filesystem
  try {
    let images = rows[0].image_array;
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
    
    images.forEach(imagePath => {
      const fullPath = path.join('public', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
  } catch (err) {
    logger.error('Error deleting gallery images', err);
  }

  // Delete from database
  const [result] = await db.query(
    `DELETE FROM gallery WHERE id = ?`,
    [id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Gallery deleted successfully'
  });
}));

// DELETE specific image from gallery
router.delete('/gallery/:id/image', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Image URL is required'
    });
  }

  // Get current gallery
  const [rows] = await db.query(
    `SELECT image_array FROM gallery WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  let images = rows[0].image_array;
  try {
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
  } catch (err) {
    logger.error('Failed to parse image_array', err);
    images = [];
  }

  // Remove the image from the array
  const updatedImages = images.filter(img => img !== imageUrl);

  // Delete the image file from filesystem
  try {
    const fullPath = path.join('public', imageUrl);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    logger.error('Error deleting image file', err);
  }

  // Update the gallery
  const [result] = await db.query(
    `UPDATE gallery 
     SET image_array = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [JSON.stringify(updatedImages), id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: 'Gallery not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: {
      images: updatedImages
    }
  });
}));

module.exports = router;