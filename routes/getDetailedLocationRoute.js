const express = require('express');
const router = express.Router();
const db = require('../db.js');
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const mainImagesDir = path.join(uploadsDir, 'main-images');
const galleryImagesDir = path.join(uploadsDir, 'gallery-images');

[uploadsDir, mainImagesDir, galleryImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage configuration for all images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'main_image') cb(null, mainImagesDir);
    else if (file.fieldname === 'gallery_images') cb(null, galleryImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    if (file.fieldname === 'main_image') cb(null, 'main-' + uniqueSuffix + path.extname(file.originalname));
    else if (file.fieldname === 'gallery_images') cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
};

// Single multer instance for multiple fields
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ===================== GET all detailed locations =====================
router.get(
  '/detailed-locations',
  asyncHandler(async (req, res) => {
    const [locations] = await db.query('SELECT * FROM detailed_locations ORDER BY id DESC');
    // Parse JSON fields before sending
    const formatted = locations.map(loc => ({
      ...loc,
      gallery_images: loc.gallery_images ? JSON.parse(loc.gallery_images) : [],
      facilities: loc.facilities ? JSON.parse(loc.facilities) : []
    }));
    res.json({ success: true, data: formatted });
  })
);

// ===================== GET detailed location by type + slug =====================
router.get(
  '/detailed-locations/:type/:slug',
  asyncHandler(async (req, res) => {
    const { type, slug } = req.params;

    const [[location]] = await db.query(
      'SELECT * FROM detailed_locations WHERE type = ? AND slug = ? LIMIT 1',
      [type, slug]
    );

    if (!location)
      return res.status(404).json({ success: false, message: 'Detailed location not found' });

    // Parse JSON fields
    location.gallery_images = location.gallery_images ? JSON.parse(location.gallery_images) : [];
    location.facilities = location.facilities ? JSON.parse(location.facilities) : [];

    res.json({ success: true, data: location });
  })
);


// ===================== POST (Add new detailed location) =====================
router.post(
  '/detailed-locations',
  upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 }
  ]),
  asyncHandler(async (req, res) => {
    const { page_heading, page_content, address, hours, contact, map_url, facilities, slug, type } = req.body;

    const mainImagePath = req.files['main_image'] ? `/uploads/main-images/${req.files['main_image'][0].filename}` : '';
    const galleryImagePaths = req.files['gallery_images'] 
      ? req.files['gallery_images'].map(file => `/uploads/gallery-images/${file.filename}`) 
      : [];

    let facilitiesArray = [];
    if (facilities) {
      try {
        facilitiesArray = typeof facilities === 'string' ? JSON.parse(facilities) : facilities;
      } catch (e) {
        facilitiesArray = Array.isArray(facilities) ? facilities : [];
      }
    }

    const sql = `
      INSERT INTO detailed_locations 
      (page_heading, page_content, main_image, address, hours, contact, map_url, facilities, gallery_images, slug, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const [result] = await db.query(sql, [
      page_heading, page_content, mainImagePath, address, hours, contact, map_url,
      JSON.stringify(facilitiesArray), JSON.stringify(galleryImagePaths), slug, type
    ]);

    res.status(201).json({
      success: true,
      message: 'Detailed location added successfully',
      data: { id: result.insertId, main_image: mainImagePath, gallery_images: galleryImagePaths }
    });
  })
);

// ===================== PUT (Update detailed location) =====================
router.put(
  '/detailed-locations/:id',
  upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 }
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page_heading, page_content, address, hours, contact, map_url, facilities, slug, type, existing_main_image, existing_gallery_images } = req.body;

    const [[existing]] = await db.query('SELECT * FROM detailed_locations WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Detailed location not found' });

    let mainImagePath = existing_main_image || existing.main_image;
    if (req.files['main_image']) mainImagePath = `/uploads/main-images/${req.files['main_image'][0].filename}`;

    let galleryImagePaths = [];
    try {
      const existingGallery = typeof existing_gallery_images === 'string' ? JSON.parse(existing_gallery_images) : existing_gallery_images || [];
      galleryImagePaths = Array.isArray(existingGallery) ? existingGallery : [];
    } catch (e) {
      galleryImagePaths = [];
    }

    if (req.files['gallery_images']) {
      const newGalleryImages = req.files['gallery_images'].map(file => `/uploads/gallery-images/${file.filename}`);
      galleryImagePaths = [...galleryImagePaths, ...newGalleryImages];
    }

    let facilitiesArray = [];
    if (facilities) {
      try {
        facilitiesArray = typeof facilities === 'string' ? JSON.parse(facilities) : facilities;
      } catch (e) {
        facilitiesArray = Array.isArray(facilities) ? facilities : [];
      }
    }

    const sql = `
      UPDATE detailed_locations 
      SET page_heading=?, page_content=?, main_image=?, address=?, hours=?, contact=?, map_url=?, 
          facilities=?, gallery_images=?, slug=?, type=?, updated_at=NOW()
      WHERE id=?
    `;
    await db.query(sql, [
      page_heading, page_content, mainImagePath, address, hours, contact, map_url,
      JSON.stringify(facilitiesArray), JSON.stringify(galleryImagePaths), slug, type, id
    ]);

    res.json({ success: true, message: 'Detailed location updated successfully', data: { main_image: mainImagePath, gallery_images: galleryImagePaths } });
  })
);

// ===================== DELETE =====================
router.delete(
  '/detailed-locations/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [[existing]] = await db.query('SELECT * FROM detailed_locations WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Detailed location not found' });

    await db.query('DELETE FROM detailed_locations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Detailed location deleted successfully' });
  })
);

module.exports = router;
