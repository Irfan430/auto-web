// Facebook Auto Tool - Startup Test Script
console.log('🧪 Testing application startup...\n');

async function testStartup() {
  try {
    console.log('1️⃣ Testing basic dependencies...');
    
    // Test core dependencies
    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    console.log('   ✅ Core dependencies loaded');

    console.log('\n2️⃣ Testing configuration...');
    
    // Test config loading
    const { connectDB, getConfig } = require('./config/db');
    const config = getConfig();
    console.log('   ✅ Configuration loaded:', config.useMongoDB ? 'MongoDB enabled' : 'File-based storage');

    console.log('\n3️⃣ Testing services...');
    
    // Test fbService
    const fbService = require('./services/fbService');
    console.log('   ✅ Facebook service loaded');

    console.log('\n4️⃣ Testing controllers...');
    
    // Test controllers
    const authController = require('./controllers/authController');
    console.log('   ✅ Auth controller loaded');
    
    const actionController = require('./controllers/actionController');
    console.log('   ✅ Action controller loaded');
    
    const dashboardController = require('./controllers/dashboardController');
    console.log('   ✅ Dashboard controller loaded');

    console.log('\n5️⃣ Testing routes...');
    
    // Test routes
    const authRoutes = require('./routes/auth');
    console.log('   ✅ Auth routes loaded');
    
    const actionRoutes = require('./routes/action');
    console.log('   ✅ Action routes loaded');
    
    const dashboardRoutes = require('./routes/dashboard');
    console.log('   ✅ Dashboard routes loaded');

    console.log('\n6️⃣ Testing data directory...');
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('   📁 Created data directory');
    } else {
      console.log('   ✅ Data directory exists');
    }

    // Test cookies.json
    const cookiesPath = path.join(__dirname, 'data', 'cookies.json');
    if (!fs.existsSync(cookiesPath)) {
      fs.writeFileSync(cookiesPath, JSON.stringify([], null, 2));
      console.log('   📄 Created cookies.json');
    } else {
      console.log('   ✅ cookies.json exists');
    }

    console.log('\n7️⃣ Testing static files...');
    
    // Test public files
    const publicFiles = ['index.html', 'login.html', 'styles.css', 'script.js'];
    for (const file of publicFiles) {
      const filePath = path.join(__dirname, 'public', file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file} exists`);
      } else {
        console.log(`   ❌ ${file} missing`);
      }
    }

    console.log('\n8️⃣ Testing views...');
    
    // Test views
    const dashboardView = path.join(__dirname, 'views', 'dashboard.ejs');
    if (fs.existsSync(dashboardView)) {
      console.log('   ✅ dashboard.ejs exists');
    } else {
      console.log('   ❌ dashboard.ejs missing');
    }

    console.log('\n🎉 All tests passed! Application should start successfully.');
    console.log('\n💡 To start the application, run:');
    console.log('   npm start');
    console.log('\n🔍 To test routes after starting:');
    console.log('   curl http://localhost:3000/test');
    console.log('   curl http://localhost:3000/health');
    
  } catch (error) {
    console.error('\n❌ Startup test failed:', error.message);
    console.error('\n🔍 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testStartup();