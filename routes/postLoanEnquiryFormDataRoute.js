// routes/loanEnquiries.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Your database connection

// GET all loan enquiries
router.get('/fetch-loan-enquiry', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM loan_enquiries`;
    let countQuery = `
      SELECT COUNT(*) as count FROM loan_enquiries
    `;
    let params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)`;
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)`;
      const searchParam = `%${search}%`;
      // Add the search parameter three times for the three conditions
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute queries
    const [result] = await db.query(query, params);
    
    // For count query, we need to use only the search parameters (not limit/offset)
    const countParams = params.slice(0, params.length - 2); // Remove limit and offset
    const [countResult] = await db.query(countQuery, countParams);
    
    res.json({
      success: true,
      data: result,
      total: parseInt(countResult[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult[0].count / limit)
    });
  } catch (error) {
    console.error('Error fetching loan enquiries:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET single loan enquiry
router.get('/loan-enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('SELECT * FROM loan_enquiries WHERE id = ?', [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan enquiry not found' });
    }
    
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error fetching loan enquiry:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST new loan enquiry
router.post('/loan-enquiry', async (req, res) => {
  try {
    const {
      selectedCar, carVariant, carColor,
      loanAmount, loanDuration, employmentType, annualIncome, timeFrame,
      title, name, email, mobile, panNo, address1, address2, city, area, pincode
    } = req.body;
    
    // For MariaDB/MySQL - use two queries
    const insertQuery = `
      INSERT INTO loan_enquiries (
        selected_car, car_variant, car_color,
        loan_amount, loan_duration, employment_type, annual_income, time_frame,
        title, name, email, mobile, pan_no, address1, address2, city, area, pincode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      selectedCar, carVariant, carColor,
      loanAmount, loanDuration, employmentType, annualIncome, timeFrame,
      title, name, email, mobile, panNo, address1, address2, city, area, pincode
    ];
    
    // Execute the insert query
    const [result] = await db.query(insertQuery, values);
    
    // Get the inserted record
    const selectQuery = 'SELECT * FROM loan_enquiries WHERE id = ?';
    const [enquiry] = await db.query(selectQuery, [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      message: "Loan enquiry created successfully",
      data: enquiry[0] 
    });
  } catch (error) {
    console.error('Error creating loan enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// PUT update loan enquiry
router.put('/put-loan-enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
       status
    } = req.body;
    
    // For MariaDB/MySQL - use two queries
    const updateQuery = `
      UPDATE loan_enquiries SET
        
        status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const values = [
      status, id
    ];
    
    // Execute the update query
    const [result] = await db.query(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Loan enquiry not found' });
    }
    
    // Get the updated record
    const selectQuery = 'SELECT * FROM loan_enquiries WHERE id = ?';
    const [enquiry] = await db.query(selectQuery, [id]);
    
    res.json({ 
      success: true, 
      message: 'Loan enquiry updated successfully',
      data: enquiry[0] 
    });
  } catch (error) {
    console.error('Error updating loan enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// DELETE loan enquiry
router.delete('/delete-loan-enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the record to return it
    const [selectResult] = await db.query('SELECT * FROM loan_enquiries WHERE id = ?', [id]);
    
    if (selectResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan enquiry not found' });
    }
    
    // Then delete it
    await db.query('DELETE FROM loan_enquiries WHERE id = ?', [id]);
    
    res.json({ 
      success: true, 
      message: 'Loan enquiry deleted successfully',
      data: selectResult[0] 
    });
  } catch (error) {
    console.error('Error deleting loan enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

module.exports = router;