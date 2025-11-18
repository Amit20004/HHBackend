const express = require('express');
const router = express.Router();
const db = require('../db.js'); // MySQL promise pool
const asyncHandler = require('../utils/asyncHandler.js');
const multer = require('multer');
const path = require('path');
const BASE_URL = "http://localhost:8000"; // same as car-offers

// =================== Multer Config ===================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // folder where files will be saved
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // unique filename
  }
});
const upload = multer({ storage: storage });

// Serve uploaded files statically
router.use('/uploads', express.static('uploads'));

// =================== GET All ===================
router.get('/car-service-offers', asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT id, card_image, thumbnail_image, thumbnail_heading, 
           thumbnail_content, price, car_name, features
    FROM car_service
  `);

  const data = rows.map(row => {
    let featuresArray = [];
    if (row.features && row.features.trim() !== '') {
      try {
        featuresArray = JSON.parse(row.features);
        
        // Ensure each feature has the required structure
        featuresArray = featuresArray.map(feature => {
          // If it's a string (old format), convert to object
          if (typeof feature === 'string') {
            return {
              title: feature,
              description: feature,
              duration: "3 Years" // Default duration
            };
          }
          
          // If it's already an object but missing fields, add defaults
          return {
            duration: feature.duration || "3 Years",
            title: feature.title || "",
            description: feature.description || feature.title || ""
          };
        });
      } catch (e) {
        console.error('Error parsing features:', e);
        // If parsing fails, create default features array
        featuresArray = [
          {
            duration: "3 Years",
            title: "Premium Feature",
            description: "Included with this vehicle"
          }
        ];
      }
    } else {
      // Default features if none exist
      featuresArray = [
        {
          duration: "3 Years",
          title: "Premium Feature",
          description: "Included with this vehicle"
        }
      ];
    }

    return {
      car_name: row.car_name,
      variants: [
        {
          id: row.id,
          price: Number(row.price) || 0,
          images: {
            main: row.card_image ? `${BASE_URL}/uploads/${row.card_image}` : null,
            thumbnail: row.thumbnail_image ? `${BASE_URL}/uploads/${row.thumbnail_image}` : null
          },
          details: {
            heading: row.thumbnail_heading || '',
            description: row.thumbnail_content || ''
          },
          features: featuresArray
        }
      ]
    };
  });

  res.status(200).json({ success: true, data });
}));

// =================== POST ===================
router.post(
  '/car-service-offers',
  upload.fields([
    { name: 'card_image', maxCount: 1 },
    { name: 'thumbnail_image', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const { thumbnail_heading, thumbnail_content, price, car_name, features } = req.body;

    const cardImage = req.files['card_image'] ? req.files['card_image'][0].filename : null;
    const thumbnailImage = req.files['thumbnail_image'] ? req.files['thumbnail_image'][0].filename : null;

    // Parse and validate features
    let featuresData = [];
    try {
      featuresData = features ? JSON.parse(features) : [];
      
      // Ensure proper structure
      featuresData = featuresData.map(feature => ({
        duration: feature.duration || "3 Years",
        title: feature.title || "",
        description: feature.description || feature.title || ""
      }));
    } catch (e) {
      console.error('Error parsing features:', e);
      // Default features if parsing fails
      featuresData = [
        {
          duration: "3 Years",
          title: "Premium Feature",
          description: "Included with this vehicle"
        }
      ];
    }

    const [result] = await db.query(
      `INSERT INTO car_service 
        (card_image, thumbnail_image, thumbnail_heading, thumbnail_content, price, car_name, features, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        cardImage,
        thumbnailImage,
        thumbnail_heading,
        thumbnail_content,
        price,
        car_name,
        JSON.stringify(featuresData)
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Car service offer added',
      id: result.insertId
    });
  })
);

// =================== PUT ===================
router.put(
  '/car-service-offers/:id',
  upload.fields([
    { name: 'card_image', maxCount: 1 },
    { name: 'thumbnail_image', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { thumbnail_heading, thumbnail_content, price, car_name, features } = req.body;

    const cardImage = req.files['card_image'] ? req.files['card_image'][0].filename : null;
    const thumbnailImage = req.files['thumbnail_image'] ? req.files['thumbnail_image'][0].filename : null;

    // Parse and validate features
    let featuresData = [];
    try {
      featuresData = features ? JSON.parse(features) : [];
      
      // Ensure proper structure
      featuresData = featuresData.map(feature => ({
        duration: feature.duration || "3 Years",
        title: feature.title || "",
        description: feature.description || feature.title || ""
      }));
    } catch (e) {
      console.error('Error parsing features:', e);
      // Default features if parsing fails
      featuresData = [
        {
          duration: "3 Years",
          title: "Premium Feature",
          description: "Included with this vehicle"
        }
      ];
    }

    const [result] = await db.query(
      `UPDATE car_service 
       SET card_image = COALESCE(?, card_image),
           thumbnail_image = COALESCE(?, thumbnail_image),
           thumbnail_heading = ?, 
           thumbnail_content = ?, 
           price = ?, 
           car_name = ?, 
           features = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [
        cardImage,
        thumbnailImage,
        thumbnail_heading,
        thumbnail_content,
        price,
        car_name,
        JSON.stringify(featuresData),
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Car service offer not found' });
    }

    res.status(200).json({ success: true, message: 'Car service offer updated' });
  })
);

// =================== DELETE ===================
router.delete('/car-service-offers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await db.query(`DELETE FROM car_service WHERE id = ?`, [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Car service offer not found' });
  }

  res.status(200).json({ success: true, message: 'Car service offer deleted' });
}));

module.exports = router;