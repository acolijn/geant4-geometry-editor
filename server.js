/**
 * Simple Express server for handling object storage operations
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const BASE_PATH = process.env.BASE_PATH || '';

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files with proper base path handling
if (BASE_PATH) {
  app.use(BASE_PATH, express.static(path.join(__dirname, 'dist')));
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Ensure objects directory exists
const objectsDir = path.join(__dirname, 'objects');
if (!fs.existsSync(objectsDir)) {
  fs.mkdirSync(objectsDir, { recursive: true });
  console.log(`Created objects directory at: ${objectsDir}`);
}

// API Routes
const apiPath = BASE_PATH ? `${BASE_PATH}/api` : '/api';

app.post(`${apiPath}/objects/save`, (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Name and data are required' });
    }
    
    const fileName = `${name}.json`;
    const filePath = path.join(objectsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      fileName,
      message: `Object "${name}" saved successfully`
    });
  } catch (error) {
    console.error('Error saving object:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get(`${apiPath}/objects/list`, (req, res) => {
  try {
    const files = fs.readdirSync(objectsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const objects = jsonFiles.map(file => {
      try {
        const filePath = path.join(objectsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        return {
          name: data.metadata?.name || file.replace('.json', ''),
          description: data.metadata?.description || '',
          updatedAt: data.metadata?.updatedAt || '',
          fileName: file
        };
      } catch (err) {
        console.warn(`Error reading file ${file}:`, err);
        return {
          name: file.replace('.json', ''),
          description: 'Error reading metadata',
          fileName: file
        };
      }
    });
    
    res.json({
      success: true,
      objects
    });
  } catch (error) {
    console.error('Error listing objects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get(`${apiPath}/objects/load/:fileName`, (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(objectsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `Object "${fileName}" not found`
      });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    res.json({
      success: true,
      data,
      message: `Object "${fileName}" loaded successfully`
    });
  } catch (error) {
    console.error(`Error loading object ${req.params.fileName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Catch-all route for SPA
if (BASE_PATH) {
  app.get(`${BASE_PATH}/*`, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  
  // Redirect from root to base path if accessing the root
  app.get('/', (req, res) => {
    res.redirect(BASE_PATH);
  });
} else {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Objects directory: ${objectsDir}`);
});
