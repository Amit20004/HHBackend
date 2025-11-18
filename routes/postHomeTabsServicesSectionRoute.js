const express = require("express");
const router = express.Router();
const db = require("../db.js");
// const logger = require("../utils/logger/logger.js");
const asyncHandler = require("../utils/asyncHandler.js");
const multer = require("multer");
const path = require("path");
const fs =require('fs')

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'home-tabs');
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

// ---------------- POST: Add new service tab ----------------
router.post(
  "/home-tabs-service",
  upload.single("image"), // 👈 handles file upload
  asyncHandler(async (req, res) => {
    const { main_heading, main_content, tab_title, points } = req.body;

    if (!main_heading || !main_content || !tab_title || !points) {
      // logger.warn("Missing required car service fields");
      return res.status(400).json({
        message: "main_heading, main_content, tab_title and points are required",
        success: false,
      });
    }

    // Normalize points field
    let normalizedPoints;
    try {
      if (Array.isArray(points)) {
        normalizedPoints = points;
      } else if (typeof points === "string") {
        if (points.trim().startsWith("[")) {
          normalizedPoints = JSON.parse(points);
        } else {
          normalizedPoints = points
            .split(/\r?\n|,/)
            .map((p) => p.trim())
            .filter(Boolean);
        }
      } else {
        throw new Error("Invalid points format");
      }
    } catch (err) {
      // logger.error("Error parsing points: " + err.message);
      return res.status(400).json({
        message: "Points must be a JSON array or newline/comma-separated string",
        success: false,
      });
    }

    // Save image path
    const image_url = req.file ? `/uploads/home-tabs/${req.file.filename}` : null;

    const query = `
      INSERT INTO Home_Tabs_Services_Section
      (main_heading, main_content, tab_title, points, image_url)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(query, [
      main_heading,
      main_content,
      tab_title,
      JSON.stringify(normalizedPoints),
      image_url,
    ]);

    // logger.info(`New car service tab added: ${tab_title}`);
    res.status(200).json({
      message: "Car service added successfully",
      success: true,
    });
  })
);

// ---------------- GET: Fetch all service tabs ----------------
router.get(
  "/fetch-home-car-service",
  asyncHandler(async (req, res) => {
    const sql = `
      SELECT id, main_heading, main_content, tab_title, points, image_url 
      FROM Home_Tabs_Services_Section
      ORDER BY id DESC
    `;

    const [rows] = await db.query(sql);

    const parsedRows = rows.map((row) => ({
      ...row,
      points: (() => {
        try {
          return JSON.parse(row.points);
        } catch {
          return row.points;
        }
      })(),
    }));

    // logger.info(`Fetched ${parsedRows.length} car service tabs`);
    res.status(200).json({
      message: "Car service tabs fetched successfully",
      success: true,
      data: parsedRows,
    });
  })
);

// ---------------- PUT: Update service tab ----------------
router.put(
  "/home-tabs-service/:id",
  upload.single("image"), // 👈 handle new image
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { main_heading, main_content, tab_title, points } = req.body;

    let normalizedPoints;
    try {
      if (Array.isArray(points)) {
        normalizedPoints = points;
      } else if (typeof points === "string") {
        if (points.trim().startsWith("[")) {
          normalizedPoints = JSON.parse(points);
        } else {
          normalizedPoints = points
            .split(/\r?\n|,/)
            .map((p) => p.trim())
            .filter(Boolean);
        }
      } else {
        throw new Error("Invalid points format");
      }
    } catch (err) {
      return res.status(400).json({
        message: "Points must be a JSON array or newline/comma-separated string",
        success: false,
      });
    }

    let sql = `
      UPDATE Home_Tabs_Services_Section
      SET main_heading = ?, main_content = ?, tab_title = ?, points = ?
    `;
    const params = [
      main_heading,
      main_content,
      tab_title,
      JSON.stringify(normalizedPoints),
    ];

    if (req.file) {
      sql += `, image_url = ?`;
      params.push(`/uploads/home-tabs/${req.file.filename}`);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service tab not found", success: false });
    }

    res.json({ message: "Service tab updated successfully", success: true });
  })
);

// ---------------- DELETE ----------------
router.delete(
  "/home-tabs-service/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM Home_Tabs_Services_Section WHERE id = ?";
    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service tab not found", success: false });
    }

    res.json({ message: "Service tab deleted successfully", success: true });
  })
);

module.exports = router;
