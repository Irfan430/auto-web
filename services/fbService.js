const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isMongoEnabled } = require('../config/db');

// Conditionally load User model only if MongoDB is enabled
let User = null;
try {
  if (require('../config/config.json').useMongoDB) {
    User = require('../models/User');
  }
} catch (error) {
  console.log('📄 MongoDB model not loaded (using file-based storage)');
}

class FacebookService {
  constructor() {
    this.browser = null;
    this.cookiesPath = path.join(__dirname, '..', 'data', 'cookies.json');
  }

  // Initialize browser instance
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Login with Facebook credentials using Puppeteer
  async loginWithCredentials(email, password) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to Facebook login
      await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
      
      // Wait for login form
      await page.waitForSelector('#email');
      
      // Fill credentials
      await page.type('#email', email);
      await page.type('#pass', password);
      
      // Click login button
      await page.click('[name="login"]');
      
      // Wait for navigation or error
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
        throw new Error('Login failed - invalid credentials or checkpoint required');
      }
      
      // Extract cookies
      const cookies = await page.cookies();
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      // Extract Facebook ID from page
      const fbId = await this.extractFacebookId(page);
      
      await page.close();
      
      return {
        success: true,
        fbId,
        cookies: cookieString,
        method: 'puppeteer'
      };
      
    } catch (error) {
      await page.close();
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Extract Facebook ID from page
  async extractFacebookId(page) {
    try {
      // Try multiple methods to extract FB ID
      const fbId = await page.evaluate(() => {
        // Method 1: From page source
        const pageSource = document.documentElement.outerHTML;
        const match1 = pageSource.match(/"USER_ID":"(\d+)"/);
        if (match1) return match1[1];
        
        // Method 2: From profile link
        const profileLink = document.querySelector('a[href*="/profile.php?id="]');
        if (profileLink) {
          const href = profileLink.href;
          const match2 = href.match(/id=(\d+)/);
          if (match2) return match2[1];
        }
        
        // Method 3: From data attributes
        const dataElement = document.querySelector('[data-gt*="user_id"]');
        if (dataElement) {
          const dataGt = dataElement.getAttribute('data-gt');
          const match3 = dataGt.match(/"user_id":"(\d+)"/);
          if (match3) return match3[1];
        }
        
        return null;
      });
      
      return fbId || `temp_${Date.now()}`;
    } catch (error) {
      console.error('Error extracting FB ID:', error);
      return `temp_${Date.now()}`;
    }
  }

  // Save session to storage
  async saveSession(fbId, cookies, method = 'manual') {
    const sessionData = {
      fbId,
      cookies,
      timestamp: new Date().toISOString(),
      serialNumber: `FB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method
    };

    if (isMongoEnabled()) {
      // Save to MongoDB
      try {
        const user = new User({
          fbId,
          cookies,
          loginMethod: method,
          serialNumber: sessionData.serialNumber
        });
        await user.save();
        console.log(`✅ Session saved to MongoDB for FB ID: ${fbId.substring(0, 8)}...`);
      } catch (error) {
        console.error('Error saving to MongoDB:', error);
        // Fallback to file storage
        await this.saveToFile(sessionData);
      }
    } else {
      // Save to file
      await this.saveToFile(sessionData);
    }

    return sessionData;
  }

  // Save to file storage
  async saveToFile(sessionData) {
    try {
      let sessions = [];
      if (fs.existsSync(this.cookiesPath)) {
        const fileContent = fs.readFileSync(this.cookiesPath, 'utf8');
        sessions = JSON.parse(fileContent);
      }

      // Remove existing session with same FB ID
      sessions = sessions.filter(session => session.fbId !== sessionData.fbId);
      
      // Add new session
      sessions.push(sessionData);
      
      fs.writeFileSync(this.cookiesPath, JSON.stringify(sessions, null, 2));
      console.log(`✅ Session saved to file for FB ID: ${sessionData.fbId.substring(0, 8)}...`);
    } catch (error) {
      console.error('Error saving to file:', error);
      throw error;
    }
  }

  // Get all active sessions
  async getSessions() {
    if (isMongoEnabled()) {
      try {
        const users = await User.findActiveUsers();
        return users.map(user => ({
          fbId: user.fbId,
          cookies: user.cookies,
          timestamp: user.timestamp.toISOString(),
          serialNumber: user.serialNumber,
          method: user.loginMethod
        }));
      } catch (error) {
        console.error('Error loading from MongoDB:', error);
      }
    }

    // Load from file
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const fileContent = fs.readFileSync(this.cookiesPath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
    
    return [];
  }

  // Remove invalid session
  async removeSession(fbId) {
    if (isMongoEnabled()) {
      try {
        await User.findOneAndUpdate({ fbId }, { isActive: false });
        console.log(`🗑️ Removed invalid session from MongoDB: ${fbId.substring(0, 8)}...`);
        return;
      } catch (error) {
        console.error('Error removing from MongoDB:', error);
      }
    }

    // Remove from file
    try {
      let sessions = await this.getSessions();
      sessions = sessions.filter(session => session.fbId !== fbId);
      fs.writeFileSync(this.cookiesPath, JSON.stringify(sessions, null, 2));
      console.log(`🗑️ Removed invalid session: ${fbId.substring(0, 8)}...`);
    } catch (error) {
      console.error('Error removing session:', error);
    }
  }

  // Perform Facebook action
  async performAction(targetUrl, action, comment = '') {
    const sessions = await this.getSessions();
    if (sessions.length === 0) {
      throw new Error('No active sessions available');
    }

    const results = [];
    const browser = await this.initBrowser();

    for (const session of sessions) {
      try {
        const result = await this.performSingleAction(browser, session, targetUrl, action, comment);
        results.push(result);
        
        // Update session usage
        if (isMongoEnabled()) {
          await User.findOneAndUpdate(
            { fbId: session.fbId },
            { lastUsed: new Date(), $inc: { totalActions: 1 } }
          );
        }
        
        // Log action
        console.log(`✅ Action completed: ${action} by ${session.fbId.substring(0, 8)}... on ${targetUrl}`);
        
        // Delay between actions
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Action failed for ${session.fbId.substring(0, 8)}...:`, error.message);
        
        // If session is invalid, remove it
        if (error.message.includes('login') || error.message.includes('invalid')) {
          await this.removeSession(session.fbId);
        }
        
        results.push({
          fbId: session.fbId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Perform single action with specific session
  async performSingleAction(browser, session, targetUrl, action, comment) {
    const page = await browser.newPage();
    
    try {
      // Set cookies
      await this.setCookies(page, session.cookies);
      
      // Navigate to target URL
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      
      // Check if logged in
      const isLoggedIn = await this.checkIfLoggedIn(page);
      if (!isLoggedIn) {
        throw new Error('Session invalid - not logged in');
      }
      
      let result = { fbId: session.fbId, success: false };
      
      switch (action) {
        case 'like':
          result = await this.performReaction(page, 'like', session.fbId);
          break;
        case 'love':
          result = await this.performReaction(page, 'love', session.fbId);
          break;
        case 'haha':
          result = await this.performReaction(page, 'haha', session.fbId);
          break;
        case 'sad':
          result = await this.performReaction(page, 'sad', session.fbId);
          break;
        case 'angry':
          result = await this.performReaction(page, 'angry', session.fbId);
          break;
        case 'wow':
          result = await this.performReaction(page, 'wow', session.fbId);
          break;
        case 'follow':
          result = await this.performFollow(page, session.fbId);
          break;
        case 'comment':
          result = await this.performComment(page, comment, session.fbId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      await page.close();
      return result;
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  // Set cookies on page
  async setCookies(page, cookieString) {
    const cookies = cookieString.split('; ').map(cookie => {
      const [name, value] = cookie.split('=');
      return {
        name: name.trim(),
        value: value ? value.trim() : '',
        domain: '.facebook.com'
      };
    });
    
    await page.setCookie(...cookies);
  }

  // Check if user is logged in
  async checkIfLoggedIn(page) {
    try {
      // Look for login indicators
      await page.waitForSelector('[data-testid="fb-logo"]', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Perform reaction
  async performReaction(page, reactionType, fbId) {
    try {
      // Look for like button
      const likeButton = await page.$('[data-testid="like"], [aria-label*="Like"], [aria-label*="React"]');
      
      if (!likeButton) {
        throw new Error('Like button not found');
      }
      
      if (reactionType === 'like') {
        await likeButton.click();
      } else {
        // For other reactions, hover and select
        await likeButton.hover();
        await this.delay(1000);
        
        const reactionSelector = `[data-testid="${reactionType}"], [aria-label*="${reactionType}"]`;
        await page.waitForSelector(reactionSelector, { timeout: 5000 });
        await page.click(reactionSelector);
      }
      
      await this.delay(2000);
      
      return {
        fbId,
        success: true,
        action: reactionType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to perform ${reactionType}: ${error.message}`);
    }
  }

  // Perform follow action
  async performFollow(page, fbId) {
    try {
      // Look for follow button
      const followButton = await page.$('[data-testid="follow"], [aria-label*="Follow"]');
      
      if (!followButton) {
        throw new Error('Follow button not found');
      }
      
      await followButton.click();
      await this.delay(2000);
      
      return {
        fbId,
        success: true,
        action: 'follow',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to follow: ${error.message}`);
    }
  }

  // Perform comment
  async performComment(page, commentText, fbId) {
    try {
      if (!commentText || commentText.trim() === '') {
        throw new Error('Comment text is required');
      }
      
      // Look for comment box
      const commentBox = await page.$('[data-testid="comment"], [aria-label*="comment" i], [placeholder*="comment" i]');
      
      if (!commentBox) {
        throw new Error('Comment box not found');
      }
      
      await commentBox.click();
      await this.delay(1000);
      
      await commentBox.type(commentText);
      await this.delay(1000);
      
      // Submit comment
      await page.keyboard.press('Enter');
      await this.delay(3000);
      
      return {
        fbId,
        success: true,
        action: 'comment',
        comment: commentText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to comment: ${error.message}`);
    }
  }

  // Utility delay function
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate session
  async validateSession(fbId) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      const sessions = await this.getSessions();
      const session = sessions.find(s => s.fbId === fbId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      await this.setCookies(page, session.cookies);
      await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });
      
      const isValid = await this.checkIfLoggedIn(page);
      
      if (!isValid) {
        await this.removeSession(fbId);
      }
      
      await page.close();
      return isValid;
    } catch (error) {
      await page.close();
      return false;
    }
  }
}

module.exports = new FacebookService();