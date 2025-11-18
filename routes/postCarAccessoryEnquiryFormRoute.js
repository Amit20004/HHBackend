// routes/carAccessoryEnquiries.js
const express = require('express');
const router = express.Router();
const db = require('../db.js'); // should be pool.promise()
const asyncHandler = require('../utils/asyncHandler.js');

// POST: Submit a new car accessory enquiry
router.post(
  '/enquiries',
  asyncHandler(async (req, res) => {
    const {
      productId,
      customerName,
      email,
      phone,
      address,
      city,
      pincode,
      message,
      status = 'pending' // Default status
    } = req.body;

    // Validation
    if (!customerName || !email || !phone || !city) {
      return res.status(400).json({
        message: 'Customer name, email, phone, and city are required',
        success: false
      });
    }

    const query = `
      INSERT INTO car_accessory_enquiries
      (product_id, customer_name, email, phone, address, city, pincode, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await db.query(query, [productId, customerName, email, phone, address, city, pincode, message, status]);
      res.status(200).json({
        message: 'Enquiry submitted successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to submit enquiry',
        success: false,
        error: err.message
      });
    }
  })
);

// GET: Fetch all enquiries
router.get(
  '/enquiries',
  asyncHandler(async (req, res) => {
    const query = `
      SELECT e.*, p.name AS product_name, p.model AS product_model
      FROM car_accessory_enquiries e
      LEFT JOIN car_accessories p ON e.product_id = p.id
      ORDER BY e.created_at DESC
    `;

    try {
      const [results] = await db.query(query);
      res.status(200).json({
        message: 'Enquiries fetched successfully',
        success: true,
        data: results
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch enquiries',
        success: false,
        error: err.message
      });
    }
  })
);

// PUT: Update an enquiry by ID
router.put(
  '/enquiries/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      productId,
      customerName,
      email,
      phone,
      address,
      city,
      pincode,
      message,
      status
    } = req.body;

    const query = `
      UPDATE car_accessory_enquiries
      SET product_id = ?, customer_name = ?, email = ?, phone = ?, address = ?, city = ?, pincode = ?, message = ?, status = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [productId, customerName, email, phone, address, city, pincode, message, status, id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Enquiry not found', success: false });
      }
      res.status(200).json({
        message: 'Enquiry updated successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to update enquiry',
        success: false,
        error: err.message
      });
    }
  })
);

// DELETE: Delete an enquiry by ID
router.delete(
  '/enquiries/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM car_accessory_enquiries WHERE id = ?';

    try {
      const [result] = await db.query(query, [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Enquiry not found', success: false });
      }
      res.status(200).json({
        message: 'Enquiry deleted successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to delete enquiry',
        success: false,
        error: err.message
      });
    }
  })
);

module.exports = router;