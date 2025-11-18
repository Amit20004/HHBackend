const express = require("express");
const router = express.Router();
const db = require("../db"); // MySQL promise pool
const asyncHandler = require("../utils/asyncHandler");

// ================= Routes =================

// GET navbar info + icons + locations
router.get("/topnavbar", asyncHandler(async (req, res) => {
  const [navbarInfo] = await db.query("SELECT * FROM top_navbar LIMIT 1");
  const [icons] = await db.query("SELECT id, platform, iconClass as icon, url FROM social_icons");
  
  // Parse locations if they exist in navbarInfo
  
  
  // Add locations to navbarInfo
  const navbarData = {
    ...navbarInfo[0],
  };
  
  res.json({ navbarInfo: navbarData, icons });
}));

// POST navbar info (Admin can set contact details once)
router.post("/topnavbar", asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  await db.query(
    "INSERT INTO top_navbar (email, phone) VALUES (?, ?)",
    [email, phone]
  );
  res.json({ message: "Navbar info added successfully" });
}));

// PUT navbar info (update email/phone/location)
router.put("/topnavbar/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, phone } = req.body;
  
  await db.query(
    "UPDATE top_navbar SET email=?, phone=? WHERE id=?",
    [email, phone, id]
  );
  res.json({ message: "Navbar info updated successfully" });
}));

// POST new social icon
router.post("/icon", asyncHandler(async (req, res) => {
  const { platform, url, iconClass } = req.body;
  
  await db.query(
    "INSERT INTO social_icons (platform, iconClass, url) VALUES (?, ?, ?)",
    [platform, iconClass, url]
  );
  res.json({ message: "Social icon added successfully" });
}));

// PUT update social icon
router.put("/icon/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { platform, url, iconClass } = req.body;
  
  await db.query(
    "UPDATE social_icons SET platform=?, iconClass=?, url=? WHERE id=?",
    [platform, iconClass, url, id]
  );
  
  res.json({ message: "Social icon updated successfully" });
}));

// DELETE social icon
router.delete("/icon/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM social_icons WHERE id=?", [id]);
  res.json({ message: "Social icon deleted successfully" });
}));

module.exports = router;