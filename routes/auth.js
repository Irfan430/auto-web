const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/login - Login with Facebook credentials or cookies
router.post('/login', authController.login);

// POST /auth/cookies - Login with cookies string
router.post('/cookies', authController.loginWithCookies);

// GET /auth/sessions - Get all active sessions
router.get('/sessions', authController.getSessions);

// DELETE /auth/session/:fbId - Remove specific session
router.delete('/session/:fbId', authController.removeSession);

// POST /auth/validate/:fbId - Validate specific session
router.post('/validate/:fbId', authController.validateSession);

// POST /auth/logout - Logout current session
router.post('/logout', authController.logout);

module.exports = router;