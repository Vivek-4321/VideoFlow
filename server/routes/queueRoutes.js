const express = require('express');

const router = express.Router();

// Setup queue routes with controller instance
const setupQueueRoutes = (queueController) => {
  // Get queue status
  router.get('/status', queueController.getQueueStatus.bind(queueController));

  return router;
};

module.exports = setupQueueRoutes;