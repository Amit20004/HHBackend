const express =require("express");
const multer =require("multer");
const path =require("path");
const db =require("../db.js");
const fs=require('fs')
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'home-about2');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + '-' + file.originalname.replace(/\s+/g, '_')
    );
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ================= POST (Create) =================
router.post("/home-about2", upload.fields([{ name: "image1" }, { name: "image2" }]), async (req, res) => {
  const { main_heading, description } = req.body;
  const imageUrl1 = req.files["image1"] ? `/uploads/home-about2/${req.files["image1"][0].filename}` : req.body.image_url1 || null;
  const imageUrl2 = req.files["image2"] ? `/uploads/home-about2/${req.files["image2"][0].filename}` : req.body.image_url2 || null;

  await db.query(
    "INSERT INTO home_about2_section (main_heading, description, image_url1, image_url2) VALUES (?, ?, ?, ?)",
    [main_heading, description, imageUrl1, imageUrl2]
  );

  res.json({ message: "Section added successfully" });
});

// Correct spelling
router.put("/put-home-about2/:id", upload.fields([{ name: "image1" }, { name: "image2" }]), async (req, res) => {
  const { id } = req.params;
  const { main_heading, description } = req.body;
  const imageUrl1 = req.files["image1"] ? `/uploads/home-about2/${req.files["image1"][0].filename}` : req.body.image_url1 || null;
  const imageUrl2 = req.files["image2"] ? `/uploads/home-about2/${req.files["image2"][0].filename}` : req.body.image_url2 || null;

  await db.query(
    "UPDATE home_about2_section SET main_heading=?, description=?, image_url1=?, image_url2=? WHERE id=?",
    [main_heading, description, imageUrl1, imageUrl2, id]
  );

  res.json({ message: "Section updated successfully" });
});

// ================= GET (All + Single) =================
// GET all sections
router.get("/get-home-about2", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM home_about2_section ORDER BY id ASC");
  if (rows.length === 0) return res.status(404).json({ message: "Section not found" });
  res.json({ data: rows });
});


// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   const [rows] = await db.query("SELECT * FROM home_about2_section WHERE id=?", [id]);
//   if (rows.length === 0) return res.status(404).json({ message: "Section not found" });
//   res.json(rows[0]);
// });

// ================= DELETE =================
router.delete("/home-about2/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM home_about2_section WHERE id=?", [id]);
  res.json({ message: "Section deleted successfully" });
});
module.exports=router;