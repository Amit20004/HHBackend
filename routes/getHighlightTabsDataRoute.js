const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== Multer Config ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'highlight-tabs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      file.fieldname + '-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Allow any image type based on MIME type
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});


// ========== Routes ==========

// GET all car highlight tabs
router.get(
  '/highlight-tabs',
  asyncHandler(async (req, res) => {
    const sql = 'SELECT * FROM car_highlight_tabs ORDER BY created_at DESC';
    try {
      const [results] = await db.query(sql);
      res.status(200).json({
        message: 'Car highlight tabs data fetched successfully',
        success: true,
        data: results,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch car highlight tabs data',
        success: false,
        error: err.message,
      });
    }
  })
);

// GET single car highlight tab by ID
router.get(
  '/highlight-tabs/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM car_highlight_tabs WHERE id = ?';
    try {
      const [results] = await db.query(sql, [id]);

      if (results.length === 0) {
        return res.status(404).json({
          message: 'Car highlight tab not found',
          success: false,
        });
      }

      res.status(200).json({
        message: 'Car highlight tab fetched successfully',
        success: true,
        data: results[0],
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch car highlight tab',
        success: false,
        error: err.message,
      });
    }
  })
);

// POST new car highlight tab (with image)
router.post(
  '/highlight-tabs',
  upload.single('image'), // Changed from 'image_url' to 'image'
  asyncHandler(async (req, res) => {
    const { label, caption, car_name } = req.body;
    const image_url = req.file ? `uploads/highlight-tabs/${req.file.filename}` : null;

    if (!label || !caption) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'label and caption are required',
        success: false,
      });
    }

    const sql =
      'INSERT INTO car_highlight_tabs (label, caption, image_url, car_name) VALUES (?, ?, ?, ?)';
    const values = [label, caption, image_url, car_name];

    try {
      const [result] = await db.query(sql, values);
      res.status(201).json({
        message: 'Car highlight tab created successfully',
        success: true,
        data: {
          id: result.insertId,
          label,
          caption,
          image_url,
          car_name,
          created_at: new Date(),
        },
      });
    } catch (err) {
      // Delete uploaded file if database operation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: 'Failed to create car highlight tab',
        success: false,
        error: err.message,
      });
    }
  })
);

// PUT update car highlight tab (with image)
router.put(
  '/highlight-tabs/:id',
  upload.single('image'), // Changed from 'image_url' to 'image'
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { label, caption, car_name } = req.body;
    const newimage_url = req.file ? `uploads/highlight-tabs/${req.file.filename}` : null;

    if (!label || !caption) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'label and caption are required',
        success: false,
      });
    }

    try {
      const [existing] = await db.query(
        'SELECT * FROM car_highlight_tabs WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        // Delete uploaded file if record not found
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({
          message: 'Car highlight tab not found',
          success: false,
        });
      }

      let image_url = existing[0].image_url;
      if (newimage_url) {
        // delete old image_url if exists
        if (image_url && fs.existsSync(path.join(__dirname, '..', image_url))) {
          fs.unlinkSync(path.join(__dirname, '..', image_url));
        }
        image_url = newimage_url;
      }

      const sql =
        'UPDATE car_highlight_tabs SET label = ?, caption = ?, image_url = ?, car_name = ?, updated_at = NOW() WHERE id = ?';
      const values = [label, caption, image_url, car_name, id];

      await db.query(sql, values);

      res.status(200).json({
        message: 'Car highlight tab updated successfully',
        success: true,
        data: {
          id: parseInt(id),
          label,
          caption,
          image_url,
          car_name
        },
      });
    } catch (err) {
      // Delete uploaded file if database operation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: 'Failed to update car highlight tab',
        success: false,
        error: err.message,
      });
    }
  })
);

// DELETE car highlight tab
router.delete(
  '/highlight-tabs/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const [existing] = await db.query(
        'SELECT * FROM car_highlight_tabs WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          message: 'Car highlight tab not found',
          success: false,
        });
      }

      // delete image_url if exists
      if (existing[0].image_url && fs.existsSync(path.join(__dirname, '..', existing[0].image_url))) {
        fs.unlinkSync(path.join(__dirname, '..', existing[0].image_url));
      }

      await db.query('DELETE FROM car_highlight_tabs WHERE id = ?', [id]);

      res.status(200).json({
        message: 'Car highlight tab deleted successfully',
        success: true,
        data: { id: parseInt(id) },
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to delete car highlight tab',
        success: false,
        error: err.message,
      });
    }
  })
);

module.exports = router;