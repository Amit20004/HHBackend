// routes/testimonials.js
const express = require("express");
const router = express.Router();
const db = require("../db.js"); // mysql2 pool.promise()
const asyncHandler = require("../utils/asyncHandler.js");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/testimonials/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'testimonials-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});


// GET: Fetch all testimonials
router.get(
  "/testimonials",
  asyncHandler(async (req, res) => {
    const sql = "SELECT * FROM testimonials ORDER BY created_at DESC";
    const [rows] = await db.query(sql);

    res.status(200).json({
      message: "Testimonials fetched successfully",
      success: true,
      data: rows,
    });
  })
);

// POST: Add a new testimonial
router.post(
  "/testimonials",
  upload.single("person_image"),
  asyncHandler(async (req, res) => {
    const { person_name, message, ratings } = req.body;
    const person_image = req.file ? `uploads/testimonials/${req.file.filename}` : null;

    if (!person_name || !message || !ratings) {
      return res.status(400).json({
        message: "Name, message, and ratings are required",
        success: false,
      });
    }

    const sql =
      "INSERT INTO testimonials (person_name, message, person_image, ratings, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())";
    const [result] = await db.query(sql, [
      person_name,
      message,
      person_image,
      ratings,
    ]);

    res.status(201).json({
      message: "Testimonial added successfully",
      success: true,
      data: {
        id: result.insertId,
        person_name,
        message,
        ratings,
        person_image,
      },
    });
  })
);

// PUT: Update an existing testimonial
router.put(
  "/testimonials/:id",
  upload.single("person_image"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { person_name, message, ratings } = req.body;
    const person_image = req.file ? `uploads/testimonials/${req.file.filename}` : null;

    let sql, params;
    if (person_image) {
      sql =
        "UPDATE testimonials SET person_name = ?, message = ?, ratings = ?, person_image = ?, updated_at = NOW() WHERE id = ?";
      params = [person_name, message, ratings, person_image, id];
    } else {
      sql =
        "UPDATE testimonials SET person_name = ?, message = ?, ratings = ?, updated_at = NOW() WHERE id = ?";
      params = [person_name, message, ratings, id];
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Testimonial not found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Testimonial updated successfully",
      success: true,
    });
  })
);


// DELETE: Remove a testimonial
router.delete(
  "/testimonials/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM testimonials WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Testimonial not found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Testimonial deleted successfully",
      success: true,
    });
  })
);

module.exports = router;
