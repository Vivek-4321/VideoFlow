const express = require('express');
const { authenticate } = require('../middleware/auth');
const { trackUsage, conditionalRateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

// Setup job routes with controller instance
const setupJobRoutes = (jobController) => {
  // Create a new transcoding job
  router.post('/', trackUsage, authenticate, conditionalRateLimit, jobController.createJob.bind(jobController));

  // Get job details by ID with expiration handling
  router.get('/:id', trackUsage, authenticate, jobController.getJobById.bind(jobController));

  // List jobs for authenticated user
  router.get('/', trackUsage, authenticate, jobController.getJobsForUser.bind(jobController));

  // List jobs by userId (for admin/internal use)
  router.get('/user/:userId', trackUsage, authenticate, jobController.getJobsByUserId.bind(jobController));

  // Cancel job
  router.delete('/:id', trackUsage, authenticate, jobController.cancelJob.bind(jobController));

  return router;
};

module.exports = setupJobRoutes;