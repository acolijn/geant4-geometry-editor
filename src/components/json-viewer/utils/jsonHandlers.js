/**
 * JSON Viewer Handlers
 * 
 * This module contains handler functions for downloading and uploading JSON data
 * for the Geant4 Geometry Editor.
 */

import { debugLog } from '../../../utils/logger.js';

/**
 * Handle download of JSON file
 * 
 * @param {string} content - JSON content to download
 * @param {string} filename - Name of the file to download
 */
export const handleDownload = (content, filename) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Handle file upload and parse JSON content
 * 
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} Parsed JSON object
 */
export const handleFileUpload = (file) => {
  debugLog('handleFileUpload:: Starting file upload for:', file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        debugLog('handleFileUpload:: File read successfully, parsing JSON');
        const jsonContent = JSON.parse(event.target.result);
        debugLog('handleFileUpload:: JSON parsed successfully:', jsonContent);
        resolve(jsonContent);
      } catch (error) {
        console.error('handleFileUpload:: Error parsing JSON:', error);
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };
    
    reader.onerror = (error) => {
      console.error('handleFileUpload:: Error reading file:', error);
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};


