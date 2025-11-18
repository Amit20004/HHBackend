const express = require("express");
const router = express.Router();
const db = require("../db.js");
const asyncHandler = require("../utils/asyncHandler.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===============================
// Multer Config
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/specifications");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ===============================
// GET all specifications
// ===============================
router.get(
  "/car-specifications",
  asyncHandler(async (req, res) => {
    try {
      const sql = "SELECT * FROM car_specifications ORDER BY id DESC";
      const [results] = await db.query(sql);
      
      res.status(200).json({
        message: "Car specifications fetched successfully",
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        message: "Failed to fetch specifications",
        success: false,
        error: error.message
      });
    }
  })
);

// ===============================
// GET specifications by car_name
// ===============================
router.get(
  "/car-specifications/:carName",
  asyncHandler(async (req, res) => {
    try {
      const { carName } = req.params;

      if (!carName) {
        return res
          .status(400)
          .json({ message: "carName param is required", success: false });
      }

      const sql = "SELECT * FROM car_specifications WHERE car_name = ?";
      const [results] = await db.query(sql, [carName]);

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "No specifications found", success: false });
      }

      res.status(200).json({
        message: "Specifications fetched successfully",
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        message: "Failed to fetch specifications",
        success: false,
        error: error.message
      });
    }
  })
);

// ===============================
// POST new specification
// ===============================
router.post(
  "/car-specifications",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    try {
      const { title, category, car_name, description } = req.body;
      const imagePath = req.file
        ? `/uploads/specifications/${req.file.filename}`
        : null;

      if (!title || !car_name) {
        return res
          .status(400)
          .json({ message: "Title and car_name are required", success: false });
      }

      const sql = `
        INSERT INTO car_specifications (title, category, car_name, description, image, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      const [result] = await db.query(sql, [
        title,
        category || "",
        car_name,
        description || "",
        imagePath,
      ]);

      res.status(201).json({
        message: "Specification added successfully",
        success: true,
        data: { 
          id: result.insertId, 
          title, 
          category: category || "", 
          car_name, 
          description: description || "", 
          image: imagePath 
        },
      });
    } catch (error) {
      console.error("Database error:", error);
      
      // Delete uploaded file if there was an error
      if (req.file) {
        const filePath = path.join(__dirname, "../uploads/specifications", req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.status(500).json({
        message: "Failed to add specification",
        success: false,
        error: error.message
      });
    }
  })
);

// ===============================
// PUT update specification
// ===============================
router.put(
  "/car-specifications/:id",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, car_name, description } = req.body;
      const imagePath = req.file
        ? `/uploads/specifications/${req.file.filename}`
        : null;

      const [existing] = await db.query(
        "SELECT * FROM car_specifications WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res
          .status(404)
          .json({ message: "Specification not found", success: false });
      }

      // delete old image if a new one is uploaded
      if (imagePath && existing[0].image) {
        const oldFilePath = path.join(__dirname, "../", existing[0].image);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const sql = `
        UPDATE car_specifications
        SET title = ?, category = ?, car_name = ?, description = ?, 
            image = COALESCE(?, image), updated_at = NOW()
        WHERE id = ?
      `;
      await db.query(sql, [
        title,
        category || "",
        car_name,
        description || "",
        imagePath,
        id,
      ]);

      res.status(200).json({
        message: "Specification updated successfully",
        success: true,
        data: { 
          id, 
          title, 
          category: category || "", 
          car_name, 
          description: description || "", 
          image: imagePath || existing[0].image 
        },
      });
    } catch (error) {
      console.error("Database error:", error);
      
      // Delete uploaded file if there was an error
      if (req.file) {
        const filePath = path.join(__dirname, "../uploads/specifications", req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.status(500).json({
        message: "Failed to update specification",
        success: false,
        error: error.message
      });
    }
  })
);

// ===============================
// DELETE specification
// ===============================
router.delete(
  "/car-specifications/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await db.query(
        "SELECT * FROM car_specifications WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res
          .status(404)
          .json({ message: "Specification not found", success: false });
      }

      if (existing[0].image) {
        const fileToDelete = path.join(__dirname, "../", existing[0].image);
        if (fs.existsSync(fileToDelete)) {
          fs.unlinkSync(fileToDelete);
        }
      }

      await db.query("DELETE FROM car_specifications WHERE id = ?", [id]);

      res.status(200).json({
        message: "Specification deleted successfully",
        success: true,
        data: { id },
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        message: "Failed to delete specification",
        success: false,
        error: error.message
      });
    }
  })
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 5MB.',
        success: false
      });
    }
  }
  
  if (error) {
    return res.status(400).json({
      message: error.message,
      success: false
    });
  }
  
  next();
});

module.exports = router;