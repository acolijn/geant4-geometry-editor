#!/bin/bash
# Geant4 Geometry Editor - Installation Script
# This script installs and configures the Geant4 Geometry Editor on a server

set -e  # Exit on error

# Configuration
APP_NAME="geant4-geometry-editor"
APP_PORT=3001
NODE_VERSION="18"
INSTALL_DIR="/opt/${APP_NAME}"
SERVICE_NAME="${APP_NAME}"
SUB_PATH="/geant4-editor"  # Subpath where the application will be accessible
GIT_REPO="https://github.com/username/${APP_NAME}.git"  # Replace with your actual repo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}"
echo "================================================================"
echo "          Geant4 Geometry Editor - Installation Script          "
echo "================================================================"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Function to print status messages
print_status() {
  echo -e "${YELLOW}[*] $1${NC}"
}

# Update system packages
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
print_status "Installing dependencies..."
apt-get install -y curl git build-essential nginx

# Install Node.js
print_status "Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
  npm install -g pm2
else
  echo "Node.js is already installed: $(node -v)"
fi

# Create installation directory
print_status "Creating installation directory..."
mkdir -p ${INSTALL_DIR}

# Clone or copy application
if [ -d "/tmp/app-source" ]; then
  print_status "Copying application from local source..."
  cp -r /tmp/app-source/* ${INSTALL_DIR}/
else
  print_status "Cloning application from repository..."
  git clone ${GIT_REPO} ${INSTALL_DIR} || {
    print_status "Git clone failed. Copying files from installation package..."
    cp -r $(dirname "$0")/* ${INSTALL_DIR}/
  }
fi

# Navigate to installation directory
cd ${INSTALL_DIR}

# Install dependencies and build the application
print_status "Installing npm dependencies..."
npm ci

print_status "Building application..."
npm run build

# Create objects directory for storing saved geometries
print_status "Creating data directories..."
mkdir -p ${INSTALL_DIR}/objects
chmod 755 ${INSTALL_DIR}/objects

# Update server.js for production
print_status "Configuring server for production..."
# Already using production settings, no changes needed

# Create systemd service
print_status "Creating systemd service..."

# Set BASE_PATH environment variable if using subpath
if [[ "$other_apps" =~ ^[Yy]$ ]]; then
  BASE_PATH_ENV="Environment=BASE_PATH=${SUB_PATH}"
else
  BASE_PATH_ENV="# No BASE_PATH needed for standalone installation"
fi

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Geant4 Geometry Editor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
${BASE_PATH_ENV}

[Install]
WantedBy=multi-user.target
EOF

# Check if Nginx is already configured
print_status "Configuring Nginx..."

echo -e "${YELLOW}"
read -p "Is this server already running other web applications? (y/n): " other_apps
echo -e "${NC}"

if [[ "$other_apps" =~ ^[Yy]$ ]]; then
  print_status "Configuring to coexist with other applications at subpath: ${SUB_PATH}"
  
  # Check for existing default config
  if [ -f "/etc/nginx/sites-available/default" ]; then
    # Add location block to existing config
    print_status "Adding to existing default Nginx configuration"
    
    # Create a backup of the original config
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
    
    # Add our location block before the closing brace
    sed -i "/^}/i\    location ${SUB_PATH} {\n        proxy_pass http:\/\/localhost:${APP_PORT};\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host \$host;\n        proxy_cache_bypass \$http_upgrade;\n    }\n" /etc/nginx/sites-available/default
  else
    # Create a new config file with the subpath
    cat > /etc/nginx/sites-available/${APP_NAME} << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain if available

    location ${SUB_PATH} {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable our site
    ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
  fi
else
  # Standalone configuration
  print_status "Configuring as standalone application"
  cat > /etc/nginx/sites-available/${APP_NAME} << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain if available

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

  # Enable our site
  ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
fi

# Enable site
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Enable and start the service
print_status "Starting application service..."
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

# Ask about HTTPS setup
echo -e "${YELLOW}"
read -p "Do you want to set up HTTPS with Let's Encrypt? (y/n): " setup_https
echo -e "${NC}"

if [[ "$setup_https" =~ ^[Yy]$ ]]; then
  print_status "Installing Certbot for HTTPS..."
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
  
  echo -e "${YELLOW}"
  read -p "Enter your domain name (leave empty to use IP address): " domain_name
  echo -e "${NC}"
  
  if [ -n "$domain_name" ]; then
    print_status "Setting up HTTPS for domain: $domain_name"
    certbot --nginx -d "$domain_name" --non-interactive --agree-tos --email admin@"$domain_name"
  else
    print_status "Setting up HTTPS without domain name"
    certbot --nginx --non-interactive --agree-tos
  fi
  
  print_status "Setting up automatic certificate renewal"
  echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
fi

# Final message
echo -e "${GREEN}"
echo "================================================================"
echo "          Geant4 Geometry Editor Installation Complete          "
echo "================================================================"
echo ""
echo "The application is now running at: http://your-server-ip"
echo "Service status: systemctl status ${SERVICE_NAME}"
echo "Service logs: journalctl -u ${SERVICE_NAME}"
echo ""
echo "To update the application in the future:"
echo "1. Stop the service: systemctl stop ${SERVICE_NAME}"
echo "2. Pull new code or copy new files to ${INSTALL_DIR}"
echo "3. Rebuild if needed: cd ${INSTALL_DIR} && npm run build"
echo "4. Restart the service: systemctl start ${SERVICE_NAME}"
echo -e "${NC}"
