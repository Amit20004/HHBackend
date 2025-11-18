const express = require('express');
const router = express.Router();
const db = require('../db.js');

// CREATE or UPDATE page content
// =========================
router.post('/save-content', async (req, res) => {
    try {
        const { slug, content } = req.body;

        if (!slug || !content) {
            return res.status(400).json({ error: 'Slug and content are required.' });
        }

        // Check if slug exists
        const [rows] = await db.query('SELECT id FROM pages WHERE slug = ?', [slug]);

        if (rows.length > 0) {
            // Update existing page
            await db.query('UPDATE pages SET content = ? WHERE slug = ?', [content, slug]);
            res.json({ message: 'Page updated successfully.' });
        } else {
            // Insert new page
            await db.query('INSERT INTO pages (slug, content) VALUES (?, ?)', [slug, content]);
            res.json({ message: 'Page created successfully.' });
        }
    } catch (err) {
        console.error('Error saving page content:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// =========================
// GET page content by slug
// =========================
router.get('/get-content', async (req, res) => {
    try {

        const [rows] = await db.query('SELECT content FROM pages');

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Page not found.' });
        }

        res.json({data: rows });
    } catch (err) {
        console.error('Error fetching page content:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/get-content/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const [rows] = await db.query('SELECT * FROM pages WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Page not found.' });
        }

        res.json({ slug,  content: rows[0].content, title:rows[0].title });
    } catch (err) {
        console.error('Error fetching page content:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// =========================
// UPDATE page content by slug
// =========================
router.put('/update-content/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required.' });
        }

        // Check if page exists
        const [rows] = await db.query('SELECT id FROM pages WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Page not found.' });
        }

        // Update the page content
        await db.query('UPDATE pages SET content = ? WHERE slug = ?', [content, slug]);
        res.json({ message: 'Page content updated successfully.' });

    } catch (err) {
        console.error('Error updating page content:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// =========================
// DELETE page by slug
// =========================
router.delete('/delete-content/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // Check if page exists
        const [rows] = await db.query('SELECT id FROM pages WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Page not found.' });
        }

        // Delete the page
        await db.query('DELETE FROM pages WHERE slug = ?', [slug]);
        res.json({ message: 'Page deleted successfully.' });

    } catch (err) {
        console.error('Error deleting page:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// =========================
// GET all pages (with id included)
// =========================
router.get('/all-pages', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, slug, content FROM pages');
        res.json({ pages: rows });
    } catch (err) {
        console.error('Error fetching all pages:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;