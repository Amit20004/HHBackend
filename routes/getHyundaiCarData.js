const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const db = require("../db"); // MySQL connection (promise-based)
// const logger = require("../utils/logger/logger");
const multer = require("multer");
const path = require("path");

// ================= Multer Setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// =================================================
// ✅ GET all car data
router.get(
  "/car-data",
  asyncHandler(async (req, res) => {
    const sql = "SELECT * FROM hyundai_car_data";
    // logger.info("Fetching all car data");

    const [results] = await db.query(sql);
    // logger.info(`Successfully fetched ${results.length} car records`);

    res.status(200).json({
      message: "Car data fetched successfully",
      success: true,
      data: results,
    });
  })
);

// ✅ GET single car by ID
router.get(
  "/car-data/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM hyundai_car_data WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Car not found", success: false });
    }

    res.status(200).json({ success: true, data: rows[0] });
  })
);

// ✅ POST (create new car)
router.post(
  "/car-data",
  upload.single("feature_image"), // Multer handles image upload
  asyncHandler(async (req, res) => {
    const {
      name,
      body_style,
      transmission,
      fuel,
      manufacturing_year,
      mileage,
      engine_cc,
      seating,
      start_price,
      end_price,
      status,
    } = req.body;

    const feature_image = req.file ? `uploads/${req.file.filename}` : null;

    const sql = `
      INSERT INTO hyundai_car_data 
      (name, body_style, transmission, fuel, manufacturing_year, mileage, engine_cc, seating, start_price, end_price, feature_image, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      name,
      body_style,
      transmission,
      fuel,
      manufacturing_year,
      mileage,
      engine_cc,
      seating,
      start_price,
      end_price,
      feature_image,
      status || "Enabled",
    ];

    const [result] = await db.query(sql, values);

    res.status(201).json({
      message: "Car added successfully",
      success: true,
      id: result.insertId,
    });
  })
);

// ✅ PUT (update existing car)
router.put(
  "/car-data/:id",
  upload.single("feature_image"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      body_style,
      transmission,
      fuel,
      manufacturing_year,
      mileage,
      engine_cc,
      seating,
      start_price,
      end_price,
      status,
    } = req.body;

    const feature_image = req.file ? `uploads/${req.file.filename}` : null;

    // If new image uploaded, update it, else keep old
    let sql = `
      UPDATE hyundai_car_data SET 
      name=?, body_style=?, transmission=?, fuel=?, manufacturing_year=?, mileage=?, engine_cc=?, seating=?, start_price=?, end_price=?, status=?
    `;
    const values = [
      name,
      body_style,
      transmission,
      fuel,
      manufacturing_year,
      mileage,
      engine_cc,
      seating,
      start_price,
      end_price,
      status,
    ];

    if (feature_image) {
      sql += `, feature_image=? `;
      values.push(feature_image);
    }

    sql += ` WHERE id=?`;
    values.push(id);

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Car not found", success: false });
    }

    res.json({ message: "Car updated successfully", success: true });
  })
);

// ✅ DELETE car
router.delete(
  "/car-data/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM hyundai_car_data WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Car not found", success: false });
    }

    res.json({ message: "Car deleted successfully", success: true });
  })
);

module.exports = router;
