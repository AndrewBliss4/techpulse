const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const path = require('path');
const fs = require('fs');
const constants = require('../config/constants');

// Scraper endpoints
router.get("/arxiv-papers", (req, res) => {
  const filePath = path.join(constants.paths.scrapeDb, "arxiv_papers.json");
  
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return res.status(500).json({ error: "Failed to read JSON file" });
    }
    res.json(JSON.parse(data));
  });
});

router.get("/arxiv-papers-sf", (req, res) => {
  const filePath = path.join(constants.paths.scrapeDb, "arxiv_papers_sf.json");
  
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return res.status(500).json({ error: "Failed to read JSON file" });
    }
    res.json(JSON.parse(data));
  });
});

router.get("/run-scraper", (req, res) => scraperController.runScraper(req, res));
router.get("/run-scraper-sf", (req, res) => scraperController.runSubfieldScraper(req, res));

module.exports = router;