const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Update field metrics
router.post('/update-metrics', aiController.updateMetrics);

// Update subfield metrics
router.post('/update-subfield-metrics', aiController.updateSubfieldMetrics);

// Generate new field
router.post('/generate-field', aiController.handleNewField);

// Generate new subfield
router.post('/generate-subfield', aiController.handleNewSubfield);

// Generate insight
router.post('/generate-insight', aiController.handleGenerateInsight);

// Generate subfield insight
router.post('/generate-sub-insight', aiController.handleGenerateSubInsight);

module.exports = router;