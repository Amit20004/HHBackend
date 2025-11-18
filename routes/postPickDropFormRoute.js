const express = require('express');
const router = express.Router();
const db = require('../db.js');
// const logger = require('../utils/logger/logger.js');
const asyncHandler = require('../utils/asyncHandler.js');

// GET all pick & drop service bookings with optional filtering
router.get(
  '/pick-drop-service',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM pick_drop_services 
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total FROM pick_drop_services 
      WHERE 1=1
    `;
    let queryParams = [];
    let countParams = [];
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      queryParams.push(status);
      countParams.push(status);
    }
    
    // Add search filter if provided
    if (search) {
      const searchCondition = `
        AND (name LIKE ? OR email LIKE ? OR mobile LIKE ? OR car_model LIKE ? OR car_number LIKE ?)
      `;
      const searchParam = `%${search}%`;
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    // Add sorting and pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), offset);
    
    try {
      const [bookings] = await db.query(query, queryParams);
      const [countResult] = await db.query(countQuery, countParams);
      const total = countResult[0].total;
      
      res.status(200).json({
        data: bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching pick & drop services:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
);

// GET single pick & drop service booking by ID
router.get(
  '/pick-drop-service/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const query = 'SELECT * FROM pick_drop_services WHERE id = ?';
    
    try {
      const [results] = await db.query(query, [id]);
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      res.status(200).json(results[0]);
    } catch (error) {
      console.error('Error fetching pick & drop service:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
);

// POST - Create new pick & drop service booking
router.post(
  '/pick-drop-service',
  asyncHandler(async (req, res) => {
   const {
  name,
  mobile,
  email,
  serviceType,
  carModel,
  carNumber,
  mileage,
  serviceDate,
  serviceTime,
  description,
  serviceCenter,
  pickUp,
  termsAccepted,
} = req.body;

const service_type = serviceType;
const car_model = carModel;
const car_number = carNumber;
const service_date = serviceDate;
const service_time = serviceTime;
const service_center = serviceCenter;
const pick_up = pickUp;
const terms_accepted = termsAccepted;


    // Validate required fields
    if (
      !name ||
      !mobile ||
      !email ||
      !service_type ||
      !car_model ||
      !car_number ||
      !mileage ||
      !service_date ||
      !service_time ||
      !service_center ||
      (pick_up !== 'Yes' && pick_up !== 'No') ||
      terms_accepted !== true
    ) {
      return res.status(400).json({
        message: 'All required fields must be filled and terms accepted',
      });
    }

    const query = `
      INSERT INTO pick_drop_services (
        name, mobile, email, service_type, car_model,
        car_number, mileage, service_date, service_time,
        description, service_center, pick_up, terms_accepted, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.query(query, [
        name,
        mobile,
        email,
        service_type,
        car_model,
        car_number,
        mileage,
        service_date,
        service_time,
        description || '',
        service_center,
        pick_up,
        terms_accepted ? 1 : 0,
        'pending' // Default status
      ]);

      // logger.info(`New Pick & Drop Service booking from ${name}`);
      res.status(201).json({ 
        message: 'Pick & Drop Service booked successfully',
        id: result.insertId 
      });
    } catch (error) {
      console.error('Error creating pick & drop service:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
);

// PUT - Update pick & drop service booking
router.put(
  '/pick-drop-service/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      mobile,
      email,
      service_type,
      car_model,
      car_number,
      mileage,
      service_date,
      service_time,
      description,
      service_center,
      pick_up,
      terms_accepted,
      status
    } = req.body;

    // Check if booking exists
    const checkQuery = 'SELECT * FROM pick_drop_services WHERE id = ?';
    const [checkResults] = await db.query(checkQuery, [id]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const query = `
      UPDATE pick_drop_services 
      SET name = ?, mobile = ?, email = ?, service_type = ?, car_model = ?,
          car_number = ?, mileage = ?, service_date = ?, service_time = ?,
          description = ?, service_center = ?, pick_up = ?, terms_accepted = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `;

    try {
      await db.query(query, [
        name || checkResults[0].name,
        mobile || checkResults[0].mobile,
        email || checkResults[0].email,
        service_type || checkResults[0].service_type,
        car_model || checkResults[0].car_model,
        car_number || checkResults[0].car_number,
        mileage || checkResults[0].mileage,
        service_date || checkResults[0].service_date,
        service_time || checkResults[0].service_time,
        description || checkResults[0].description || '',
        service_center || checkResults[0].service_center,
        pick_up || checkResults[0].pick_up,
        terms_accepted !== undefined ? (terms_accepted ? 1 : 0) : checkResults[0].terms_accepted,
        status || checkResults[0].status,
        id
      ]);

      res.status(200).json({ message: 'Booking updated successfully' });
    } catch (error) {
      console.error('Error updating pick & drop service:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
);

// DELETE - Remove pick & drop service booking
router.delete(
  '/pick-drop-service/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if booking exists
    const checkQuery = 'SELECT * FROM pick_drop_services WHERE id = ?';
    const [checkResults] = await db.query(checkQuery, [id]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const query = 'DELETE FROM pick_drop_services WHERE id = ?';
    
    try {
      await db.query(query, [id]);
      res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
      console.error('Error deleting pick & drop service:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  })
);

module.exports = router;