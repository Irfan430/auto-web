const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /dashboard - Main dashboard page
router.get('/', dashboardController.getDashboard);

// GET /dashboard/sessions - Get sessions for dashboard
router.get('/sessions', dashboardController.getSessionsData);

// GET /dashboard/config - Get configuration
router.get('/config', dashboardController.getConfig);

// POST /dashboard/config - Update configuration
router.post('/config', dashboardController.updateConfig);

module.exports = router;