const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Should export pool.promise()
const asyncHandler = require('../utils/asyncHandler.js');


// 🟢 POST: Add a new FAQ
router.post(
  '/faq',
  asyncHandler(async (req, res) => {
    const { category, question, answer } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({
        message: 'All fields (category, question, answer) are required',
        success: false,
      });
    }

    const query = `
      INSERT INTO faq (category, question, answer)
      VALUES (?, ?, ?)
    `;

    try {
      await db.query(query, [category, question, answer]);
      res.status(200).json({
        message: 'FAQ added successfully',
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to add FAQ',
        success: false,
        error: err.message,
      });
    }
  })
);


// 🟡 PUT: Update an existing FAQ
router.put(
  '/faq/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { category, question, answer } = req.body;

    const query = `
      UPDATE faq
      SET category = ?, question = ?, answer = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [category, question, answer, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'FAQ not found',
          success: false,
        });
      }

      res.status(200).json({
        message: 'FAQ updated successfully',
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to update FAQ',
        success: false,
        error: err.message,
      });
    }
  })
);


// 🔵 GET: Fetch all FAQs
router.get(
  '/faq',
  asyncHandler(async (req, res) => {
    const sql = 'SELECT * FROM faq ORDER BY created_at DESC';

    try {
      const [results] = await db.query(sql);
      res.status(200).json({
        message: 'FAQs fetched successfully',
        success: true,
        data: results,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch FAQs',
        success: false,
        error: err.message,
      });
    }
  })
);


// 🟣 GET: Fetch single FAQ by ID
router.get(
  '/faq/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM faq WHERE id = ?';

    try {
      const [results] = await db.query(sql, [id]);

      if (results.length === 0) {
        return res.status(404).json({
          message: 'FAQ not found',
          success: false,
        });
      }

      res.status(200).json({
        message: 'FAQ fetched successfully',
        success: true,
        data: results[0],
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch FAQ',
        success: false,
        error: err.message,
      });
    }
  })
);

// 🟢 GET: Fetch all unique FAQ categories
router.get(
  '/faq-categories',
  asyncHandler(async (req, res) => {
    const sql = 'SELECT DISTINCT category FROM faq ORDER BY category ASC';

    try {
      const [results] = await db.query(sql);
      const categories = results.map((row) => row.category);
      res.status(200).json({
        message: 'FAQ categories fetched successfully',
        success: true,
        data: categories,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to fetch FAQ categories',
        success: false,
        error: err.message,
      });
    }
  })
);


// 🔴 DELETE: Remove FAQ by ID
router.delete(
  '/faq/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM faq WHERE id = ?';

    try {
      const [result] = await db.query(sql, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'FAQ not found',
          success: false,
        });
      }

      res.status(200).json({
        message: 'FAQ deleted successfully',
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to delete FAQ',
        success: false,
        error: err.message,
      });
    }
  })
);

module.exports = router;
