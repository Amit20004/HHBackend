// routes/contact.js
const express = require('express');
const router = express.Router();
const db = require('../db.js'); // should be pool.promise()
const asyncHandler = require('../utils/asyncHandler.js');

// POST: Submit contact form
router.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required', success: false });
    }

    const query = `INSERT INTO contact_us (name, email, message) VALUES (?, ?, ?)`;

    try {
      await db.query(query, [name, email, message]);
      res.status(200).json({ message: 'Message sent successfully', success: true });
    } catch (err) {
      res.status(500).json({ message: 'Failed to send message', success: false, error: err.message });
    }
  })
);

// GET: Fetch all contact form submissions
router.get(
  '/fetch-contact-messages',
  asyncHandler(async (req, res) => {
    const sql = 'SELECT * FROM contact_us ORDER BY created_at DESC';
    try {
      const [results] = await db.query(sql);
      res.status(200).json({ message: 'Contact messages fetched successfully', success: true, data: results });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch contact messages', success: false, error: err.message });
    }
  })
);

// PUT: Update a contact message by ID
router.put(
  '/contact/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required', success: false });
    }

    const query = `UPDATE contact_us SET name = ?, email = ?, message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    try {
      const [result] = await db.query(query, [name, email, message, id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Message not found', success: false });
      }
      res.status(200).json({ message: 'Message updated successfully', success: true });
    } catch (err) {
      res.status(500).json({ message: 'Failed to update message', success: false, error: err.message });
    }
  })
);

// DELETE: Delete a contact message by ID
router.delete(
  '/contact/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM contact_us WHERE id = ?`;

    try {
      const [result] = await db.query(query, [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Message not found', success: false });
      }
      res.status(200).json({ message: 'Message deleted successfully', success: true });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete message', success: false, error: err.message });
    }
  })
);

module.exports = router;
