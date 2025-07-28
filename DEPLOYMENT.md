# ONYX MD - Vercel Deployment Guide

## 🚀 Deploy to Vercel

This guide will help you deploy your ONYX MD WhatsApp bot to Vercel.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Node.js**: Version 20 or higher (as specified in package.json)

### Deployment Steps

#### Method 1: Deploy via Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository containing this code

2. **Configure Project**:
   - Framework Preset: `Node.js`
   - Root Directory: `./` (leave as default)
   - Build Command: Leave empty (not needed for this project)
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Environment Variables** (if needed):
   - Add any environment variables your bot requires
   - Common variables might include API keys or configuration settings

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

#### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Confirm deployment settings
   - Wait for deployment to complete

### Project Structure

```
PP-code-main/
├── index.js              # Main server file
├── pair.js               # Pairing logic
├── pair.html             # Original HTML file
├── public/
│   └── index.html        # Web interface (served by Vercel)
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies and scripts
└── .gitignore           # Git ignore rules
```

### Features

- ✅ **WhatsApp Pairing**: Generate pairing codes for WhatsApp numbers
- ✅ **Modern UI**: Beautiful glass-morphism design
- ✅ **Responsive**: Works on all devices
- ✅ **Health Check**: `/health` endpoint for monitoring
- ✅ **Static File Serving**: Optimized for Vercel
- ✅ **Vercel Compatible**: No filesystem operations, serverless-ready

### Available Endpoints

- `GET /` - Main web interface
- `GET /health` - Health check endpoint
- `GET /code?number=<phone>` - Generate pairing code

### Customization

1. **Styling**: Edit `public/index.html` to customize the appearance
2. **Logic**: Modify `pair.js` to change pairing code generation
3. **Configuration**: Update `vercel.json` for routing changes

### Important Notes

✅ **Real WhatsApp Integration**: This version now includes actual WhatsApp Web integration:
- In-memory session storage for Vercel compatibility
- Real WhatsApp pairing code generation
- Proper connection handling and error management
- Timeout protection for serverless environment

### Troubleshooting

#### Common Issues

1. **Build Errors**:
   - Ensure Node.js version is 20+
   - Check all dependencies are in package.json
   - Verify file paths in vercel.json

2. **Runtime Errors**:
   - Check Vercel function logs
   - Verify environment variables are set
   - Test locally with `npm start`

3. **404 Errors**:
   - Ensure routes are properly configured in vercel.json
   - Check file paths are correct

#### Getting Help

- Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- View deployment logs in Vercel dashboard
- Test locally before deploying

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Monitoring

- Use the `/health` endpoint to monitor application status
- Check Vercel analytics for performance metrics
- Set up uptime monitoring for your deployed URL

---

**Happy Deploying! 🎉** 