// routes/vehicleFilters.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for multiple image uploads with specific field names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'vehicles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper: Safe JSON parsing
function safeJSONParse(data) {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// ----------------------------
// GET: Vehicle Filters
// ----------------------------
router.get('/vehicle-filters', asyncHandler(async (req, res) => {
  const [models] = await db.query(
    'SELECT DISTINCT model FROM vehicles_price WHERE model IS NOT NULL AND model != ""'
  );
  const [fuelTypes] = await db.query(
    'SELECT DISTINCT fuel_type AS fuelType FROM vehicles_price WHERE fuel_type IS NOT NULL AND fuel_type != ""'
  );
  const [transmissions] = await db.query(
    'SELECT DISTINCT transmission FROM vehicles_price WHERE transmission IS NOT NULL AND transmission != ""'
  );
  const [variantsByFuel] = await db.query(`
    SELECT 
      fuel_type AS fuelType,
      GROUP_CONCAT(DISTINCT CONCAT(variant, ' (₹', FORMAT(price, 0), ')') SEPARATOR '||') AS variants
    FROM vehicles_price
    WHERE fuel_type IS NOT NULL AND fuel_type != "" AND variant IS NOT NULL
    GROUP BY fuel_type
  `);

  const variantsData = { 'All Fuel Types': ['All Variants'] };
  variantsByFuel.forEach(row => {
    variantsData[row.fuelType] = row.variants
      ? ['All Variants', ...row.variants.split('||')]
      : ['All Variants'];
  });

  res.status(200).json({
    message: 'Vehicle filters fetched successfully',
    success: true,
    data: {
      models: ['All Models', ...models.map(m => m.model)],
      fuelTypes: ['All Fuel Types', ...fuelTypes.map(f => f.fuelType)],
      transmissions: ['All Transmissions', ...transmissions.map(t => t.transmission)],
      variantsData
    }
  });
}));

// ----------------------------
// GET: All Vehicles
// ----------------------------
router.get('/vehicles', asyncHandler(async (req, res) => {
  const [vehicles] = await db.query('SELECT * FROM vehicles_price');
  const parsedVehicles = vehicles.map(vehicle => ({
    ...vehicle,
    images: safeJSONParse(vehicle.images),
    features: safeJSONParse(vehicle.features)
  }));
  res.status(200).json({ message: 'Vehicles fetched successfully', success: true, data: parsedVehicles });
}));

// ----------------------------
// POST: Add Vehicle with multiple images
// ----------------------------
// ----------------------------
// POST: Add Vehicle
// ----------------------------
router.post('/vehicles', upload.fields([
  { name: 'main_img', maxCount: 1 },
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
  { name: 'img3', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const { model, fuel_type, transmission, variant, price, description, features, status } = req.body;
  
  if (!model || !fuel_type || !transmission || !variant || !price) {
    return res.status(400).json({ success: false, message: 'All required fields must be provided' });
  }

  // Get file paths
  const mainImg = req.files['main_img'] ? 'uploads/vehicles/' + req.files['main_img'][0].filename : null;
  const img1 = req.files['img1'] ? 'uploads/vehicles/' + req.files['img1'][0].filename : null;
  const img2 = req.files['img2'] ? 'uploads/vehicles/' + req.files['img2'][0].filename : null;
  const img3 = req.files['img3'] ? 'uploads/vehicles/' + req.files['img3'][0].filename : null;

  // Convert features to array if string
  const featuresArray = Array.isArray(features)
    ? features
    : typeof features === 'string'
    ? features.split(',').map(f => f.trim())
    : [];

  const query = `
    INSERT INTO vehicles_price 
    (model, fuel_type, transmission, variant, price, description, features, status, main_img, img1, img2, img3)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await db.query(query, [
    model,
    fuel_type,
    transmission,
    variant,
    price,
    description || '',
    featuresArray.join(', '),   // ✅ store as clean string
    status || 'Enabled',
    mainImg,
    img1,
    img2,
    img3
  ]);

  res.status(200).json({ success: true, message: 'Vehicle added successfully' });
}));

// ----------------------------
// PUT: Update Vehicle
// ----------------------------
router.put('/vehicles/:id', upload.fields([
  { name: 'main_img', maxCount: 1 },
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
  { name: 'img3', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { model, fuel_type, transmission, variant, price, description, features, status } = req.body;

  const [rows] = await db.query('SELECT main_img, img1, img2, img3 FROM vehicles_price WHERE id=?', [id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });

  let mainImg = rows[0].main_img;
  let img1Path = rows[0].img1;
  let img2Path = rows[0].img2;
  let img3Path = rows[0].img3;

  if (req.files['main_img']) {
    if (mainImg) {
      const filePath = path.join(__dirname, '..', mainImg);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    mainImg = 'uploads/vehicles/' + req.files['main_img'][0].filename;
  }

  if (req.files['img1']) {
    if (img1Path) {
      const filePath = path.join(__dirname, '..', img1Path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    img1Path = 'uploads/vehicles/' + req.files['img1'][0].filename;
  }

  if (req.files['img2']) {
    if (img2Path) {
      const filePath = path.join(__dirname, '..', img2Path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    img2Path = 'uploads/vehicles/' + req.files['img2'][0].filename;
  }

  if (req.files['img3']) {
    if (img3Path) {
      const filePath = path.join(__dirname, '..', img3Path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    img3Path = 'uploads/vehicles/' + req.files['img3'][0].filename;
  }

  // Convert features to array if string
  const featuresArray = Array.isArray(features)
    ? features
    : typeof features === 'string'
    ? features.split(',').map(f => f.trim())
    : [];

  const query = `
    UPDATE vehicles_price
    SET model=?, fuel_type=?, transmission=?, variant=?, price=?, description=?, features=?, status=?, main_img=?, img1=?, img2=?, img3=?
    WHERE id=?
  `;
  
  await db.query(query, [
    model,
    fuel_type,
    transmission,
    variant,
    price,
    description || '',
    featuresArray.join(', '),   // ✅ store as clean string
    status || 'Enabled',
    mainImg,
    img1Path,
    img2Path,
    img3Path,
    id
  ]);

  res.status(200).json({ success: true, message: 'Vehicle updated successfully' });
}));

// ----------------------------
// DELETE: Remove Vehicle
// ----------------------------
router.delete('/vehicles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch vehicle to get image paths
  const [rows] = await db.query('SELECT main_img, img1, img2, img3 FROM vehicles_price WHERE id=?', [id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });

  // Delete images from disk
  const images = [rows[0].main_img, rows[0].img1, rows[0].img2, rows[0].img3];
  images.forEach(imgPath => {
    if (imgPath) {
      const filePath = path.join(__dirname, '..', imgPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  await db.query('DELETE FROM vehicles_price WHERE id=?', [id]);
  res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
}));

module.exports = router;