const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database configuration
const { connectDB } = require('./config/db');

// Import routes with error handling
let authRoutes, actionRoutes, dashboardRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  process.exit(1);
}

try {
  actionRoutes = require('./routes/action');
  console.log('✅ Action routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading action routes:', error.message);
  process.exit(1);
}

try {
  dashboardRoutes = require('./routes/dashboard');
  console.log('✅ Dashboard routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading dashboard routes:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://stackpath.bootstrapcdn.com"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize cookies.json if it doesn't exist
const cookiesPath = path.join(__dirname, 'data', 'cookies.json');
if (!fs.existsSync(cookiesPath)) {
  fs.writeFileSync(cookiesPath, JSON.stringify([], null, 2));
}

// Test routes for debugging
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route - redirect to index.html
app.get('/', (req, res) => {
  console.log('🏠 Root route accessed');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes with logging
console.log('🔗 Setting up routes...');
app.use('/auth', (req, res, next) => {
  console.log(`🔐 Auth route: ${req.method} ${req.url}`);
  next();
}, authRoutes);

app.use('/action', (req, res, next) => {
  console.log(`⚡ Action route: ${req.method} ${req.url}`);
  next();
}, actionRoutes);

app.use('/dashboard', (req, res, next) => {
  console.log(`📊 Dashboard route: ${req.method} ${req.url}`);
  next();
}, dashboardRoutes);

console.log('✅ All routes configured');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  
  // If it's an API request, return JSON
  if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/action') || req.url.startsWith('/dashboard')) {
    return res.status(404).json({ 
      error: 'Route not found',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  }
  
  // For web requests, redirect to home
  res.redirect('/');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Initialize database connection
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Facebook Auto Tool running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});