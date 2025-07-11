const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
let config = {};

try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading config:', error.message);
  config = { useMongoDB: false };
}

// MongoDB connection function
const connectDB = async () => {
  // Check if MongoDB is enabled in config
  if (!config.useMongoDB) {
    console.log('📄 MongoDB disabled in config. Using file-based storage.');
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || config.mongoURI;
    
    if (!mongoURI || mongoURI.includes('username:password')) {
      console.log('⚠️  MongoDB URI not configured properly. Using file-based storage.');
      return;
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔴 MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('📄 Falling back to file-based storage.');
  }
};

// Check if MongoDB is enabled
const isMongoEnabled = () => {
  return config.useMongoDB && mongoose.connection.readyState === 1;
};

// Get configuration
const getConfig = () => {
  return config;
};

// Update configuration
const updateConfig = (newConfig) => {
  try {
    const updatedConfig = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    config = updatedConfig;
    
    // If MongoDB was enabled, try to connect
    if (updatedConfig.useMongoDB && !isMongoEnabled()) {
      connectDB();
    }
    
    return true;
  } catch (error) {
    console.error('Error updating config:', error.message);
    return false;
  }
};

module.exports = {
  connectDB,
  isMongoEnabled,
  getConfig,
  updateConfig
};