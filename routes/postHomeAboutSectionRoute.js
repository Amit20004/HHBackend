const express = require("express");
const router = express.Router();
const db = require("../db"); // mysql2/promise connection
const asyncHandler = require("../utils/asyncHandler");

// ---------------------- FETCH DATA ----------------------
router.get(
  "/home-about/:section",
  asyncHandler(async (req, res) => {
    const { section } = req.params;
    let query = "";
    let data = [];

    if (section === "intro") {
      query = `SELECT * FROM home_about1_intro ORDER BY id DESC`;
    } else if (section === "stats") {
      query = `SELECT * FROM home_about1_highlights ORDER BY id ASC`;
    } else if (section === "locations") {
      query = `SELECT * FROM locations ORDER BY id ASC`;
    } else {
      return res.status(400).json({ error: "Invalid section" });
    }

    const [rows] = await db.query(query);
    data = rows;

    res.json({ section, data });
  })
);

// ---------------------- ADD DATA ----------------------
router.post(
  "/home-about",
  asyncHandler(async (req, res) => {
    const { section, heading, content, title, value, description, name, type, latitude, longitude, address, phone, hours, sort_order } = req.body;

    let query = "";
    let params = [];

    if (section === "intro") {
      query = `INSERT INTO home_about1_intro (heading, content) VALUES (?, ?)`;
      params = [heading, content];
    } else if (section === "stats") {
      query = `INSERT INTO home_about1_highlights (title, value, description, sort_order) VALUES (?, ?, ?, ?)`;
      params = [title, value, description || null, sort_order || 0];
    } else if (section === "locations") {
      query = `
        INSERT INTO locations (name, type, latitude, longitude, address, phone, hours) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      params = [name, type, latitude, longitude, address, phone, hours];
    } else {
      return res.status(400).json({ error: "Invalid section" });
    }

    await db.query(query, params);
    res.json({ message: "✅ Section added successfully" });
  })
);

// ---------------------- UPDATE DATA ----------------------
router.put(
  "/put-home-about",
  asyncHandler(async (req, res) => {
    const { section, id, heading, content, title, value, description } = req.body;

    let query = "";
    let params = [];

    if (section === "intro") {
      query = `UPDATE home_about1_intro SET heading = ?, content = ? WHERE id = ?`;
      params = [heading, content, id];
    } else if (section === "stats") {
      query = `UPDATE home_about1_highlights SET title = ?, value = ?, description = ? WHERE id = ?`;
      params = [title, value, description || null, id];
    } else {
      return res.status(400).json({ error: "Invalid section" });
    }

    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No matching record found" });
    }

    res.json({ message: "✅ Section updated successfully" });
  })
);


module.exports = router;
