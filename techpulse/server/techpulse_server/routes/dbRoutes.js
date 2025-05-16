const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');

// Field Endpoints
router.get('/fields', async (req, res) => {
  try {
    const includeSubfields = req.query.includeSubfields === 'true';
    let fields;

    if (includeSubfields) {
      fields = await dbController.getAllFieldsWithSubfields();
    } else {
      fields = await dbController.getAllFields();
    }

    res.json({
      success: true,
      count: fields.length,
      data: fields
    });
  } catch (error) {
    console.error('GET /fields error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve fields'
    });
  }
});

router.get('/fields/:id', async (req, res) => {
  try {
    const field = await dbController.getFieldById(req.params.id);
    res.json({
      success: true,
      data: field
    });
  } catch (error) {
    if (error.message === 'Field not found') {
      return res.status(404).json({
        success: false,
        error: 'Field not found'
      });
    }
    console.error(`GET /fields/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve field'
    });
  }
});

// Subfield Endpoints
router.get('/fields/:fieldId/subfields', async (req, res) => {
  try {
    console.log("_____________________________")
    console.log(req.params.fieldId)
    console.log("_____________________________")

    const subfields = await dbController.getSubfieldsByFieldId(req.params.fieldId);
    res.json({
      success: true,
      count: subfields.length,
      data: subfields
    });
  } catch (error) {
    console.error(`GET /fields/${req.params.fieldId}/subfields error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subfields'
    });
  }
});

router.get('/subfields/:id', async (req, res) => {
  try {
    const subfield = await dbController.getSubfieldById(req.params.id);
    res.json({
      success: true,
      data: subfield
    });
  } catch (error) {
    if (error.message === 'Subfield not found') {
      return res.status(404).json({
        success: false,
        error: 'Subfield not found'
      });
    }
    console.error(`GET /subfields/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subfield'
    });
  }
});

// Metrics Endpoints
router.get('/metrics/field/:fieldId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const metrics = await dbController.getFieldMetrics(req.params.fieldId, limit, offset);
    const total = await dbController.getFieldMetricsCount(req.params.fieldId);

    res.json({
      success: true,
      count: metrics.length,
      total,
      data: metrics
    });
  } catch (error) {
    console.error(`GET /metrics/field/${req.params.fieldId} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve field metrics'
    });
  }
});

router.get('/metrics/subfield/:subfieldId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const metrics = await dbController.getSubfieldMetrics(req.params.subfieldId, limit, offset);
    const total = await dbController.getSubfieldMetricsCount(req.params.subfieldId);

    res.json({
      success: true,
      count: metrics.length,
      total,
      data: metrics
    });
  } catch (error) {
    console.error(`GET /metrics/subfield/${req.params.subfieldId} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subfield metrics'
    });
  }
});
// Radar Data Endpoint
router.get('/radar-data', async (req, res) => {
  try {
    const fieldId = req.query.fieldId ? parseInt(req.query.fieldId) : null;
    const radarData = await dbController.getRadarData(fieldId);
    res.json({
      success: true,
      count: radarData.length,
      data: radarData
    });
  } catch (error) {
    console.error('GET /radar-data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve radar data'
    });
  }
});

// Insights Endpoints
router.get('/insights', async (req, res) => {
  try {
    const fieldId = req.query.fieldId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    let insights, total;

    if (fieldId) {
      insights = await dbController.getInsightsByField(fieldId, limit, offset);
      total = await dbController.getInsightsCountByField(fieldId);
    } else {
      insights = await dbController.getAllInsights(limit, offset);
      total = await dbController.getAllInsightsCount();
    }

    res.json({
      success: true,
      count: insights.length,
      total,
      data: insights
    });
  } catch (error) {
    console.error('GET /insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve insights'
    });
  }
});

// Feedback Endpoints
router.post('/feedback', async (req, res) => {
  try {
    const { insight_id, feedback_text, rating } = req.body;
    const feedback = await dbController.createFeedback(insight_id, feedback_text, rating);

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('POST /feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

// Model Parameters Endpoints
router.get('/model-parameters', async (req, res) => {
  try {
    const parameters = await dbController.getModelParameters();
    res.json({
      success: true,
      count: parameters.length,
      data: parameters
    });
  } catch (error) {
    console.error('GET /model-parameters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model parameters'
    });
  }
});

router.put('/model-parameters', async (req, res) => {
  try {
    const { temperature, top_p, parameter_id } = req.body;
    const updated = await dbController.updateModelParameters(parameter_id, temperature, top_p);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('PUT /model-parameters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model parameters'
    });
  }
});

module.exports = router;
