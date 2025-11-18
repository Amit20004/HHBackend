const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads/ebrochures directory if it doesn't exist
const ebrochuresDir = path.join(__dirname, '../uploads/ebrochures');
if (!fs.existsSync(ebrochuresDir)) {
  fs.mkdirSync(ebrochuresDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ebrochuresDir);
  },
  filename: (req, file, cb) => {
    // Create a clean filename: car_name + timestamp
    const carName = req.body.car_name ? req.body.car_name.replace(/\s+/g, '_').toLowerCase() : 'brochure';
    const timestamp = Date.now();
    const uniqueSuffix = Math.round(Math.random() * 1E9);
    cb(null, `${carName}_${timestamp}_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files and PDFs are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'brochure_file', maxCount: 1 }
]);

// Utility function to format file size
function formatFileSize(bytes) {
  if (!bytes) return '0MB';
  if (typeof bytes === 'string' && bytes.includes('MB')) return bytes;
  
  const sizeInMB = (bytes / (1024 * 1024)).toFixed(1);
  return `${sizeInMB}MB`;
}

// Utility function to ensure proper file URL
function ensureProperFileUrl(url) {
  if (!url) return null;
  
  // If it's already a full URL, return as is
  if (url.startsWith('http')) return url;
  
  // If it's a local path but doesn't start with uploads/ebrochures, fix it
  if (url.startsWith('uploads/') && !url.startsWith('uploads/ebrochures/')) {
    return url.replace('uploads/', 'uploads/ebrochures/');
  }
  
  // If it's just a filename, add the proper path
  if (!url.includes('uploads/')) {
    return `uploads/ebrochures/${url}`;
  }
  
  return url;
}

// ===================== GET all e-brochures =====================
router.get('/car-ebrochure-all', asyncHandler(async (req, res) => {
  const sql = `
    SELECT id, car_name, file_name, file_url, file_size, image_url, category, created_at, updated_at, status
    FROM car_ebrochures_all
    ORDER BY created_at DESC
  `;
  const [results] = await db.query(sql);
  
  // Format all records for consistent response
  const formattedResults = results.map(item => ({
    ...item,
    file_url: ensureProperFileUrl(item.file_url),
    image_url: ensureProperFileUrl(item.image_url),
    file_size: formatFileSize(item.file_size)
  }));
  
  res.status(200).json({ 
    message: 'Brochures fetched successfully', 
    success: true, 
    data: formattedResults 
  });
}));

// ===================== GET single e-brochure =====================
router.get('/car-ebrochure/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT id, car_name,slug, file_name, file_url, file_size, image_url, category, created_at, updated_at, status
    FROM car_ebrochures_all 
    WHERE id = ?
  `;
  const [results] = await db.query(sql, [id]);
  
  if (results.length === 0) {
    return res.status(404).json({ message: 'Brochure not found', success: false });
  }
  
  const brochure = {
    ...results[0],
    file_url: ensureProperFileUrl(results[0].file_url),
    image_url: ensureProperFileUrl(results[0].image_url),
    file_size: formatFileSize(results[0].file_size)
  };
  
  res.status(200).json({ 
    message: 'Brochure fetched successfully', 
    success: true, 
    data: brochure 
  });
}));


router.get('/car-ebrochure-all/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cleanSlug = slug.trim().toLowerCase();

  console.log("Incoming slug from URL:", slug);
  console.log("Cleaned slug used in query:", cleanSlug);

  const sql = `
    SELECT * FROM car_ebrochures_all
    WHERE slug = ?
  `;

  console.log("Running SQL:", sql, "with param:", cleanSlug);

  const [results] = await db.query(sql, [cleanSlug]);

  console.log("Query results:", results);

  if (results.length === 0) {
    return res.status(404).json({ 
      message: `Brochure not found for slug: ${cleanSlug}`, 
      success: false 
    });
  }

  const brochure = {
    ...results[0],
    file_url: ensureProperFileUrl(results[0].file_url),
    image_url: ensureProperFileUrl(results[0].image_url),
    file_size: formatFileSize(results[0].file_size),
  };

  res.status(200).json({
    message: 'Brochure fetched successfully',
    success: true,
    data: brochure,
  });
}));






// ===================== POST (Add new e-brochure) =====================
router.post('/car-ebrochure', uploadFields, asyncHandler(async (req, res) => {
  const { car_name, category, status } = req.body;
  
  if (!req.files || !req.files.brochure_file) {
    return res.status(400).json({ message: 'Brochure file is required', success: false });
  }

  const brochureFile = req.files.brochure_file[0];
  const imageFile = req.files.image ? req.files.image[0] : null;

  if (!brochureFile.mimetype.includes('pdf')) {
    return res.status(400).json({ message: 'Brochure must be a PDF file', success: false });
  }

  const file_name = brochureFile.originalname;
  const file_url = `uploads/ebrochures/${brochureFile.filename}`;
  const file_size = brochureFile.size;
  const image_url = imageFile ? `uploads/ebrochures/${imageFile.filename}` : null;

  const sql = `
    INSERT INTO car_ebrochures_all (car_name, file_name, file_url, file_size, image_url, category, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const [result] = await db.query(sql, [
    car_name, 
    file_name, 
    file_url, 
    file_size, 
    image_url, 
    category || 'General', 
    status || 'active'
  ]);
  
  res.status(201).json({ 
    message: 'Brochure added successfully', 
    success: true, 
    data: { id: result.insertId } 
  });
}));

// ===================== PUT (Update e-brochure) =====================
router.put('/car-ebrochure/:carName', uploadFields, asyncHandler(async (req, res) => {
  const { carName } = req.params;
  const { car_name, category, status } = req.body;

  const [[existing]] = await db.query('SELECT * FROM car_ebrochures_all WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Brochure not found', success: false });
  }

  let file_name = existing.file_name;
  let file_url = existing.file_url;
  let file_size = existing.file_size;
  let image_url = existing.image_url;

  // Handle brochure file update
  if (req.files && req.files.brochure_file) {
    const brochureFile = req.files.brochure_file[0];
    
    if (!brochureFile.mimetype.includes('pdf')) {
      return res.status(400).json({ message: 'Brochure must be a PDF file', success: false });
    }

    // Delete old brochure file
    if (existing.file_url) {
      const oldFilePath = path.join(__dirname, '..', ensureProperFileUrl(existing.file_url));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    file_name = brochureFile.originalname;
    file_url = `uploads/ebrochures/${brochureFile.filename}`;
    file_size = brochureFile.size;
  }

  // Handle image update
  if (req.files && req.files.image) {
    const imageFile = req.files.image[0];
    
    // Delete old image file
    if (existing.image_url) {
      const oldImagePath = path.join(__dirname, '..', ensureProperFileUrl(existing.image_url));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    image_url = `uploads/ebrochures/${imageFile.filename}`;
  }

  const sql = `
    UPDATE car_ebrochures_all
    SET car_name=?, file_name=?, file_url=?, file_size=?, image_url=?, category=?, status=?, updated_at=NOW()
    WHERE id=?
  `;
  
  await db.query(sql, [
    car_name, 
    file_name, 
    file_url, 
    file_size, 
    image_url, 
    category || existing.category, 
    status || existing.status, 
    id
  ]);
  
  res.status(200).json({ message: 'Brochure updated successfully', success: true });
}));

// ===================== DELETE e-brochure =====================
router.delete('/car-ebrochure/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [[existing]] = await db.query('SELECT image_url, file_url FROM car_ebrochures_all WHERE id = ?', [id]);
  
  if (!existing) {
    return res.status(404).json({ message: 'Brochure not found', success: false });
  }

  // Delete image file
  if (existing.image_url) {
    const imagePath = path.join(__dirname, '..', ensureProperFileUrl(existing.image_url));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  // Delete brochure file
  if (existing.file_url) {
    const filePath = path.join(__dirname, '..', ensureProperFileUrl(existing.file_url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await db.query('DELETE FROM car_ebrochures_all WHERE id = ?', [id]);
  res.status(200).json({ message: 'Brochure deleted successfully', success: true });
}));

// ===================== FIX ALL BROCHURES =====================
router.post('/fix-all-brochures', asyncHandler(async (req, res) => {
  // Get all brochures
  const [brochures] = await db.query('SELECT id, file_url, image_url, file_size FROM car_ebrochures_all');
  
  let fixedCount = 0;
  
  for (const brochure of brochures) {
    const updates = [];
    const values = [];
    
    // Fix file_url if needed
    const fixedFileUrl = ensureProperFileUrl(brochure.file_url);
    if (fixedFileUrl !== brochure.file_url) {
      updates.push('file_url = ?');
      values.push(fixedFileUrl);
    }
    
    // Fix image_url if needed
    const fixedImageUrl = ensureProperFileUrl(brochure.image_url);
    if (fixedImageUrl !== brochure.image_url) {
      updates.push('image_url = ?');
      values.push(fixedImageUrl);
    }
    
    // Fix file_size if needed
    const fixedFileSize = formatFileSize(brochure.file_size);
    if (fixedFileSize !== brochure.file_size) {
      updates.push('file_size = ?');
      values.push(fixedFileSize);
    }
    
    // Update if any fixes are needed
    if (updates.length > 0) {
      values.push(brochure.id);
      const sql = `UPDATE car_ebrochures_all SET ${updates.join(', ')} WHERE id = ?`;
      await db.query(sql, values);
      fixedCount++;
    }
  }
  
  res.status(200).json({ 
    message: `Fixed ${fixedCount} brochure records`, 
    success: true,
    fixedCount 
  });
}));

// ===================== MOVE EXISTING FILES =====================
router.post('/move-existing-files', asyncHandler(async (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const ebrochuresDir = path.join(__dirname, '../uploads/ebrochures');
  
  // Get all files in uploads directory (excluding ebrochures folder)
  const files = fs.readdirSync(uploadsDir).filter(file => {
    return file !== 'ebrochures' && 
           fs.statSync(path.join(uploadsDir, file)).isFile();
  });
  
  let movedCount = 0;
  
  for (const file of files) {
    const oldPath = path.join(uploadsDir, file);
    const newPath = path.join(ebrochuresDir, file);
    
    // Move file
    fs.renameSync(oldPath, newPath);
    movedCount++;
  }
  
  res.status(200).json({ 
    message: `Moved ${movedCount} files to ebrochures directory`, 
    success: true,
    movedCount 
  });
}));

module.exports = router;