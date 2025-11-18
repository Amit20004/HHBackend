// routes/bookService.js
const express = require('express');
const router = express.Router();
const db = require('../db.js'); // Must be mysql2 pool.promise()
const asyncHandler = require('../utils/asyncHandler.js');

// POST /book-service
router.post(
  '/book-service',
  asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      carMake,
      carModel,
      carYear,
      licensePlate,
      serviceType,
      preferredDate,
      preferredTime,
      additionalServices,
      notes,
      termsAccepted,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !carMake ||
      !carModel ||
      !carYear ||
      !licensePlate ||
      !serviceType ||
      !preferredDate ||
      !preferredTime ||
      termsAccepted !== true
    ) {
      return res.status(400).json({
        message: 'All required fields must be filled and terms accepted',
        success: false
      });
    }

    const additionalServicesStr = Array.isArray(additionalServices)
      ? additionalServices.join(', ')
      : '';

    const query = `
      INSERT INTO service_bookings (
        first_name, last_name, email, phone,
        car_make, car_model, car_year, license_plate,
        service_type, preferred_date, preferred_time,
        additional_services, notes, terms_accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await db.query(query, [
        firstName,
        lastName,
        email,
        phone,
        carMake,
        carModel,
        carYear,
        licensePlate,
        serviceType,
        preferredDate,
        preferredTime,
        additionalServicesStr,
        notes || '',
        termsAccepted ? 1 : 0,
      ]);

      res.status(200).json({ 
        message: 'Service booked successfully',
        success: true
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to book service',
        success: false,
        error: err.message
      });
    }
  })
);

// GET /fetch-service-bookings
router.get('/fetch-service-bookings', asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM service_bookings';
  try {
    const [results] = await db.query(sql);
    res.status(200).json({
      message: 'Service data fetched successfully',
      success: true,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch service data',
      success: false,
      error: err.message
    });
  }
}));

// PUT /service/:id  → Update a service booking
router.put(
  '/book-service/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      carMake,
      carModel,
      carYear,
      licensePlate,
      serviceType,
      preferredDate,
      preferredTime,
      additionalServices,
      notes,
      termsAccepted,
      status
    } = req.body;

    const additionalServicesStr = Array.isArray(additionalServices)
      ? additionalServices.join(', ')
      : '';

   const query = `
  UPDATE service_bookings
  SET first_name=?, last_name=?, email=?, phone=?,
      car_make=?, car_model=?, car_year=?, license_plate=?,
      service_type=?, preferred_date=?, preferred_time=?,
      additional_services=?, notes=?, terms_accepted=?, status=?
  WHERE id=?
`;

try {
const [result] = await db.query(query, [
  firstName,
  lastName,
  email,
  phone,
  carMake,
  carModel,
  carYear,
  licensePlate,
  serviceType,
  preferredDate,
  preferredTime,
  additionalServicesStr,
  notes || '',
  termsAccepted ? 1 : 0,
  status || '',  // ✅ Add this
  id            // id stays last
  ]);


      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Service booking not found', success: false });
      }

      res.status(200).json({ message: 'Service booking updated successfully', success: true });
    } catch (err) {
      res.status(500).json({ message: 'Failed to update service booking', success: false, error: err.message });
    }
  })
);

// DELETE /service/:id  → Delete a service booking
router.delete(
  '/service/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await db.query('DELETE FROM service_bookings WHERE id=?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Service booking not found', success: false });
      }

      res.status(200).json({ message: 'Service booking deleted successfully', success: true });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete service booking', success: false, error: err.message });
    }
  })
);

module.exports = router;
