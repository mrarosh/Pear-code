const { upload, getMegaSession, clearSessionCache } = require('./mega');
const fs = require('fs');

async function testMegaFunctionality() {
  console.log('Testing Mega functionality...');
  
  try {
    // Test 1: Get session ID
    console.log('\n1. Testing session ID retrieval...');
    const sessionId = await getMegaSession();
    console.log('✅ Session ID retrieved successfully');
    
    // Test 2: Upload a test file
    console.log('\n2. Testing file upload...');
    const testData = Buffer.from('This is a test file for Mega upload functionality');
    const testStream = require('stream').Readable.from(testData);
    
    const uploadUrl = await upload(testStream, 'test-file.txt');
    console.log('✅ File uploaded successfully');
    console.log('Upload URL:', uploadUrl);
    
    console.log('\n✅ All tests passed! Mega functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your Mega email and password in mega.js');
    console.log('2. Ensure your Mega account is not blocked');
    console.log('3. Check your internet connection');
    console.log('4. Try clearing the session cache with clearSessionCache()');
  }
}

// Run the test
testMegaFunctionality(); 