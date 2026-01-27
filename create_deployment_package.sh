#!/bin/bash

# DDN RAG v2.1 - Deployment Package Creation Script
# ==================================================
# This script creates a clean deployment package for external teams
# Excludes: venv, node_modules, build artifacts, logs, .env files
# Includes: Source code, configs, install script, documentation

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DDN RAG v2.1 Deployment Package${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_NAME="ddn-rag-v2.1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="${PROJECT_NAME}-deployment-${TIMESTAMP}"
TEMP_DIR="/tmp/${PACKAGE_NAME}"

echo -e "${YELLOW}Creating deployment package: ${PACKAGE_NAME}.zip${NC}"
echo ""

# Create temporary directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo -e "${YELLOW}Copying project files...${NC}"

# Copy backend files (excluding venv, __pycache__, logs, .env)
mkdir -p "$TEMP_DIR/backend"
cp -r "$SCRIPT_DIR/backend/app" "$TEMP_DIR/backend/"
cp "$SCRIPT_DIR/backend/main.py" "$TEMP_DIR/backend/"
cp "$SCRIPT_DIR/backend/requirements.txt" "$TEMP_DIR/backend/"
cp "$SCRIPT_DIR/backend/.env.example" "$TEMP_DIR/backend/"

# Create backend/data directory (empty, will be populated on deployment)
mkdir -p "$TEMP_DIR/backend/data"
echo "# This directory stores storage configuration" > "$TEMP_DIR/backend/data/README.md"

# Copy frontend files (excluding node_modules, dist)
echo -e "${YELLOW}Copying frontend files...${NC}"
mkdir -p "$TEMP_DIR/frontend"
cp -r "$SCRIPT_DIR/frontend/src" "$TEMP_DIR/frontend/"
cp -r "$SCRIPT_DIR/frontend/public" "$TEMP_DIR/frontend/"
cp -r "$SCRIPT_DIR/frontend/Logos" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/index.html" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/package.json" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/package-lock.json" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/vite.config.ts" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/tsconfig.json" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/tsconfig.node.json" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/tailwind.config.js" "$TEMP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/postcss.config.js" "$TEMP_DIR/frontend/"

# Copy root files
echo -e "${YELLOW}Copying documentation and configuration...${NC}"
cp "$SCRIPT_DIR/install.sh" "$TEMP_DIR/"
cp "$SCRIPT_DIR/README.md" "$TEMP_DIR/"
cp "$SCRIPT_DIR/ARCHITECTURE.md" "$TEMP_DIR/"
cp "$SCRIPT_DIR/.gitignore" "$TEMP_DIR/"

# Copy additional documentation if exists
[ -f "$SCRIPT_DIR/STORAGE_CONFIGURATION.md" ] && cp "$SCRIPT_DIR/STORAGE_CONFIGURATION.md" "$TEMP_DIR/"
[ -f "$SCRIPT_DIR/ROI_CALCULATOR_METHODOLOGY.md" ] && cp "$SCRIPT_DIR/ROI_CALCULATOR_METHODOLOGY.md" "$TEMP_DIR/"

# Create DEPLOYMENT.md with instructions
echo -e "${YELLOW}Creating deployment instructions...${NC}"
cat > "$TEMP_DIR/DEPLOYMENT.md" << 'EOF'
# DDN RAG v2.1 - Deployment Instructions

## System Requirements

### Ubuntu Server (20.04 LTS or newer)
- Python 3.9 or higher
- Node.js 18 or higher
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

## Quick Deployment

### 1. Extract the Package
```bash
unzip ddn-rag-v2.1-deployment-*.zip
cd ddn-rag-v2.1-deployment-*
```

### 2. Install Dependencies
```bash
chmod +x install.sh
./install.sh
```

This will:
- Check Python and Node.js versions
- Create Python virtual environment
- Install all backend dependencies
- Install all frontend dependencies
- Create `.env` template

### 3. Configure Environment
```bash
nano backend/.env
```

**Required:** Add your NVIDIA API key:
```env
NVIDIA_API_KEY=nvapi-your-key-here
```

Get your key from: https://build.nvidia.com/

**Optional:** Add HuggingFace token (for certain models):
```env
HUGGINGFACE_TOKEN=hf_your-token-here
```

### 4. Start the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

Backend will run on: http://localhost:8000
API docs: http://localhost:8000/docs

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:5173

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Or if deploying on a server:
```
http://your-server-ip:5173
```

## Storage Configuration

### AWS S3 Configuration
1. Navigate to **Configuration** page in the UI
2. Click **Configure AWS S3**
3. Enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - S3 Bucket Name
   - Region (e.g., us-east-1)
4. Click **Test Connection** to verify

### DDN INFINIA Configuration
1. Navigate to **Configuration** page in the UI
2. Click **Configure DDN INFINIA**
3. Enter:
   - DDN Endpoint URL (S3-compatible)
   - Access Key
   - Secret Key
   - Bucket Name
4. Click **Test Connection** to verify

## First-Time Usage

1. **Upload Documents**: Go to **Document Upload** page
2. **Upload Files**: Drag-and-drop or select PDF/DOCX/TXT files
3. **Wait for Processing**: Documents will be chunked and stored
4. **Start Querying**: Go to **RAG Chat** and ask questions

## Production Deployment

### Using PM2 (Process Manager)

**Install PM2:**
```bash
npm install -g pm2
```

**Start Backend:**
```bash
cd backend
pm2 start main.py --name ddn-rag-backend --interpreter python3 --interpreter-args="venv/bin/python"
```

**Start Frontend (Production Build):**
```bash
cd frontend
npm run build
npm install -g serve
pm2 start "serve -s dist -p 5173" --name ddn-rag-frontend
```

**Save PM2 Configuration:**
```bash
pm2 save
pm2 startup
```

### Using Nginx (Reverse Proxy)

**Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

**Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/ddn-rag
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/ddn-rag /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
sudo lsof -i :8000
# Kill process
sudo kill -9 <PID>
```

### Python Version Issues
```bash
# Check Python version
python3 --version
# Install Python 3.9+ if needed
sudo apt update
sudo apt install python3.9 python3.9-venv python3.9-pip
```

### Node.js Version Issues
```bash
# Check Node.js version
node --version
# Install Node.js 18+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### NVIDIA API Errors
- Verify API key is correct
- Check internet connectivity
- Ensure API key has active credits
- Visit https://build.nvidia.com/ to check status

### Storage Connection Failures
- **AWS S3**: Verify credentials, bucket name, and region
- **DDN INFINIA**: Ensure endpoint URL includes `https://`
- Check network connectivity to storage endpoints
- Verify bucket permissions

### Frontend Build Errors
```bash
# Clear npm cache
npm cache clean --force
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Crashes
```bash
# Check logs
cd backend
tail -f backend.log

# Reinstall dependencies
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

## Monitoring

### Check Application Status
```bash
# PM2
pm2 status
pm2 logs ddn-rag-backend
pm2 logs ddn-rag-frontend

# System resources
htop
df -h
free -h
```

### Performance Metrics
- Access **Business Impact** page for ROI analysis
- View **Storage Comparison** for TTFB metrics
- Check **System Status** for GPU/CPU usage

## Security Recommendations

1. **Firewall Configuration:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

2. **Environment Variables:**
   - Never commit `.env` to version control
   - Use strong, unique API keys
   - Rotate credentials regularly

3. **SSL/TLS (Production):**
   - Use Let's Encrypt for free SSL certificates
   - Configure HTTPS in Nginx
   - Redirect HTTP to HTTPS

## Support

For issues or questions:
- Check `README.md` for architecture details
- Review `ARCHITECTURE.md` for technical documentation
- Check API docs at `http://localhost:8000/docs`

## Version

DDN RAG v2.1 - Production Deployment Package
EOF

# Create a simplified startup script
cat > "$TEMP_DIR/start.sh" << 'EOF'
#!/bin/bash
# Quick start script for DDN RAG v2.1

echo "Starting DDN RAG v2.1..."
echo ""
echo "Starting backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

echo "Waiting for backend to initialize..."
sleep 3

echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "DDN RAG v2.1 is running!"
echo "========================================="
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF

chmod +x "$TEMP_DIR/start.sh"

# Create ZIP package
echo ""
echo -e "${YELLOW}Creating ZIP archive...${NC}"
cd /tmp
zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}" -q

# Move to original directory
mv "/tmp/${PACKAGE_NAME}.zip" "$SCRIPT_DIR/"

# Cleanup
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(du -h "$SCRIPT_DIR/${PACKAGE_NAME}.zip" | cut -f1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Package Created!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Package: ${GREEN}${PACKAGE_NAME}.zip${NC}"
echo -e "Size: ${GREEN}${FILE_SIZE}${NC}"
echo -e "Location: ${GREEN}$SCRIPT_DIR/${NC}"
echo ""
echo -e "${YELLOW}Contents:${NC}"
echo "  ✓ Backend source code (FastAPI + NVIDIA integration)"
echo "  ✓ Frontend source code (React + TypeScript)"
echo "  ✓ Install script (install.sh)"
echo "  ✓ Deployment instructions (DEPLOYMENT.md)"
echo "  ✓ Documentation (README.md, ARCHITECTURE.md)"
echo "  ✓ Configuration templates (.env.example)"
echo ""
echo -e "${YELLOW}Excluded (will be installed on deployment):${NC}"
echo "  ✗ node_modules/"
echo "  ✗ venv/"
echo "  ✗ Build artifacts"
echo "  ✗ Log files"
echo "  ✗ .env (secrets)"
echo ""
echo -e "${GREEN}Ready to share with external team!${NC}"
echo ""
