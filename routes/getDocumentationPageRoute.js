const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Promise-based pool
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// GET all documentation items
router.get('/documentation', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM documentation_page ORDER BY id ASC';

  // logger.info('Fetching documentation sections data');

  try {
    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} documentation sections`);
    res.status(200).json({
      message: 'Documentation sections fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching documentation sections: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch documentation sections data',
      success: false,
      error: err.message
    });
  }
}));

// GET single documentation item
router.get('/documentation/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM documentation_page WHERE id = ?';

  try {
    const [results] = await db.query(sql, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Documentation item not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Documentation item fetched successfully',
      success: true,
      data: results[0]
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch documentation item',
      success: false,
      error: err.message
    });
  }
}));

// POST create new documentation item
router.post('/documentation', asyncHandler(async (req, res) => {
  const { heading,  item, page_heading, page_paragraph } = req.body;
  
  const sql = `
    INSERT INTO documentation_page (heading, item, page_heading, page_paragraph)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(sql, [heading, item,  page_heading, page_paragraph]);

    res.status(201).json({
      message: 'Documentation item created successfully',
      success: true,
      data: { id: result.insertId }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create documentation item',
      success: false,
      error: err.message
    });
  }
}));

// PUT update documentation item
router.put('/documentation/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { heading,  item,  page_heading, page_paragraph } = req.body;
  
  const sql = `
    UPDATE documentation_page 
    SET heading = ?, item = ?, page_heading = ?, page_paragraph = ?, updated_at = NOW()
    WHERE id = ?
  `;

  try {
    const [result] = await db.query(sql, [heading, item, page_heading, page_paragraph, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Documentation item not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Documentation item updated successfully',
      success: true
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update documentation item',
      success: false,
      error: err.message
    });
  }
}));

// DELETE documentation item
router.delete('/documentation/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM documentation_page WHERE id = ?';

  try {
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Documentation item not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Documentation item deleted successfully',
      success: true
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete documentation item',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;