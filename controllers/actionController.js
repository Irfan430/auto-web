const { v4: uuidv4 } = require('uuid');
const fbService = require('../services/fbService');

class ActionController {
  constructor() {
    // In-memory action history (in production, use database)
    this.actionHistory = [];
  }

  // Perform Facebook action
  async performAction(req, res) {
    try {
      const { targetUrl, action, comment } = req.body;

      // Validate input
      if (!targetUrl || !action) {
        return res.status(400).json({
          success: false,
          error: 'Target URL and action are required'
        });
      }

      // Validate action type
      const validActions = ['like', 'love', 'haha', 'sad', 'angry', 'wow', 'follow', 'comment'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: `Invalid action. Valid actions: ${validActions.join(', ')}`
        });
      }

      // Validate comment if action is comment
      if (action === 'comment' && (!comment || comment.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'Comment text is required for comment action'
        });
      }

      // Validate URL format
      if (!this.isValidFacebookUrl(targetUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Facebook URL format'
        });
      }

      const actionId = uuidv4();
      console.log(`🎬 Starting action ${actionId}: ${action} on ${targetUrl}`);

      // Perform the action
      const results = await fbService.performAction(targetUrl, action, comment);

      // Log action to history
      const actionRecord = {
        id: actionId,
        timestamp: new Date().toISOString(),
        action,
        targetUrl,
        comment: action === 'comment' ? comment : undefined,
        results,
        totalAccounts: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      };

      this.actionHistory.unshift(actionRecord);
      
      // Keep only last 100 actions in memory
      if (this.actionHistory.length > 100) {
        this.actionHistory = this.actionHistory.slice(0, 100);
      }

      console.log(`✅ Action ${actionId} completed: ${actionRecord.successCount}/${actionRecord.totalAccounts} successful`);

      return res.json({
        success: true,
        actionId,
        message: `Action completed successfully`,
        results: {
          total: results.length,
          successful: actionRecord.successCount,
          failed: actionRecord.failureCount,
          details: results.map(r => ({
            fbId: r.fbId ? r.fbId.substring(0, 8) + '...' : 'unknown',
            success: r.success,
            error: r.error || null
          }))
        }
      });

    } catch (error) {
      console.error('Perform action error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get action history
  async getActionHistory(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      
      const history = this.actionHistory.slice(startIndex, endIndex).map(action => ({
        id: action.id,
        timestamp: action.timestamp,
        action: action.action,
        targetUrl: action.targetUrl,
        totalAccounts: action.totalAccounts,
        successCount: action.successCount,
        failureCount: action.failureCount,
        comment: action.comment
      }));

      return res.json({
        success: true,
        history,
        pagination: {
          total: this.actionHistory.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < this.actionHistory.length
        }
      });

    } catch (error) {
      console.error('Get action history error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Perform bulk actions
  async performBulkActions(req, res) {
    try {
      const { actions } = req.body;

      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Actions array is required and must not be empty'
        });
      }

      if (actions.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 actions allowed per bulk request'
        });
      }

      const bulkId = uuidv4();
      console.log(`📦 Starting bulk action ${bulkId} with ${actions.length} actions`);

      const results = [];

      for (let i = 0; i < actions.length; i++) {
        const { targetUrl, action, comment } = actions[i];

        try {
          // Validate each action
          if (!targetUrl || !action) {
            results.push({
              index: i,
              success: false,
              error: 'Target URL and action are required'
            });
            continue;
          }

          if (!this.isValidFacebookUrl(targetUrl)) {
            results.push({
              index: i,
              success: false,
              error: 'Invalid Facebook URL format'
            });
            continue;
          }

          // Perform action
          const actionResults = await fbService.performAction(targetUrl, action, comment);
          
          results.push({
            index: i,
            success: true,
            targetUrl,
            action,
            results: actionResults
          });

          // Delay between bulk actions
          if (i < actions.length - 1) {
            await this.delay(3000);
          }

        } catch (error) {
          results.push({
            index: i,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`✅ Bulk action ${bulkId} completed`);

      return res.json({
        success: true,
        bulkId,
        message: 'Bulk actions completed',
        results
      });

    } catch (error) {
      console.error('Perform bulk actions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get action statistics
  async getActionStats(req, res) {
    try {
      const { period = '24h' } = req.query;
      
      let cutoffTime;
      switch (period) {
        case '1h':
          cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const filteredHistory = this.actionHistory.filter(action => 
        new Date(action.timestamp) >= cutoffTime
      );

      const stats = {
        period,
        totalActions: filteredHistory.length,
        totalSuccessful: filteredHistory.reduce((sum, action) => sum + action.successCount, 0),
        totalFailed: filteredHistory.reduce((sum, action) => sum + action.failureCount, 0),
        actionTypes: {},
        recentActions: filteredHistory.slice(0, 5).map(action => ({
          id: action.id,
          timestamp: action.timestamp,
          action: action.action,
          successCount: action.successCount,
          failureCount: action.failureCount
        }))
      };

      // Count by action type
      filteredHistory.forEach(action => {
        if (!stats.actionTypes[action.action]) {
          stats.actionTypes[action.action] = 0;
        }
        stats.actionTypes[action.action]++;
      });

      return res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get action stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper method to validate Facebook URL
  isValidFacebookUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const validDomains = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'];
      return validDomains.includes(parsedUrl.hostname.toLowerCase());
    } catch (error) {
      return false;
    }
  }

  // Helper delay function
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ActionController();