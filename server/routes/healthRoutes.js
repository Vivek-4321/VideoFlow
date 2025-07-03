const express = require('express');

const router = express.Router();

// Setup health routes with controller instance
const setupHealthRoutes = (healthController) => {
  // Health check endpoint
  router.get('/', healthController.getHealthStatus.bind(healthController));

  return router;
};

module.exports = setupHealthRoutes;