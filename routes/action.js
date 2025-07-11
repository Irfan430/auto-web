const express = require('express');
const router = express.Router();
const actionController = require('../controllers/actionController');

// POST /action/perform - Perform Facebook action
router.post('/perform', actionController.performAction);

// GET /action/history - Get action history
router.get('/history', actionController.getActionHistory);

// POST /action/bulk - Perform bulk actions
router.post('/bulk', actionController.performBulkActions);

// GET /action/stats - Get action statistics
router.get('/stats', actionController.getActionStats);

module.exports = router;