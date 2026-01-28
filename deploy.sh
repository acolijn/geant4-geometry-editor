#!/bin/bash

# Deployment script for Geant4 Geometry Editor
# This script builds the project and copies it to the production location

set -e  # Exit on error

echo "Building project..."
npm run build

echo ""
echo "Build complete! Files are in ./dist/"
echo ""
echo "To deploy to production, run:"
echo "  rsync -avz --delete dist/ user@g4-editor.nikhef.nl:/path/to/webroot/"
echo ""
echo "Or if using local deployment:"
echo "  sudo cp -r dist/* /var/www/html/g4-editor/"
echo ""
echo "After deployment, users may need to hard refresh (Ctrl+Shift+R) to clear cache."
