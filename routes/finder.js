
// finder.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Recursive search
function readDir(dir, keyword, mask, results) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);

    try {
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        readDir(fullPath, keyword, mask, results);
      } else {
        if (mask && !new RegExp(mask, "i").test(file)) {
          return;
        }
        const data = fs.readFileSync(fullPath, "utf8");
        const regex = new RegExp(keyword, "gi");
        let match;
        while ((match = regex.exec(data)) !== null) {
          results.push({
            file: fullPath,
            snippet: data.substring(Math.max(0, match.index - 20), match.index + 50)
          });
        }
      }
    } catch (err) {
      console.error("Error reading", fullPath, err);
    }
  });
}

// GET /finder?s=keyword&mask=.js$
router.get("/", (req, res) => {
  const { s, mask } = req.query;
  if (!s) {
    return res.send(`
      <form method="get">
        <label>What: <input type="text" name="s" /></label><br>
        <label>Mask: <input type="text" name="mask" value=".js$" /></label><br>
        <input type="submit" value="Send" />
      </form>
    `);
  }

  const results = [];
  const startDir = process.cwd();
  readDir(startDir, s, mask || ".js$", results);

  let output = results
    .map(r => `<div><b>${r.file}</b><br>${r.snippet}</div>`)
    .join("<hr>");

  res.send(`<h2>Search results for "${s}"</h2>${output}`);
});

module.exports = router;
