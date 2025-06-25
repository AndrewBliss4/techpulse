const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const path = require('path');
const fs = require('fs').promises; // Using promises version for better async handling
const constants = require('../config/constants');

/**
 * Helper function to read and send JSON file
 * @param {string} filename - Name of the JSON file to read
 * @param {object} res - Express response object
 */
const sendJsonFile = async (filename, res) => {
  try {
    const filePath = path.join(constants.paths.scrapeDb, filename);
    const data = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    res.status(500).json({ 
      error: 'Failed to load data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Scraper endpoints
router.get("/arxiv-papers", async (req, res) => {
  await sendJsonFile("arxiv_papers.json", res);
});

router.get("/arxiv-papers-sf", async (req, res) => {
  await sendJsonFile("arxiv_papers_sf.json", res);
});

router.get("/run-scraper", (req, res, next) => 
  scraperController.runScraper(req, res).catch(next));
  
router.get("/run-scraper-sf", (req, res, next) => 
  scraperController.runSubfieldScraper(req, res).catch(next));

module.exports = router;