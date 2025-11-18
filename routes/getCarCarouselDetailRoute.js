const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Promise-based db connection
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

router.get('/car-carousel', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM car_carousel';

  // logger.info('Fetching all car carousel data');

  try {
    const [results] = await db.query(sql);

    // logger.info(`Successfully fetched ${results.length} car carousel records`);
    res.status(200).json({
      message: 'Car carousel data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    // logger.error('Error fetching car carousel data: ' + err.message);
    res.status(500).json({
      message: 'Failed to fetch car carousel data',
      success: false,
      error: err.message
    });
  }
}));

module.exports = router;
