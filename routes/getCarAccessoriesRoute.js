// routes/carAccessories.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // promise-based MySQL connection
const asyncHandler = require('../utils/asyncHandler');
// const logger = require('../utils/logger/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================= Multer Setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'accessories');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + '-' + file.originalname.replace(/\s+/g, '_')
    );
  }
});

const upload = multer({ storage });

// ================= Public Routes =================

// GET /api/car-accessories?model=Hyundai Creta&category=Exterior
router.get(
  '/car-accessories',
  asyncHandler(async (req, res) => {
    const { model, category } = req.query;

    try {
      let sql = `SELECT * FROM car_accessories WHERE 1=1`;
      const params = [];

      if (model && model !== 'All Models') {
        sql += ` AND model = ?`;
        params.push(model);
      }

      if (category && category !== 'All Categories') {
        sql += ` AND category = ?`;
        params.push(category);
      }

      sql += ` ORDER BY created_at DESC`;

      const [results] = await db.query(sql, params);

      // Append image URLs for frontend
      const formatted = results.map((row) => ({
        ...row,
        image_url: row.image
          ? `${req.protocol}://${req.get("host")}/uploads/accessories/${row.image}`
          : null,
      }));

      res.status(200).json({
        message: "Accessories fetched successfully",
        success: true,
        data: formatted, // send formatted array with image_url
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch accessories',
        error: err.message
      });
    }
  })
);



// GET /api/car-models
router.get(
  '/car-models',
  asyncHandler(async (req, res) => {
    try {
      const sql = `SELECT DISTINCT model FROM car_accessories ORDER BY model ASC`;
      const [results] = await db.query(sql);
      const models = (results || []).map(row => row.model);

      // logger.info(`Fetched ${models.length} car models`);
      res.status(200).json({
        success: true,
        message: 'Car models fetched successfully',
        data: models
      });
    } catch (err) {
      // logger.error('Error fetching car models: ' + err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch car models',
        error: err.message
      });
    }
  })
);

// GET /api/car-accessory-categories
router.get(
  '/car-accessory-categories',
  asyncHandler(async (req, res) => {
    try {
      const sql = `SELECT DISTINCT category FROM car_accessories ORDER BY category ASC`;
      const [results] = await db.query(sql);
      const categories = (results || []).map(row => row.category);

      // logger.info(`Fetched ${categories.length} categories`);
      res.status(200).json({
        success: true,
        message: 'Accessory categories fetched successfully',
        data: categories
      });
    } catch (err) {
      // logger.error('Error fetching accessory categories: ' + err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch accessory categories',
        error: err.message
      });
    }
  })
);

// ================= Admin Routes =================

// POST /api/admin/car-accessories
// POST /api/admin/car-accessories
router.post(
  '/admin/car-accessories',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    try {
      const { name, model, category, price, description, availability } = req.body;
      const image = req.file ? req.file.filename : null;

      const sql = `
        INSERT INTO car_accessories 
        (name, model, category, price, description, image, availability, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await db.query(sql, [name, model, category, price, description, image, availability]);

      res.status(201).json({
        success: true,
        message: 'Accessory added successfully'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to add accessory',
        error: err.message
      });
    }
  })
);


// PUT /api/admin/car-accessories/:id
router.put(
  '/admin/car-accessories/:id',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, model, category, price, description, availability } = req.body;

      let sql = `
        UPDATE car_accessories 
        SET name = ?, model = ?, category = ?, price = ?, description = ?, availability = ?
      `;
      const params = [name, model, category, price, description, availability];

      if (req.file) {
        sql += `, image = ?`;
        params.push(req.file.filename);
      }

      sql += ` WHERE id = ?`;
      params.push(id);

      const [result] = await db.query(sql, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Accessory not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Accessory updated successfully'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to update accessory',
        error: err.message
      });
    }
  })
);


// DELETE /api/admin/car-accessories/:id
router.delete(
  '/admin/car-accessories/:id',
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Get image filename before deleting
      const [rows] = await db.query('SELECT image FROM car_accessories WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Accessory not found'
        });
      }

      const image = rows[0].image;

      // Delete row
      const [result] = await db.query('DELETE FROM car_accessories WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Accessory not found'
        });
      }

      // Delete image file if exists
      if (image) {
        const filePath = path.join(__dirname, '..', 'uploads', 'accessories', image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // logger.info(`Accessory deleted: ID ${id}`);
      res.status(200).json({
        success: true,
        message: 'Accessory deleted successfully'
      });
    } catch (err) {
      // logger.error('Error deleting accessory: ' + err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete accessory',
        error: err.message
      });
    }
  })
);

module.exports = router;
