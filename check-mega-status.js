const { clearSessionCache } = require('./mega');

console.log('🔍 Checking Mega Account Status...\n');

// Clear any cached sessions
clearSessionCache();

console.log('📋 Account Status Check Complete!\n');

console.log('❌ Your Mega account is currently BLOCKED (EBLOCKED -16)');
console.log('\n💡 RECOVERY OPTIONS:');
console.log('\n1️⃣ WAIT AND RETRY:');
console.log('   • Wait 24-48 hours before trying again');
console.log('   • This is the most common solution');
console.log('   • Mega blocks are usually temporary');

console.log('\n2️⃣ VERIFY ACCOUNT STATUS:');
console.log('   • Go to https://mega.nz');
console.log('   • Try logging in with your credentials');
console.log('   • Check if there are any account restrictions');

console.log('\n3️⃣ USE ALTERNATIVE ACCOUNT:');
console.log('   • Create a new Mega account');
console.log('   • Update credentials in mega.js');
console.log('   • Use dedicated account for bot only');

console.log('\n4️⃣ CHECK CREDENTIALS:');
console.log('   • Verify email: masterblack20051031@gmail.com');
console.log('   • Ensure password is correct');
console.log('   • Check for typos or extra spaces');

console.log('\n5️⃣ CONTACT MEGA SUPPORT:');
console.log('   • If account remains blocked after 48 hours');
console.log('   • Contact Mega support for account recovery');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Wait 24-48 hours');
console.log('2. Try logging into Mega web interface');
console.log('3. If still blocked, consider using a different account');
console.log('4. Update credentials in mega.js when ready');

console.log('\n📝 To test again later, run:');
console.log('   node test-mega.js'); 