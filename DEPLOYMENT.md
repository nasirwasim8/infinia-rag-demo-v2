# Deployment Guide

## Prerequisites

- Git installed
- GitHub account
- Python 3.10+
- Node.js 18+
- Access to DDN INFINIA storage
- NVIDIA NIM API key

## 📤 Push to GitHub

### 1. Initialize Git Repository (if not already done)

```bash
cd /Users/nwasim/Documents/MyDocs/llm_engineering-main/DDN/Infinia/kafka-pipeline/python-pipeline/Build.DDN.Com/Build.RAG

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: DDN INFINIA RAG Performance Demo"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `ddn-infinia-rag-demo`)
3. **Do NOT initialize** with README, .gitignore, or license (we already have these)

### 3. Push to GitHub

```bash
# Add remote
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to main branch
git branch -M main
git push -u origin main
```

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
```

Deploy:
```bash
docker-compose up -d
```

### Option 2: Cloud Deployment

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p python-3.10 ddn-rag-backend

# Create environment
eb create ddn-rag-prod

# Deploy
eb deploy
```

#### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/ddn-rag-backend

# Deploy
gcloud run deploy ddn-rag-backend \
  --image gcr.io/PROJECT-ID/ddn-rag-backend \
  --platform managed
```

### Option 3: VPS Deployment (DigitalOcean, Linode, etc.)

```bash
# SSH into server
ssh user@your-server-ip

# Clone repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
npm run build

# Use systemd or PM2 to keep services running
```

## 🔒 Security Checklist

- [ ] Never commit `.env` file
- [ ] Use environment variables for all secrets
- [ ] Set up HTTPS/SSL certificates
- [ ] Enable CORS only for trusted domains
- [ ] Use strong API keys
- [ ] Implement rate limiting
- [ ] Regular dependency updates

## 📊 Monitoring

### Health Check Endpoints

- Backend: `http://localhost:8000/api/health`
- Metrics: `http://localhost:8000/api/metrics`

### Recommended Monitoring Tools

- **Application**: New Relic, Datadog
- **Infrastructure**: CloudWatch, Grafana
- **Logs**: ELK Stack, Papertrail

## 🔄 CI/CD Setup

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying..."
```

## 📝 Environment Setup

### Production Environment Variables

```bash
# Production .env
NVIDIA_API_KEY=prod_nvidia_key
DDN_ENDPOINT_URL=https://production-endpoint:8111
# ... other production values
```

### Staging Environment

```bash
# Staging .env
NVIDIA_API_KEY=staging_nvidia_key
DDN_ENDPOINT_URL=https://staging-endpoint:8111
# ... other staging values
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Update `CORS_ORIGINS` in backend config
   - Ensure frontend URL is whitelisted

2. **Connection Timeout**
   - Check firewall rules
   - Verify endpoint URLs
   - Confirm credentials are correct

3. **Module Not Found**
   - Reinstall dependencies
   - Check Python/Node version

## 📞 Support

For deployment issues, check:
- GitHub Issues
- API Documentation: `/docs`
- Logs: `backend/logs/`

---

**Ready to deploy!** 🚀
