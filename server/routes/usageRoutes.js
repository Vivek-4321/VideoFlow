const express = require('express');
const { authenticate } = require('../middleware/auth');
const { trackUsage } = require('../middleware/rateLimiter');
const apiKeyController = require('../controllers/apiKeyController');

const router = express.Router();

// Usage statistics routes
router.get('/stats', trackUsage, authenticate, apiKeyController.getUsageStats);

module.exports = router;