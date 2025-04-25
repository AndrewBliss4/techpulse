const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Update field metrics
router.post('/update-metrics', (req, res) => aiController.updateMetrics(req, res));


// Update subfield metrics
router.post('/update-subfield-metrics', (req, res) => aiController.updateSubfieldMetrics(req, res));

// Generate new field
router.post('/generate-field', (req, res) => aiController.handleNewField(req, res));

// Generate new subfield
router.post('/generate-subfield', (req, res) => aiController.handleNewSubfield(req, res));

// Generate insight
router.post('/generate-insight', (req, res) => aiController.handleGenerateInsight(req, res));

// Generate subfield insight
router.post('/generate-sub-insight', (req, res) => aiController.handleGenerateSubInsight(req, res));

module.exports = router;