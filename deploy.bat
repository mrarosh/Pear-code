@echo off
echo 🚀 Starting ONYX MD deployment to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Vercel...
    vercel login
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 🌐 Your app should be live at the URL provided above
echo 📊 Check your Vercel dashboard for more details
pause 