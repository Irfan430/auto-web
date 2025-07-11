const fbService = require('../services/fbService');
const { getConfig, updateConfig } = require('../config/db');

class DashboardController {
  // Render main dashboard page
  async getDashboard(req, res) {
    try {
      // Get session data
      const sessions = await fbService.getSessions();
      const config = getConfig();

      // Prepare dashboard data
      const dashboardData = {
        title: 'Facebook Auto Tool Dashboard',
        isAuthenticated: req.session && req.session.isAuthenticated,
        currentUser: req.session && req.session.fbId ? 
          req.session.fbId.substring(0, 8) + '...' : null,
        sessionsCount: sessions.length,
        mongoEnabled: config.useMongoDB,
        sessions: sessions.map(session => ({
          fbId: session.fbId.substring(0, 8) + '...',
          timestamp: session.timestamp,
          method: session.method || 'manual',
          serialNumber: session.serialNumber
        }))
      };

      return res.render('dashboard', dashboardData);

    } catch (error) {
      console.error('Dashboard error:', error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load dashboard',
        error: error.message
      });
    }
  }

  // Get sessions data (JSON endpoint)
  async getSessionsData(req, res) {
    try {
      const sessions = await fbService.getSessions();
      
      const sessionsData = sessions.map(session => ({
        fbId: session.fbId.substring(0, 8) + '...',
        fullFbId: session.fbId, // Hidden for management purposes
        timestamp: session.timestamp,
        method: session.method || 'manual',
        serialNumber: session.serialNumber,
        isActive: true
      }));

      return res.json({
        success: true,
        sessions: sessionsData,
        count: sessionsData.length
      });

    } catch (error) {
      console.error('Get sessions data error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get configuration
  async getConfig(req, res) {
    try {
      const config = getConfig();
      
      // Return sanitized config (without sensitive data)
      const sanitizedConfig = {
        useMongoDB: config.useMongoDB,
        maxConcurrentActions: config.maxConcurrentActions || 5,
        actionDelay: config.actionDelay || 2000,
        cookieValidationInterval: config.cookieValidationInterval || 3600000
      };

      return res.json({
        success: true,
        config: sanitizedConfig
      });

    } catch (error) {
      console.error('Get config error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update configuration
  async updateConfig(req, res) {
    try {
      const { useMongoDB, maxConcurrentActions, actionDelay, cookieValidationInterval } = req.body;

      // Validate input
      const newConfig = {};
      
      if (typeof useMongoDB === 'boolean') {
        newConfig.useMongoDB = useMongoDB;
      }
      
      if (maxConcurrentActions && Number.isInteger(maxConcurrentActions) && maxConcurrentActions > 0) {
        newConfig.maxConcurrentActions = maxConcurrentActions;
      }
      
      if (actionDelay && Number.isInteger(actionDelay) && actionDelay >= 1000) {
        newConfig.actionDelay = actionDelay;
      }
      
      if (cookieValidationInterval && Number.isInteger(cookieValidationInterval) && cookieValidationInterval >= 60000) {
        newConfig.cookieValidationInterval = cookieValidationInterval;
      }

      if (Object.keys(newConfig).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid configuration updates provided'
        });
      }

      // Update configuration
      const success = updateConfig(newConfig);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update configuration'
        });
      }

      console.log(`⚙️ Configuration updated:`, newConfig);

      return res.json({
        success: true,
        message: 'Configuration updated successfully',
        updatedConfig: newConfig
      });

    } catch (error) {
      console.error('Update config error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const sessions = await fbService.getSessions();
      const config = getConfig();

      const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.isActive !== false).length,
        mongoEnabled: config.useMongoDB,
        recentSessions: sessions
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5)
          .map(session => ({
            fbId: session.fbId.substring(0, 8) + '...',
            timestamp: session.timestamp,
            method: session.method || 'manual'
          }))
      };

      return res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();