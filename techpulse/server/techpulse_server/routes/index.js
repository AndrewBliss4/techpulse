const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Import route modules
const aiRoutes = require('./aiRoutes');
const dbRoutes = require('./dbRoutes');
const scraperRoutes = require('./scraperRoutes');

// Mount route modules with proper prefixes
router.use('/ai', aiRoutes);
router.use('/db', dbRoutes);
router.use('/scraper', scraperRoutes);

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

module.exports = router;