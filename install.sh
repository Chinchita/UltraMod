#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}     UltraModBot Installation Script    ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 16+ first.${NC}"
    echo -e "${YELLOW}Visit: https://nodejs.org/${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Node.js version 16+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"

# Create project directory structure
echo -e "${BLUE}Creating project structure...${NC}"
mkdir -p src/{auth,database,commands,middleware,utils,web}
mkdir -p public/{css,js,images}
mkdir -p logs
mkdir -p config

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed successfully${NC}"

# Create .env file
echo -e "${BLUE}Setting up environment configuration...${NC}"
if [ ! -f .env ]; then
    cat > .env << EOL
# Reddit API Configuration
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=UltraModBot
REDDIT_PASSWORD=your_bot_password_here
REDDIT_USER_AGENT=UltraModBot/1.0.0 by /u/YourUsername

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=UltraModBot

# Server Configuration
PORT=3000
HOST=localhost

# Security
JWT_SECRET=your_jwt_secret_here_make_it_long_and_random
SESSION_SECRET=your_session_secret_here

# Bot Configuration
BOT_PREFIX=!ultramod
MAX_BAN_DURATION=365
MAX_MUTE_DURATION=30
DEFAULT_BAN_REASON=Banned by UltraModBot
DEFAULT_MUTE_REASON=Muted by UltraModBot

# Logging
LOG_LEVEL=info
LOG_FILE=logs/ultramodbot.log

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Features
ENABLE_AUTO_MOD=true
ENABLE_SPAM_DETECTION=true
ENABLE_USER_TRACKING=true
ENABLE_ANALYTICS=true
EOL

    echo -e "${YELLOW}⚠ Please edit .env file with your actual credentials${NC}"
    echo -e "${YELLOW}⚠ NEVER commit .env file to version control${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create .gitignore
cat > .gitignore << EOL
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Database
*.db
*.sqlite

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
tmp/
temp/
EOL

# Create startup scripts
cat > start.sh << EOL
#!/bin/bash
echo "Starting UltraModBot..."
node src/bot.js
EOL

cat > dev.sh << EOL
#!/bin/bash
echo "Starting UltraModBot in development mode..."
npm run dev
EOL

chmod +x start.sh dev.sh

# Create systemd service file (for Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    cat > ultramodbot.service << EOL
[Unit]
Description=UltraModBot - Reddit Moderation Bot
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node src/bot.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL
    echo -e "${GREEN}✓ Systemd service file created: ultramodbot.service${NC}"
fi

# Create logs directory and initial log file
touch logs/ultramodbot.log
touch logs/error.log
touch logs/access.log

echo -e "${BLUE}Creating configuration files...${NC}"

# Create bot configuration
cat > config/bot.config.js << EOL
module.exports = {
    commands: {
        ban: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 365,
            requireReason: true
        },
        mute: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 30,
            requireReason: false
        },
        timeout: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 7,
            requireReason: false
        },
        kick: {
            enabled: true,
            requiredPermissions: ['posts'],
            requireReason: false
        },
        warn: {
            enabled: true,
            requiredPermissions: ['access'],
            maxWarnings: 3
        },
        userHistory: {
            enabled: true,
            requiredPermissions: ['access'],
            maxResults: 100
        }
    },
    moderation: {
        autoMod: {
            enabled: true,
            spamDetection: true,
            toxicityThreshold: 0.7,
            minimumAccountAge: 1, // days
            minimumKarma: -10
        },
        logging: {
            logAllActions: true,
            logUserActivity: true,
            retentionDays: 90
        }
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};
EOL

echo -e "${GREEN}✓ Configuration files created${NC}"
echo -e "${GREEN}✓ Project structure created${NC}"
echo -e "${GREEN}✓ Installation completed successfully!${NC}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Next Steps:                  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}1. Edit .env file with your credentials${NC}"
echo -e "${YELLOW}2. Set up your Reddit app at: https://www.reddit.com/prefs/apps${NC}"
echo -e "${YELLOW}3. Configure your MongoDB connection${NC}"
echo -e "${YELLOW}4. Run: npm run dev (for development)${NC}"
echo -e "${YELLOW}5. Run: ./start.sh (for production)${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if user wants to start the bot
read -p "Do you want to configure the bot now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Opening .env file for editing...${NC}"
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo -e "${YELLOW}Please manually edit .env file with your preferred editor${NC}"
    fi
fi

echo -e "${GREEN}Installation complete! 🚀${NC}"