# Deployment Guide

This guide explains how to deploy the Geant4 Geometry Editor on a digital droplet or any Linux-based server.

## Requirements

- A Linux server (Ubuntu 20.04 LTS or newer recommended)
- Root or sudo access
- At least 1GB RAM
- At least 10GB storage space

## Deployment Options

### Option 1: Automatic Installation (Recommended)

The easiest way to deploy the Geant4 Geometry Editor is using the provided installation script.

1. Upload the application files to your server or clone from your repository
2. Make the installer script executable:
   ```bash
   chmod +x install.sh
   ```
3. Run the installer as root or with sudo:
   ```bash
   sudo ./install.sh
   ```

The installer will:
- Install all required dependencies (Node.js, Nginx, etc.)
- Build the application for production
- Set up a systemd service for automatic startup
- Configure Nginx as a reverse proxy

### Application URL

**Standalone Installation:**
If installed as a standalone application, it will be available at:
```
http://your-server-ip
```

**Coexisting with Other Applications:**
If installed on a server with other web applications, it will be available at:
```
http://your-server-ip/geant4-editor
```

### Option 2: Manual Installation

If you prefer to install manually, follow these steps:

1. Install Node.js (v18 or newer):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Install Nginx:
   ```bash
   sudo apt-get install -y nginx
   ```

3. Clone or upload the application to your server:
   ```bash
   mkdir -p /opt/geant4-geometry-editor
   # Clone from repository or copy files
   ```

4. Install dependencies and build the application:
   ```bash
   cd /opt/geant4-geometry-editor
   npm ci
   npm run build
   ```

5. Create a systemd service:
   ```bash
   sudo nano /etc/systemd/system/geant4-geometry-editor.service
   ```
   
   Add the following content:
   ```
   [Unit]
   Description=Geant4 Geometry Editor
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/geant4-geometry-editor
   ExecStart=/usr/bin/node /opt/geant4-geometry-editor/server.js
   Restart=on-failure
   Environment=NODE_ENV=production
   Environment=PORT=3001

   [Install]
   WantedBy=multi-user.target
   ```

6. Configure Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/geant4-geometry-editor
   ```
   
   Add the following content:
   ```
   server {
       listen 80;
       server_name _;  # Replace with your domain if available

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. Enable the Nginx site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/geant4-geometry-editor /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. Start and enable the service:
   ```bash
   sudo systemctl enable geant4-geometry-editor
   sudo systemctl start geant4-geometry-editor
   ```

## Managing Your Deployment

### Checking Service Status

```bash
sudo systemctl status geant4-geometry-editor
```

### Viewing Logs

```bash
sudo journalctl -u geant4-geometry-editor
```

### Updating the Application

1. Stop the service:
   ```bash
   sudo systemctl stop geant4-geometry-editor
   ```

2. Pull new code or upload new files to `/opt/geant4-geometry-editor`

3. Rebuild the application:
   ```bash
   cd /opt/geant4-geometry-editor
   npm ci
   npm run build
   ```

4. Restart the service:
   ```bash
   sudo systemctl start geant4-geometry-editor
   ```

## Setting Up HTTPS

Securing your application with HTTPS is highly recommended. The installer script includes an option to set up HTTPS automatically, but you can also set it up manually following these steps:

1. Install Certbot and the Nginx plugin:
   ```bash
   sudo apt-get update
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

2. Obtain and install a certificate:
   
   **With a domain name (recommended):**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```
   
   **Without a domain (using IP only):**
   ```bash
   sudo certbot --nginx
   ```

3. Set up automatic renewal:
   ```bash
   echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
   ```

After setting up HTTPS, your application will be accessible via `https://yourdomain.com` or `https://your-server-ip`.

## Security Considerations

- Implement proper authentication if the editor will be publicly accessible
- Regularly update the server and dependencies to patch security vulnerabilities
- Consider setting up a firewall (UFW) to restrict access to necessary ports only

## Backup and Recovery

The application stores geometry objects in the `/opt/geant4-geometry-editor/objects` directory. 
Make regular backups of this directory to prevent data loss.

```bash
# Example backup command
sudo tar -czf /backup/geant4-objects-$(date +%Y%m%d).tar.gz /opt/geant4-geometry-editor/objects
```
