import React from 'react';
import { Box } from '@mui/material';
import { getVolumeIcon } from '../utils/geometryIcons';

/**
 * Renders a hierarchical tree of volumes for mother volume selection
 * This is used by both PropertyEditor and AddNewTab components
 * 
 * @param {Object} params - Parameters for rendering the tree
 * @param {Object} params.geometries - The geometry data
 * @param {Object} params.expandedNodes - Map of expanded node keys
 * @param {Function} params.toggleNodeExpansion - Function to toggle node expansion
 * @param {Function} params.handleSelect - Function to handle volume selection
 * @param {string} params.selectedValue - Currently selected volume name
 * @param {string} params.currentVolumeKey - Key of the current volume (to prevent circular references)
 * @returns {JSX.Element} The rendered tree
 */
export const renderMotherVolumeTree = ({
  geometries,
  expandedNodes,
  toggleNodeExpansion,
  handleSelect,
  selectedValue,
  currentVolumeKey
}) => {
  // Create a map of volume name to index for quick lookup
  const volumeNameToIndex = {};
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    volumeNameToIndex[volume.name] = index;
  });
  
  // Group volumes by their parent
  const volumesByParent = {};
  volumesByParent['world'] = []; // Volumes with World as parent
  
  // Initialize volume groups for all volumes
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    volumesByParent[key] = []; // Initialize empty array for each volume
  });
  
  // Populate the groups
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    const parentKey = volume.mother_volume && volume.mother_volume !== 'World' ?
      `volume-${volumeNameToIndex[volume.mother_volume]}` : 'world';
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  // Recursive function to render tree items
  const renderTreeItems = (parentKey, level = 0) => {
    // Skip rendering the current volume and its children to prevent circular dependencies
    if (parentKey !== 'world' && parentKey === currentVolumeKey) return null;
    
    // Sort volumes alphabetically
    const sortedVolumes = [...(volumesByParent[parentKey] || [])].sort((a, b) => {
      const nameA = a.volume.g4name || a.volume.name || '';
      const nameB = b.volume.g4name || b.volume.name || '';
      return nameA.localeCompare(nameB);
    });
    
    return sortedVolumes.map(({ volume, key, index }) => {
      // Skip the current volume to prevent self-reference
      if (currentVolumeKey === key) return null;
      
      // Check if this volume has children
      const hasChildren = volumesByParent[key] && volumesByParent[key].length > 0;
      
      // Get icon for the volume type
      const icon = getVolumeIcon(volume);
      
      return (
        <Box key={`mother-${index}`} sx={{ mb: 0.5 }}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              pl: level * 2,
              py: 0.5,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              },
              ...(volume.name === selectedValue && {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                fontWeight: 'bold'
              })
            }}
            onClick={(e) => handleSelect(volume.name, e)}
          >
            {/* Expand/collapse icon - only show if node has children */}
            {hasChildren && (
              <Box 
                onClick={(e) => {
                  e.stopPropagation(); // Stop event from bubbling up to parent
                  toggleNodeExpansion(key, e);
                }} 
                sx={{ 
                  mr: 0.5, 
                  cursor: 'pointer',
                  color: '#555',
                  fontSize: '14px',
                  width: '16px',
                  textAlign: 'center',
                  display: 'inline-block'
                }}
              >
                {expandedNodes[key] ? '▼' : '►'}
              </Box>
            )}
            {/* If no children, add spacing to align with nodes that have the toggle */}
            {!hasChildren && <Box sx={{ width: '16px', mr: 0.5, display: 'inline-block' }}></Box>}
            
            <Box component="span" sx={{ mr: 0.5 }}>{icon}</Box>
            <Box component="span">
              {volume.g4name || volume.name}
            </Box>
          </Box>
          
          {/* Only render children if node is expanded */}
          {hasChildren && expandedNodes[key] && (
            <Box>
              {renderTreeItems(key, level + 1)}
            </Box>
          )}
        </Box>
      );
    });
  };
  
  return (
    <Box>
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 0.5,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          },
          ...('World' === selectedValue && {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            fontWeight: 'bold'
          })
        }}
        onClick={(e) => handleSelect('World', e)}
      >
        World
      </Box>
      {renderTreeItems('world')}
    </Box>
  );
};
