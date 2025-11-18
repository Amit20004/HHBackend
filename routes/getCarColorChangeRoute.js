const express = require("express");
const router = express.Router();
const db = require("../db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = "uploads/carcolorchange";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Utility to normalize path
const normalizePath = (p) => p.replace(/\\/g, "/");

// ------------------ COLORS ------------------

// Get all colors
router.get("/car-colors", async (req, res) => {
  try {
    const { carName } = req.query;
    let query = "SELECT * FROM car_colors";
    let params = [];

    if (carName) {
      query += " WHERE LOWER(car_name) = ? ORDER BY id DESC";
      params.push(carName.toLowerCase());
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    res.json(rows.map((r) => ({ ...r, car_image: normalizePath(r.car_image) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get color by ID
router.get("/car-colors/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM car_colors WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Color not found" });
    }

    res.json({ ...rows[0], car_image: normalizePath(rows[0].car_image) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add color
router.post("/car-colors", upload.single("car_image"), async (req, res) => {
  try {
    const { car_name, color_name, color_id } = req.body;
    if (!car_name || !color_name || !color_id || !req.file) {
      return res
        .status(400)
        .json({ error: "All fields including image required" });
    }

    const car_image = normalizePath(req.file.path);
    const [result] = await db.query(
      "INSERT INTO car_colors (car_name, color_name, color_id, car_image, created_at, updated_at) VALUES (?,?,?,?,NOW(),NOW())",
      [car_name, color_name, color_id, car_image]
    );

    res.json({
      id: result.insertId,
      car_name,
      color_name,
      color_id,
      car_image,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update color
router.put("/car-colors/:id", upload.single("car_image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { car_name, color_name, color_id } = req.body;

    const [existing] = await db.query("SELECT * FROM car_colors WHERE id = ?", [
      id,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Color not found" });
    }

    let car_image = existing[0].car_image;
    if (req.file) {
      if (fs.existsSync(existing[0].car_image)) {
        fs.unlinkSync(existing[0].car_image);
      }
      car_image = normalizePath(req.file.path);
    }

    await db.query(
      "UPDATE car_colors SET car_name = ?, color_name = ?, color_id = ?, car_image = ?, updated_at = NOW() WHERE id = ?",
      [car_name, color_name, color_id, car_image, id]
    );

    res.json({
      id,
      car_name,
      color_name,
      color_id,
      car_image,
      message: "Color updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete color
router.delete("/car-colors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query("SELECT * FROM car_colors WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Color not found" });
    }

    if (fs.existsSync(existing[0].car_image)) {
      fs.unlinkSync(existing[0].car_image);
    }

    await db.query("DELETE FROM car_colors WHERE id = ?", [id]);

    res.json({ message: "Color deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------ SWATCHES ------------------

// Get all swatches
router.get("/car-swatches", async (req, res) => {
  try {
    const { carName } = req.query;
    let query = "SELECT * FROM car_swatches";
    let params = [];

    if (carName) {
      query += " WHERE LOWER(car_name) = ? ORDER BY id DESC";
      params.push(carName.toLowerCase());
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    res.json(
      rows.map((r) => ({ ...r, swatch_image: normalizePath(r.swatch_image) }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get swatch by ID
router.get("/car-swatches/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM car_swatches WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Swatch not found" });
    }

    res.json({ ...rows[0], swatch_image: normalizePath(rows[0].swatch_image) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add swatch
router.post("/car-swatches", upload.single("swatch_image"), async (req, res) => {
  try {
    const { car_name, swatch_name, swatch_id, color_code } = req.body;
    if (!car_name || !swatch_name || !swatch_id || !color_code || !req.file) {
      return res
        .status(400)
        .json({ error: "All fields including image required" });
    }

    const swatch_image = normalizePath(req.file.path);
    const [result] = await db.query(
      "INSERT INTO car_swatches (car_name, swatch_name, swatch_id, color_code, swatch_image, created_at, updated_at) VALUES (?,?,?,?,?,NOW(),NOW())",
      [car_name, swatch_name, swatch_id, color_code, swatch_image]
    );

    res.json({
      id: result.insertId,
      car_name,
      swatch_name,
      swatch_id,
      color_code,
      swatch_image,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update swatch
router.put(
  "/car-swatches/:id",
  upload.single("swatch_image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { car_name, swatch_name, swatch_id, color_code } = req.body;

      const [existing] = await db.query(
        "SELECT * FROM car_swatches WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: "Swatch not found" });
      }

      let swatch_image = existing[0].swatch_image;
      if (req.file) {
        if (fs.existsSync(existing[0].swatch_image)) {
          fs.unlinkSync(existing[0].swatch_image);
        }
        swatch_image = normalizePath(req.file.path);
      }

      await db.query(
        "UPDATE car_swatches SET car_name = ?, swatch_name = ?, swatch_id = ?, color_code = ?, swatch_image = ?, updated_at = NOW() WHERE id = ?",
        [car_name, swatch_name, swatch_id, color_code, swatch_image, id]
      );

      res.json({
        id,
        car_name,
        swatch_name,
        swatch_id,
        color_code,
        swatch_image,
        message: "Swatch updated successfully",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Delete swatch
router.delete("/car-swatches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query("SELECT * FROM car_swatches WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Swatch not found" });
    }

    if (fs.existsSync(existing[0].swatch_image)) {
      fs.unlinkSync(existing[0].swatch_image);
    }

    await db.query("DELETE FROM car_swatches WHERE id = ?", [id]);

    res.json({ message: "Swatch deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get car colors with matching swatches
router.get("/car-color-swatches/:carName", async (req, res) => {
  try {
    const { carName } = req.params;

    const [colors] = await db.query(
      "SELECT * FROM car_colors WHERE LOWER(car_name) = ? ORDER BY id DESC",
      [carName.toLowerCase()]
    );

    const [swatches] = await db.query(
      "SELECT * FROM car_swatches WHERE LOWER(car_name) = ? ORDER BY id DESC",
      [carName.toLowerCase()]
    );

    const matchedData = colors
      .map((color) => {
        const matchingSwatch = swatches.find(
          (swatch) =>
            swatch.swatch_name.toLowerCase() === color.color_name.toLowerCase()
        );

        return {
          id: color.id,
          car_name: color.car_name,
          color_name: color.color_name,
          car_image: normalizePath(color.car_image),
          swatch_id: matchingSwatch ? matchingSwatch.id : null,
          swatch_name: matchingSwatch ? matchingSwatch.swatch_name : null,
          color_code: matchingSwatch ? matchingSwatch.color_code : null,
          swatch_image: matchingSwatch
            ? normalizePath(matchingSwatch.swatch_image)
            : null,
        };
      })
      .filter((item) => item.swatch_id !== null);

    res.json(matchedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
