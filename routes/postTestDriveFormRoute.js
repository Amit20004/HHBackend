// routes/testDrive.js
const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Must export pool.promise()
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// POST: Book Test Drive
router.post(
  '/test-drive',
  asyncHandler(async (req, res) => {
    const {
      salutation,
      name,
      email,
      mobile,
      otp,
      model,
      state,
      city,
      dealer,
      comments,
    } = req.body;

    if (
      !salutation ||
      !name ||
      !mobile ||
      !otp ||
      !model ||
      !state ||
      !city ||
      !dealer    ) {
      return res.status(400).json({
        message: 'All required fields must be filled and terms accepted',
        success: false 
      });
    }

    const query = `
      INSERT INTO test_drive_bookings (
        salutation, name, email, mobile, otp, model, state, city, dealer, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await db.query(query, [
        salutation,
        name,
        email || '',
        mobile,
        otp,
        model,
        state,
        city,
        dealer,
        comments || '',
 
      ]);

      res.status(200).json({ 
        message: 'Test drive booked successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to book test drive',
        success: false,
        error: err.message
      });
    }
  })
);

// PUT: Update Test Drive Booking
router.put(
  '/test-drive/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      salutation,
      name,
      email,
      mobile,
      otp,
      model,
      state,
      city,
      dealer,
      comments,

    } = req.body;

    // Optional: validate required fields for update if needed

    const query = `
      UPDATE test_drive_bookings
      SET salutation = ?, name = ?, email = ?, mobile = ?, otp = ?, model = ?, state = ?, city = ?, dealer = ?, comments = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [
        salutation,
        name,
        email || '',
        mobile,
        otp,
        model,
        state,
        city,
        dealer,
        comments || '',
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Test drive booking not found',
          success: false
        });
      }

      res.status(200).json({
        message: 'Test drive booking updated successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to update test drive booking',
        success: false,
        error: err.message
      });
    }
  })
);

// GET: Fetch Test Drive Bookings
router.get(
  '/fetch-test-drive-bookings',
  asyncHandler(async (req, res) => {
    const sql = 'SELECT * FROM test_drive_bookings ORDER BY created_at DESC';

    try {
      const [results] = await db.query(sql);

      res.status(200).json({
        message: 'Test drive data fetched successfully',
        success: true,
        data: results,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch test drive data',
        success: false,
        error: err.message
      });
    }
  })
);

module.exports = router;
