const express = require('express');
const { authenticate } = require('../middleware/auth');
const { trackUsage } = require('../middleware/rateLimiter');
const apiKeyController = require('../controllers/apiKeyController');

const router = express.Router();

// API Key management routes
router.post('/', trackUsage, authenticate, apiKeyController.createApiKey);
router.get('/', trackUsage, authenticate, apiKeyController.getUserApiKeys);
router.delete('/:keyId', trackUsage, authenticate, apiKeyController.deleteApiKey);
router.post('/:keyId/regenerate', trackUsage, authenticate, apiKeyController.regenerateApiKey);

module.exports = router;