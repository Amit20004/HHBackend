// routes/insuranceEnquiries.js
const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');

// POST: Submit a new insurance enquiry
router.post(
  '/insurance-enquiries',
  asyncHandler(async (req, res) => {
    const {
      fullName,
      mobile,
      email,
      vehicleRegNo,
      currentInsurance,
      termsAccepted,
      notRobot
    } = req.body;

    // Validation
    if (!fullName || !mobile || !email || !vehicleRegNo || !currentInsurance) {
      return res.status(400).json({
        message: 'All fields are required',
        success: false
      });
    }

    if (!termsAccepted || !notRobot) {
      return res.status(400).json({
        message: 'You must accept terms and verify you are not a robot',
        success: false
      });
    }

    const query = `
      INSERT INTO insurance_enquiries
      (full_name, mobile, email, vehicle_reg_no, current_insurance, terms_accepted, not_robot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await db.query(query, [fullName, mobile, email, vehicleRegNo, currentInsurance, termsAccepted, notRobot]);
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

// GET: Fetch all insurance enquiries
router.get(
  '/insurance-enquiries',
  asyncHandler(async (req, res) => {
    const query = `
      SELECT * FROM insurance_enquiries
      ORDER BY created_at DESC
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

// PUT: Update an enquiry status by ID
router.put(
  '/insurance-enquiries/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const query = `
      UPDATE insurance_enquiries
      SET status = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [status, id]);
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
  '/insurance-enquiries/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM insurance_enquiries WHERE id = ?';

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