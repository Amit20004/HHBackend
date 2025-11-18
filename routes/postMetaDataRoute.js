const express = require('express');
const router = express.Router();
const db = require('../db'); // MySQL connection (Promise enabled)

// GET all meta data
// In your Express server
router.get('/fetch-metadata', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM meta_data ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET meta data by slug
router.get('/metadata/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM meta_data WHERE slug = ?', [slug]);
    if (rows.length) {
      res.json({ success: true, data: rows[0] });
    } else {
      res.json({ success: false, message: 'Meta data not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add new meta data
router.post('/metadata', async (req, res) => {
  const { slug, title, description, keywords } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO meta_data (slug, title, description, keywords) VALUES (?, ?, ?, ?)',
      [slug, title, description, keywords]
    );
    res.json({ success: true, data: { id: result.insertId, slug, title, description, keywords } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error or duplicate slug' });
  }
});

// PUT update meta data
router.put('/metadata/:id', async (req, res) => {
  const { id } = req.params;
  const { slug, title, description, keywords } = req.body;
  try {
    await db.query(
      'UPDATE meta_data SET slug = ?, title = ?, description = ?, keywords = ? WHERE id = ?',
      [slug, title, description, keywords, id]
    );
    res.json({ success: true, message: 'Meta data updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE meta data
router.delete('/metadata/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM meta_data WHERE id = ?', [id]);
    res.json({ success: true, message: 'Meta data deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
