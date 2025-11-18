// server.js (refined content management routes)
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const db = require('../db.js'); // mysql2/promise

const router = express();

// ===================== Multer Config =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ===================== GET all services =====================
router.get('/fetch-service', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM all_services ORDER BY created_at DESC');
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching content:', err);
    res.status(500).json({ success: false, message: 'Error fetching content' });
  }
});

// ===================== GET single service =====================
router.get('/fetch-service/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [results] = await db.query('SELECT * FROM all_services WHERE slug = ?', [slug]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    res.json({ success: true, data: results[0] });
  } catch (err) {
    console.error('Error fetching content:', err);
    res.status(500).json({ success: false, message: 'Error fetching content' });
  }
});

// ===================== POST service =====================
router.post('/post-service',
  upload.fields([{ name: 'main_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { slug, main_heading, main_content, product_content } = req.body;

      const main_image = req.files['main_image'] ? req.files['main_image'][0].filename : null;
      const product_image = req.files['product_image'] ? req.files['product_image'][0].filename : null;

      const sql = `
        INSERT INTO all_services (slug, main_heading, main_content, main_image, product_image, product_content)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.query(sql, [slug, main_heading, main_content, main_image, product_image, product_content]);

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: { id: result.insertId }
      });
    } catch (err) {
      console.error('Error creating content:', err);
      res.status(500).json({ success: false, message: 'Error creating content' });
    }
  }
);

// ===================== PUT service =====================
router.put('/put-service/:id',
  upload.fields([{ name: 'main_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { slug, main_heading, main_content, product_content } = req.body;

      // Fetch current record
      const [[current]] = await db.query('SELECT * FROM all_services WHERE id = ?', [id]);
      if (!current) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }

      let main_image = current.main_image;
      let product_image = current.product_image;

      // Replace images if uploaded
      if (req.files['main_image']) {
        if (main_image) {
          fs.unlink(`uploads/${main_image}`, err => {
            if (err) console.error('Error deleting old main image:', err);
          });
        }
        main_image = req.files['main_image'][0].filename;
      }

      if (req.files['product_image']) {
        if (product_image) {
          fs.unlink(`uploads/${product_image}`, err => {
            if (err) console.error('Error deleting old product image:', err);
          });
        }
        product_image = req.files['product_image'][0].filename;
      }

      const updateQuery = `
        UPDATE all_services 
        SET slug=?, main_heading=?, main_content=?, main_image=?, product_image=?, product_content=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `;

      await db.query(updateQuery, [slug, main_heading, main_content, main_image, product_image, product_content, id]);

      res.json({ success: true, message: 'Content updated successfully' });
    } catch (err) {
      console.error('Error updating content:', err);
      res.status(500).json({ success: false, message: 'Error updating content' });
    }
  }
);

// ===================== DELETE service =====================
router.delete('/delete-service/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[content]] = await db.query('SELECT * FROM all_services WHERE id = ?', [id]);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Delete associated images
    if (content.main_image) {
      fs.unlink(`uploads/${content.main_image}`, err => {
        if (err) console.error('Error deleting main image:', err);
      });
    }
    if (content.product_image) {
      fs.unlink(`uploads/${content.product_image}`, err => {
        if (err) console.error('Error deleting product image:', err);
      });
    }

    await db.query('DELETE FROM all_services WHERE id = ?', [id]);

    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (err) {
    console.error('Error deleting content:', err);
    res.status(500).json({ success: false, message: 'Error deleting content' });
  }
});

module.exports = router;
