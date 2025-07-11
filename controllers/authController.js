const { v4: uuidv4 } = require('uuid');
const fbService = require('../services/fbService');

class AuthController {
  // Login with Facebook credentials or cookies
  async login(req, res) {
    try {
      const { email, password, cookies, loginMethod } = req.body;

      if (!email && !cookies) {
        return res.status(400).json({
          success: false,
          error: 'Email/password or cookies string is required'
        });
      }

      let result;

      if (loginMethod === 'credentials' && email && password) {
        // Login with Puppeteer
        console.log(`🔐 Attempting login with credentials for: ${email}`);
        result = await fbService.loginWithCredentials(email, password);
        
        if (result.success) {
          // Save session
          await fbService.saveSession(result.fbId, result.cookies, 'puppeteer');
          
          // Set session cookie
          req.session.fbId = result.fbId;
          req.session.isAuthenticated = true;
          
          console.log(`✅ Login successful for FB ID: ${result.fbId.substring(0, 8)}...`);
          
          return res.json({
            success: true,
            message: 'Login successful',
            fbId: result.fbId.substring(0, 8) + '...',
            method: 'puppeteer',
            redirectUrl: '/dashboard'
          });
        }
      } else if (cookies) {
        // Login with cookies string
        console.log(`🍪 Attempting login with cookies`);
        
        // Extract FB ID from cookies (simplified)
        const fbId = this.extractFbIdFromCookies(cookies) || `manual_${Date.now()}`;
        
        // Save session
        await fbService.saveSession(fbId, cookies, 'manual');
        
        // Set session cookie
        req.session.fbId = fbId;
        req.session.isAuthenticated = true;
        
        console.log(`✅ Cookies login successful for FB ID: ${fbId.substring(0, 8)}...`);
        
        return res.json({
          success: true,
          message: 'Cookies login successful',
          fbId: fbId.substring(0, 8) + '...',
          method: 'manual',
          redirectUrl: '/dashboard'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid login method or missing parameters'
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Login with cookies string (alternative endpoint)
  async loginWithCookies(req, res) {
    try {
      const { cookies, fbId } = req.body;

      if (!cookies) {
        return res.status(400).json({
          success: false,
          error: 'Cookies string is required'
        });
      }

      const extractedFbId = fbId || this.extractFbIdFromCookies(cookies) || `manual_${Date.now()}`;
      
      // Save session
      await fbService.saveSession(extractedFbId, cookies, 'manual');
      
      // Set session cookie
      req.session.fbId = extractedFbId;
      req.session.isAuthenticated = true;
      
      console.log(`✅ Cookies login successful for FB ID: ${extractedFbId.substring(0, 8)}...`);
      
      return res.json({
        success: true,
        message: 'Cookies login successful',
        fbId: extractedFbId.substring(0, 8) + '...',
        sessionId: req.sessionID
      });

    } catch (error) {
      console.error('Cookies login error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all active sessions
  async getSessions(req, res) {
    try {
      const sessions = await fbService.getSessions();
      
      // Return sanitized session data
      const sanitizedSessions = sessions.map(session => ({
        fbId: session.fbId.substring(0, 8) + '...',
        timestamp: session.timestamp,
        serialNumber: session.serialNumber,
        method: session.method || 'manual',
        isActive: true
      }));

      return res.json({
        success: true,
        sessions: sanitizedSessions,
        count: sanitizedSessions.length
      });

    } catch (error) {
      console.error('Get sessions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Remove specific session
  async removeSession(req, res) {
    try {
      const { fbId } = req.params;

      if (!fbId) {
        return res.status(400).json({
          success: false,
          error: 'Facebook ID is required'
        });
      }

      await fbService.removeSession(fbId);
      
      // If removing current session, clear session data
      if (req.session.fbId === fbId) {
        req.session.destroy();
      }

      console.log(`🗑️ Session removed: ${fbId.substring(0, 8)}...`);

      return res.json({
        success: true,
        message: 'Session removed successfully'
      });

    } catch (error) {
      console.error('Remove session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Validate specific session
  async validateSession(req, res) {
    try {
      const { fbId } = req.params;

      if (!fbId) {
        return res.status(400).json({
          success: false,
          error: 'Facebook ID is required'
        });
      }

      const isValid = await fbService.validateSession(fbId);

      console.log(`🔍 Session validation for ${fbId.substring(0, 8)}...: ${isValid ? 'Valid' : 'Invalid'}`);

      return res.json({
        success: true,
        isValid,
        fbId: fbId.substring(0, 8) + '...'
      });

    } catch (error) {
      console.error('Validate session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Logout current session
  async logout(req, res) {
    try {
      const fbId = req.session.fbId;
      
      if (fbId) {
        console.log(`👋 Logout for FB ID: ${fbId.substring(0, 8)}...`);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({
            success: false,
            error: 'Logout failed'
          });
        }

        res.clearCookie('connect.sid');
        return res.json({
          success: true,
          message: 'Logout successful'
        });
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper method to extract FB ID from cookies
  extractFbIdFromCookies(cookiesString) {
    try {
      // Look for c_user cookie which contains FB user ID
      const cookies = cookiesString.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'c_user' && value) {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting FB ID from cookies:', error);
      return null;
    }
  }
}

module.exports = new AuthController();