const mega = require("megajs");

console.log('🔐 Verifying Mega Credentials...\n');

const auth = {
  email: "masterblack20051031@gmail.com",
  password: "Arosha2005@",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
};

console.log('📧 Email:', auth.email);
console.log('🔑 Password:', auth.password.replace(/./g, '*'));
console.log('\n🔄 Testing connection...\n');

const storage = new mega.Storage(auth);

storage.on("ready", () => {
  console.log('✅ SUCCESS: Credentials are correct!');
  console.log('🎉 Your Mega account is working properly.');
  console.log('\n📝 Next steps:');
  console.log('1. Your credentials are valid');
  console.log('2. The improved system will prevent future blocking');
  console.log('3. You can now use the bot normally');
  storage.close();
  process.exit(0);
});

storage.on("error", (err) => {
  console.log('❌ ERROR:', err.message);
  console.log('\n🔍 TROUBLESHOOTING:');
  
  if (err.message.includes('ENOENT') || err.message.includes('Wrong password')) {
    console.log('💡 This usually means:');
    console.log('   • Password is incorrect');
    console.log('   • Email is incorrect');
    console.log('   • Account doesn\'t exist');
    console.log('\n🛠️ Solutions:');
    console.log('1. Double-check your password');
    console.log('2. Try logging into https://mega.nz first');
    console.log('3. Verify your email address');
    console.log('4. Make sure there are no extra spaces');
  } else if (err.message.includes('blocked')) {
    console.log('💡 Account is still blocked');
    console.log('   • Wait longer (24-48 hours)');
    console.log('   • Try logging into Mega web interface');
  } else {
    console.log('💡 Unknown error - try:');
    console.log('   • Check internet connection');
    console.log('   • Verify Mega service is available');
  }
  
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Timeout: Connection took too long');
  console.log('💡 Try again or check your internet connection');
  process.exit(1);
}, 30000); 
