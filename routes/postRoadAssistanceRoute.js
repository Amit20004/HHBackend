const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');

// ============================================
// GET all roadside assistance requests
// ============================================
router.get(
  '/roadside-assistance',
  asyncHandler(async (req, res) => {
    try {
      const [results] = await db.query('SELECT * FROM roadside_requests ORDER BY id DESC');
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error('Error fetching roadside assistance requests:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  })
);

// ============================================
// GET single roadside assistance request by ID
// ============================================
router.get(
  '/roadside-assistance/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const [results] = await db.query('SELECT * FROM roadside_requests WHERE id = ?', [id]);

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      res.status(200).json({ success: true, data: results[0] });
    } catch (error) {
      console.error('Error fetching roadside assistance request:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  })
);

// ============================================
// POST - Create a new roadside assistance request
// ============================================
router.post(
  '/roadside-assistance',
  asyncHandler(async (req, res) => {
    const { name, email, mobile, model, serviceCenter, comments, agree } = req.body;

    // Validate required fields
    if (!name || !email || !mobile || !model || !serviceCenter) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled',
      });
    }

    const query = `
      INSERT INTO roadside_requests 
      (name, email, mobile, model, service_center, comments, agree) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.query(query, [
        name,
        email,
        mobile,
        model,
        serviceCenter,
        comments || null,
        agree ? 1 : 0,
      ]);

      console.log('✅ Request saved to DB with ID:', result.insertId);
      res.status(201).json({
        success: true,
        message: 'Request submitted successfully!',
        data: { id: result.insertId },
      });
    } catch (error) {
      console.error('Error creating roadside assistance request:', error);
      res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message,
      });
    }
  })
);

// ============================================
// PUT - Update roadside assistance request
// ============================================
router.put(
  '/roadside-assistance/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, mobile, model, serviceCenter, comments, agree } = req.body;

    // Check if record exists
    const [checkResults] = await db.query('SELECT * FROM roadside_requests WHERE id = ?', [id]);
    if (checkResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const query = `
      UPDATE roadside_requests 
      SET name = ?, email = ?, mobile = ?, model = ?, service_center = ?, comments = ?, agree = ?, updated_at = NOW()
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [
        name || checkResults[0].name,
        email || checkResults[0].email,
        mobile || checkResults[0].mobile,
        model || checkResults[0].model,
        serviceCenter || checkResults[0].service_center,
        comments || checkResults[0].comments,
        agree !== undefined ? (agree ? 1 : 0) : checkResults[0].agree,
        id,
      ]);

      res.status(200).json({
        success: true,
        message: 'Request updated successfully',
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error('Error updating roadside assistance request:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  })
);

// ============================================
// DELETE - Remove roadside assistance request
// ============================================
router.delete(
  '/roadside-assistance/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [checkResults] = await db.query('SELECT * FROM roadside_requests WHERE id = ?', [id]);
    if (checkResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    try {
      const [result] = await db.query('DELETE FROM roadside_requests WHERE id = ?', [id]);
      res.status(200).json({
        success: true,
        message: 'Request deleted successfully',
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error('Error deleting roadside assistance request:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  })
);

module.exports = router;
