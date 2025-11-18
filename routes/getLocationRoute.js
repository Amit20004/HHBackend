const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');

// ===================== GET all locations =====================
router.get('/locations', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM location';
  const [results] = await db.query(sql);
  
  res.json({
    success: true,
    data: results
  });
}));

// ===================== GET single location =====================
router.get('/locations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM location WHERE id = ?';
  
  const [results] = await db.query(sql, [id]);
  
  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }
  
  res.json({
    success: true,
    data: results[0]
  });
}));

// ===================== POST (Add new location) =====================
router.post('/locations', asyncHandler(async (req, res) => {
  const { name, type, latitude, longitude, address, phone, hours } = req.body;
  
  const sql = `
    INSERT INTO location (name, type, latitude, longitude, address, phone, hours)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await db.query(sql, [name, type, latitude, longitude, address, phone, hours]);
  
  res.status(201).json({
    success: true,
    message: 'Location added successfully',
    data: { id: result.insertId }
  });
}));

// ===================== PUT (Update location) =====================
router.put('/locations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, latitude, longitude, address, phone, hours } = req.body;
  
  // Check if location exists
  const [[existing]] = await db.query('SELECT * FROM location WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }
  
  const sql = `
    UPDATE location 
    SET name=?, type=?, latitude=?, longitude=?, address=?, phone=?, hours=?
    WHERE id=?
  `;
  
  await db.query(sql, [name, type, latitude, longitude, address, phone, hours, id]);
  
  res.json({
    success: true,
    message: 'Location updated successfully'
  });
}));

// ===================== DELETE location =====================
router.delete('/locations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if location exists
  const [[existing]] = await db.query('SELECT * FROM locations WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }
  
  await db.query('DELETE FROM location WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Location deleted successfully'
  });
}));

module.exports = router;