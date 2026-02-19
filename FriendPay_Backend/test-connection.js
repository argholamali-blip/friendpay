// test-connection.js - Test MongoDB connection before starting server
require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Testing MongoDB Connection...\n');

// Hide password in output
const safeUri = process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@');
console.log('📍 Connecting to:', safeUri);
console.log('');

// Remove deprecated options for clean connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ SUCCESS! Connected to MongoDB Atlas');
    console.log('📊 Database Name:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('');
    console.log('🎉 Your MongoDB connection is working perfectly!');
    console.log('');
    console.log('Next step: Start your server with: npm run dev');
    console.log('');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FAILED! Cannot connect to MongoDB Atlas');
    console.error('');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('');
    
    // Provide specific guidance based on error type
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('🔧 This is a NETWORK/FIREWALL issue. To fix:');
      console.error('');
      console.error('1. Go to https://cloud.mongodb.com/');
      console.error('2. Login and select your project');
      console.error('3. Click "Network Access" in left menu');
      console.error('4. Click "+ ADD IP ADDRESS"');
      console.error('5. Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
      console.error('6. Click "Confirm"');
      console.error('7. Wait 2-3 minutes');
      console.error('8. Run this test again: node test-connection.js');
      console.error('');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔧 This is an AUTHENTICATION issue. To fix:');
      console.error('');
      console.error('1. Check your username and password in .env file');
      console.error('2. Go to MongoDB Atlas → Database Access');
      console.error('3. Reset your password if needed');
      console.error('4. Update MONGODB_URI in .env file');
      console.error('');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🔧 This is a DNS/INTERNET issue. To fix:');
      console.error('');
      console.error('1. Check your internet connection');
      console.error('2. Try: ping google.com');
      console.error('3. Try using a different network (phone hotspot)');
      console.error('4. Check if you are behind a firewall');
      console.error('');
    } else {
      console.error('🔧 Possible solutions:');
      console.error('');
      console.error('1. Verify your MongoDB URI is correct in .env');
      console.error('2. Check if your cluster is active in MongoDB Atlas');
      console.error('3. Make sure your IP is whitelisted in Network Access');
      console.error('4. Try restarting your router/modem');
      console.error('');
    }
    
    console.error('📖 For more help, see: EMERGENCY_FIX_SERVER_CRASH.md');
    console.error('');
    process.exit(1);
  });

// Set timeout to prevent hanging
setTimeout(() => {
  console.error('');
  console.error('⏱️  Connection timeout after 30 seconds');
  console.error('');
  console.error('This usually means:');
  console.error('- Your IP is not whitelisted in MongoDB Atlas');
  console.error('- You have no internet connection');
  console.error('- A firewall is blocking the connection');
  console.error('');
  process.exit(1);
}, 30000);
