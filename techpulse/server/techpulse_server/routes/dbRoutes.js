const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');

/**
 * Wrapper for async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard success response format
 */
const successResponse = (data, count = null, total = null) => ({
  success: true,
  ...(count !== null && { count }),
  ...(total !== null && { total }),
  data
});

/**
 * Standard error response format
 */
const errorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: error?.message })
  };
  return res.status(statusCode).json(response);
};

// Field Endpoints
router.get('/fields', asyncHandler(async (req, res) => {
  const includeSubfields = req.query.includeSubfields === 'true';
  const fields = includeSubfields 
    ? await dbController.getAllFieldsWithSubfields()
    : await dbController.getAllFields();
    
  res.json(successResponse(fields, fields.length));
}));

router.get('/fields/:id', asyncHandler(async (req, res) => {
  const field = await dbController.getFieldById(req.params.id);
  if (!field) return errorResponse(res, 404, 'Field not found');
  res.json(successResponse(field));
}));

// Subfield Endpoints
router.get('/fields/:fieldId/subfields', asyncHandler(async (req, res) => {
  const subfields = await dbController.getSubfieldsByFieldId(req.params.fieldId);
  res.json(successResponse(subfields, subfields.length));
}));

router.get('/subfields/:id', asyncHandler(async (req, res) => {
  const subfield = await dbController.getSubfieldById(req.params.id);
  if (!subfield) return errorResponse(res, 404, 'Subfield not found');
  res.json(successResponse(subfield));
}));

// Metrics Endpoints
const handleMetricsRequest = async (getMetricsFn, getCountFn, req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const id = req.params.fieldId || req.params.subfieldId;
  
  const [metrics, total] = await Promise.all([
    getMetricsFn(id, limit, offset),
    getCountFn(id)
  ]);
  
  return successResponse(metrics, metrics.length, total);
};

router.get('/metrics/field/:fieldId', asyncHandler(async (req, res) => {
  const response = await handleMetricsRequest(
    dbController.getFieldMetrics,
    dbController.getFieldMetricsCount,
    req,
    res
  );
  res.json(response);
}));

router.get('/metrics/subfield/:subfieldId', asyncHandler(async (req, res) => {
  const response = await handleMetricsRequest(
    dbController.getSubfieldMetrics,
    dbController.getSubfieldMetricsCount,
    req,
    res
  );
  res.json(response);
}));

// Full History Metrics
router.get('/metrics/field/:fieldId/all', asyncHandler(async (req, res) => {
  const metrics = await dbController.getAllFieldMetrics(req.params.fieldId);
  res.json(successResponse(metrics, metrics.length));
}));

router.get('/metrics/subfield/:subfieldId/all', asyncHandler(async (req, res) => {
  const metrics = await dbController.getAllSubfieldMetrics(req.params.subfieldId);
  res.json(successResponse(metrics, metrics.length));
}));

// Radar Data Endpoint
router.get('/radar-data', asyncHandler(async (req, res) => {
  const fieldId = req.query.fieldId ? parseInt(req.query.fieldId) : null;
  const radarData = await dbController.getRadarData(fieldId);
  res.json(successResponse(radarData, radarData.length));
}));

// Insights Endpoints
router.get('/insights', asyncHandler(async (req, res) => {
  const fieldId = req.query.fieldId;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  
  const [insights, total] = fieldId
    ? await Promise.all([
        dbController.getInsightsByField(fieldId, limit, offset),
        dbController.getInsightsCountByField(fieldId)
      ])
    : await Promise.all([
        dbController.getAllInsights(limit, offset),
        dbController.getAllInsightsCount()
      ]);
  
  res.json(successResponse(insights, insights.length, total));
}));

// Feedback Endpoints
router.post('/feedback', asyncHandler(async (req, res) => {
  const { insight_id, feedback_text, rating } = req.body;
  const feedback = await dbController.createFeedback(insight_id, feedback_text, rating);
  res.status(201).json(successResponse(feedback));
}));

// Model Parameters Endpoints
router.get('/model-parameters', asyncHandler(async (req, res) => {
  const parameters = await dbController.getModelParameters();
  res.json(successResponse(parameters, parameters.length));
}));

router.put('/model-parameters', asyncHandler(async (req, res) => {
  const { temperature, top_p, parameter_id } = req.body;
  const updated = await dbController.updateModelParameters(parameter_id, temperature, top_p);
  res.json(successResponse(updated));
}));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  errorResponse(res, 500, 'Internal server error', err);
});

module.exports = router;