const cleanupService = require('../services/cleanupService');

class CleanupController {
  // Get cleanup statistics
  async getCleanupStats(req, res) {
    try {
      const stats = await cleanupService.getCleanupStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get cleanup stats'
      });
    }
  }
}

module.exports = CleanupController;