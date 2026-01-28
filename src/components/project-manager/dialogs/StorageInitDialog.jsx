/**
 * StorageInitDialog.jsx
 * Dialog for selecting storage method (File System or Browser Storage)
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';

const StorageInitDialog = ({
  open,
  onClose,
  isLoading,
  isFileSystemAccessSupported,
  onInitializeFileSystem,
  onInitializeIndexedDB
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Storage Method</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Choose how you want to store your projects and objects:
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* File System Option - only show if supported */}
          {isFileSystemAccessSupported && (
            <Box 
              sx={{ 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1, 
                p: 2,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Typography variant="h6" gutterBottom>
                <FolderIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                File System Storage
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Store files in a folder on your computer. Data persists between browser sessions and can be backed up easily.
              </Typography>
              <Chip 
                label="Recommended" 
                size="small" 
                color="success" 
                sx={{ mb: 1 }} 
              />
              <Button 
                onClick={onInitializeFileSystem}
                variant="contained"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <FolderIcon />}
                fullWidth
              >
                Select Directory
              </Button>
            </Box>
          )}
          
          {/* IndexedDB / Browser Storage Option */}
          <Box 
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Typography variant="h6" gutterBottom>
              <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Browser Storage
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Store data in your browser's local database. Works in all browsers (Firefox, Safari, Chrome, Edge).
              {!isFileSystemAccessSupported && ' This is the only option available in your current browser.'}
            </Typography>
            {!isFileSystemAccessSupported && (
              <Chip 
                label="Recommended for your browser" 
                size="small" 
                color="primary" 
                sx={{ mb: 1 }} 
              />
            )}
            <Alert severity="info" sx={{ mb: 1 }}>
              Data is stored locally in your browser and persists between sessions. 
              You can export your data as JSON files for backup.
            </Alert>
            <Button 
              onClick={onInitializeIndexedDB}
              variant={isFileSystemAccessSupported ? "outlined" : "contained"}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <StorageIcon />}
              fullWidth
            >
              Use Browser Storage
            </Button>
          </Box>
        </Box>
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Initializing storage system...
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StorageInitDialog;
