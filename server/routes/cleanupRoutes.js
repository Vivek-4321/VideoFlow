const express = require('express');

const router = express.Router();

// Setup cleanup routes with controller instance
const setupCleanupRoutes = (cleanupController) => {
  // Get cleanup statistics
  router.get('/stats', cleanupController.getCleanupStats.bind(cleanupController));

  return router;
};

module.exports = setupCleanupRoutes;