# 🚀 Facebook Auto Tool

A production-ready, modular Facebook automation web application built with Node.js, Express, and Puppeteer. Features secure session management, powerful action controls, and enterprise-grade reliability.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-16%2B-green.svg)
![MongoDB](https://img.shields.io/badge/mongodb-optional-orange.svg)

## ✨ Features

- **Multi-Account Management**: Handle multiple Facebook accounts with secure session storage
- **Automated Actions**: Like, Love, Haha, Sad, Angry, Wow reactions + Follow & Comment
- **Dual Login Methods**: Facebook credentials (Puppeteer) or manual cookie input
- **Flexible Storage**: File-based storage by default, optional MongoDB integration
- **Session Validation**: Automatic cleanup of invalid/expired sessions
- **Security-First**: httpOnly cookies, rate limiting, CORS protection, helmet security
- **Modern UI**: Beautiful Bootstrap-based interface with real-time updates
- **Production-Ready**: Designed for deployment on Render.com and other platforms

## 📁 Project Structure

```
/
├── package.json              # Dependencies and scripts
├── index.js                  # Main Express server
├── config/
│   ├── config.json          # App configuration
│   └── db.js                # Database connection handler
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── action.js            # Action execution routes
│   └── dashboard.js         # Dashboard routes
├── controllers/
│   ├── authController.js    # Auth logic
│   ├── actionController.js  # Action logic
│   └── dashboardController.js # Dashboard logic
├── models/
│   └── User.js              # MongoDB user model (if enabled)
├── services/
│   └── fbService.js         # Facebook automation service
├── data/
│   └── cookies.json         # Session storage (file-based)
├── public/
│   ├── index.html           # Landing page
│   ├── login.html           # Login form
│   ├── styles.css           # Custom styles
│   └── script.js            # Frontend JavaScript
├── views/
│   └── dashboard.ejs        # Dashboard template
├── .env                     # Environment variables
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd facebook-auto-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the application**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Navigate to `/login.html` to add Facebook sessions
   - Access `/dashboard` for the main interface

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Session Security (CHANGE IN PRODUCTION!)
SESSION_SECRET=your-super-secret-session-key-change-in-production-make-it-long-and-random

# Frontend URL (for CORS in production)
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration (optional)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-tool

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
HELMET_ENABLED=true
```

## 🌐 Deployment on Render.com

### Step 1: Prepare Your Repository

1. Ensure your code is in a Git repository (GitHub, GitLab, etc.)
2. Make sure all files are committed and pushed

### Step 2: Create Render Service

1. Go to [Render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure the service:

**Basic Settings:**
- **Name**: `facebook-auto-tool`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` or `master`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Configure Environment Variables

In the Render dashboard, add these environment variables:

```env
NODE_ENV=production
SESSION_SECRET=generate-a-long-random-string-for-production-use
FRONTEND_URL=https://your-app-name.onrender.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-tool
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for the build and deployment to complete
3. Access your app at `https://your-app-name.onrender.com`

### Step 5: Configure MongoDB (Optional)

If using MongoDB:

1. Create a MongoDB Atlas cluster
2. Get the connection string
3. Update the `MONGODB_URI` environment variable
4. In `config/config.json`, set `"useMongoDB": true`

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/login`
Login with Facebook credentials or cookies.

**Request Body:**
```json
{
  "loginMethod": "cookies",
  "cookies": "c_user=123456; xs=abc123; ...",
  "fbId": "123456789" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "fbId": "12345...",
  "redirectUrl": "/dashboard"
}
```

#### GET `/auth/sessions`
Get all active sessions.

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "fbId": "12345...",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "method": "manual",
      "serialNumber": "FB_1234567890_xyz"
    }
  ],
  "count": 1
}
```

### Action Endpoints

#### POST `/action/perform`
Perform a Facebook action.

**Request Body:**
```json
{
  "targetUrl": "https://facebook.com/post/123456",
  "action": "like",
  "comment": "Great post!" // required only for comment action
}
```

**Response:**
```json
{
  "success": true,
  "actionId": "uuid-v4",
  "results": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "details": [
      {
        "fbId": "12345...",
        "success": true,
        "error": null
      }
    ]
  }
}
```

## 🧪 Testing with cURL

### Login with Cookies
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "loginMethod": "cookies",
    "cookies": "c_user=123456; xs=abc123; datr=xyz",
    "fbId": "123456"
  }'
```

### Perform Like Action
```bash
curl -X POST http://localhost:3000/action/perform \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "targetUrl": "https://facebook.com/post/123456",
    "action": "like"
  }'
```

### Get Sessions
```bash
curl -X GET http://localhost:3000/auth/sessions \
  -H "Cookie: connect.sid=your-session-cookie"
```

### Post Comment
```bash
curl -X POST http://localhost:3000/action/perform \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "targetUrl": "https://facebook.com/post/123456",
    "action": "comment",
    "comment": "This is an automated comment!"
  }'
```

## 🔧 Configuration

### Default Configuration (`config/config.json`)

```json
{
  "useMongoDB": false,
  "mongoURI": "mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-tool",
  "sessionTimeout": 86400000,
  "maxConcurrentActions": 5,
  "actionDelay": 2000,
  "cookieValidationInterval": 3600000,
  "defaultUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

### Enabling MongoDB

1. Set up MongoDB Atlas or local MongoDB
2. Update `MONGODB_URI` in environment variables
3. Change `"useMongoDB": true` in `config/config.json`
4. Restart the application

## 🛡️ Security Features

- **Session Security**: httpOnly cookies with secure flags in production
- **Rate Limiting**: Configurable request limits per IP
- **CORS Protection**: Whitelist specific origins
- **Input Validation**: Comprehensive validation for all inputs
- **Error Handling**: Sanitized error messages in production
- **Helmet.js**: Security headers for XSS, CSRF protection

## 🚦 Available Actions

- **👍 Like**: Standard Facebook like
- **❤️ Love**: Love reaction
- **😂 Haha**: Laugh reaction
- **😢 Sad**: Sad reaction
- **😡 Angry**: Angry reaction
- **😲 Wow**: Wow reaction
- **✅ Follow**: Follow user/page
- **💬 Comment**: Post custom comment

## 📊 Monitoring & Logging

The application includes comprehensive logging for:
- User authentication events
- Action execution results
- Session validation outcomes
- Error tracking with stack traces
- Performance metrics

Check the console output for real-time monitoring:
```bash
🚀 Facebook Auto Tool running on port 3000
📱 Environment: development
🌐 Access at: http://localhost:3000
✅ Session saved to file for FB ID: 12345...
🎬 Starting action uuid: like on https://facebook.com/post/123
✅ Action uuid completed: 1/1 successful
```

## 🔍 Troubleshooting

### Common Issues

1. **Puppeteer fails to launch**
   - Install required dependencies: `sudo apt-get install -y chromium-browser`
   - Set environment: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

2. **Session validation fails**
   - Check if Facebook cookies are still valid
   - Verify the Facebook account isn't locked/restricted

3. **MongoDB connection fails**
   - Verify `MONGODB_URI` format and credentials
   - Check network connectivity to MongoDB Atlas

4. **Actions not working**
   - Ensure target URLs are valid Facebook URLs
   - Check if sessions are still active
   - Verify Facebook hasn't changed their DOM structure

### Debug Mode

Enable debug logging:
```bash
DEBUG=facebook-auto-tool:* npm start
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## ⚠️ Disclaimer

This tool is for educational and automation purposes. Users are responsible for complying with Facebook's Terms of Service and applicable laws. Use responsibly and respect rate limits to avoid account restrictions.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ using Node.js, Express, Puppeteer, and Bootstrap**