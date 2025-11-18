const express = require('express');
const router = express.Router();
const db = require('../db'); // Your database connection

// GET all side_form_enquiries with pagination and filtering
router.get('/fetch-side-form-enquiries', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, enquiry_type, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM side_form_enquiries WHERE 1=1`;
    let countQuery = `
      SELECT COUNT(*) as count FROM side_form_enquiries WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;
    
    // Add filters if provided
    if (status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }
    
    if (enquiry_type) {
      query += ` AND enquiry_type = ?`;
      countQuery += ` AND enquiry_type = ?`;
      params.push(enquiry_type);
    }
    
    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR contact_number LIKE ?)`;
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR contact_number LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute data query
    const [result] = await db.query(query, params);
    
    // For count query, we need to use only the filter parameters (not limit/offset)
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
    console.error('Error fetching side_form_enquiries:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET single enquiry
router.get('/enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('SELECT * FROM side_form_enquiries WHERE id = ?', [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST new enquiry
router.post('/side-form-enquiry', async (req, res) => {
  try {
    const {
      name, email, contact_number, enquiry_type, model, location, agree_to_marketing
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !contact_number || !enquiry_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, contact number, and enquiry type are required' 
      });
    }
    
    // Validate that model is provided for car-related side_form_enquiries
    if ((enquiry_type === 'New Car' || enquiry_type === 'Used Car') && !model) {
      return res.status(400).json({ 
        success: false, 
        message: 'Model selection is required for car side_form_enquiries' 
      });
    }
    
    // Validate marketing agreement
    if (!agree_to_marketing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Marketing agreement is required' 
      });
    }
    
    const insertQuery = `
      INSERT INTO side_form_enquiries (
        name, email, contact_number, enquiry_type, model, location, agree_to_marketing
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      name, email, contact_number, enquiry_type, model, location, agree_to_marketing
    ];
    
    // Execute the insert query
    const [result] = await db.query(insertQuery, values);
    
    // Get the inserted record
    const selectQuery = 'SELECT * FROM side_form_enquiries WHERE id = ?';
    const [enquiry] = await db.query(selectQuery, [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      message: "Enquiry submitted successfully",
      data: enquiry[0] 
    });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// PUT update enquiry status
router.put('/side-form-enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['New', 'In Progress', 'Contacted', 'Resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }
    
    const updateQuery = `
      UPDATE side_form_enquiries SET
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const values = [status, id];
    
    // Execute the update query
    const [result] = await db.query(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    
    // Get the updated record
    const selectQuery = 'SELECT * FROM side_form_enquiries WHERE id = ?';
    const [enquiry] = await db.query(selectQuery, [id]);
    
    res.json({ 
      success: true, 
      message: 'Enquiry updated successfully',
      data: enquiry[0] 
    });
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// DELETE enquiry
router.delete('/side-form-enquiry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the record to return it
    const [selectResult] = await db.query('SELECT * FROM side_form_enquiries WHERE id = ?', [id]);
    
    if (selectResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    
    // Then delete it
    await db.query('DELETE FROM side_form_enquiries WHERE id = ?', [id]);
    
    res.json({ 
      success: true, 
      message: 'Enquiry deleted successfully',
      data: selectResult[0] 
    });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

module.exports = router;