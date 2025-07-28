# ONYX MD - WhatsApp Pairing Bot

A modern, responsive web application for generating WhatsApp pairing codes with a beautiful glass-morphism UI.

## 🌟 Features

- **WhatsApp Pairing**: Generate pairing codes for WhatsApp numbers
- **Modern UI**: Beautiful glass-morphism design with animations
- **Responsive**: Works perfectly on all devices
- **Real-time**: Instant code generation
- **Copy to Clipboard**: One-click code copying
- **Health Monitoring**: Built-in health check endpoint

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/onyx-md)

### Option 2: Manual Deploy
```bash
# Clone the repository
git clone https://github.com/yourusername/onyx-md.git
cd onyx-md

# Install dependencies
npm install

# Deploy to Vercel
npm run deploy
```

### Option 3: Using Deployment Scripts
- **Windows**: Run `deploy.bat`
- **Linux/Mac**: Run `./deploy.sh`

## 📁 Project Structure

```
onyx-md/
├── index.js              # Main server file
├── pair.js               # Pairing logic
├── public/
│   └── index.html        # Web interface
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies
├── deploy.sh             # Linux/Mac deployment script
├── deploy.bat            # Windows deployment script
└── DEPLOYMENT.md         # Detailed deployment guide
```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🌐 Available Endpoints

- `GET /` - Main web interface
- `GET /health` - Health check endpoint
- `GET /code?number=<phone>` - Generate pairing code

## 🎨 Customization

### Styling
Edit `public/index.html` to customize:
- Colors and gradients
- Animations
- Layout and spacing
- Typography

### Functionality
Modify `pair.js` to change:
- Code generation logic
- Validation rules
- Response format

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔧 Configuration

### Environment Variables
Set these in your Vercel dashboard if needed:
- `NODE_ENV` - Set to "production" for production
- Any custom API keys or configuration

### Vercel Settings
The `vercel.json` file is pre-configured for optimal deployment:
- Node.js runtime
- Proper routing
- Static file serving

## 📊 Monitoring

- **Health Check**: Visit `/health` to monitor application status
- **Vercel Analytics**: Built-in performance monitoring
- **Uptime Monitoring**: Set up external monitoring for your deployed URL

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**:
   - Ensure Node.js version is 20+
   - Check all dependencies are installed
   - Verify file paths

2. **Runtime Errors**:
   - Check Vercel function logs
   - Verify environment variables
   - Test locally first

3. **404 Errors**:
   - Ensure routes are configured in vercel.json
   - Check file paths are correct

### Getting Help

- Check the [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
- Review Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Check deployment logs in Vercel dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with Express.js and Node.js
- Styled with modern CSS and glass-morphism design
- Deployed on Vercel for optimal performance

---

**Made with ❤️ for the WhatsApp community** 