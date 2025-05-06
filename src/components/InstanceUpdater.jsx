import React, { useEffect } from 'react';
import { instanceTracker } from '../utils/InstanceTracker';

/**
 * This component is responsible for handling instance updates
 * It doesn't render anything visible but provides global functions
 * for updating instances across the application
 */
const InstanceUpdater = ({ geometries, setGeometries }) => {
  // Set up the global update function when the component mounts
  useEffect(() => {
    // Define the global function for updating all instances
    window.updateAllInstances = (sourceId, updatedObject) => {
      console.log('GLOBAL UPDATE FUNCTION CALLED with sourceId:', sourceId);
      console.log('Object to apply:', updatedObject);
      
      if (!sourceId || !updatedObject) {
        console.error('Missing required parameters for update');
        return { success: false, message: 'Missing parameters', count: 0 };
      }
      
      try {
        // Get all instances with this source ID
        const instances = instanceTracker.getRelatedInstances(sourceId, '');
        console.log('Found instances to update:', instances);
        
        if (instances.length === 0) {
          console.log('No instances to update');
          return { success: true, message: 'No instances to update', count: 0 };
        }
        
        // Create a new copy of geometries to work with
        const newGeometries = JSON.parse(JSON.stringify(geometries));
        let updatedCount = 0;
        
        // Update each instance
        instances.forEach(instance => {
          const index = instance.volumeIndex;
          if (index >= 0 && index < newGeometries.volumes.length) {
            const currentInstance = newGeometries.volumes[index];
            console.log('Updating instance at index', index, 'Current:', currentInstance);
            
            // Create a new instance with updated properties
            const updatedInstance = JSON.parse(JSON.stringify(updatedObject));
            
            // Preserve instance-specific properties
            updatedInstance.name = currentInstance.name;
            updatedInstance.position = currentInstance.position;
            updatedInstance.rotation = currentInstance.rotation;
            updatedInstance.mother_volume = currentInstance.mother_volume;
            updatedInstance._sourceId = sourceId;
            
            // Replace the instance in the volumes array
            newGeometries.volumes[index] = updatedInstance;
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          console.log(`Updated ${updatedCount} instances. New geometries:`, newGeometries);
          setGeometries(newGeometries);
          return { success: true, message: `Updated ${updatedCount} instances`, count: updatedCount };
        }
        
        return { success: true, message: 'No changes made', count: 0 };
      } catch (error) {
        console.error('Error in update function:', error);
        return { success: false, message: error.message, count: 0 };
      }
    };
    
    // Cleanup function to remove the global function when the component unmounts
    return () => {
      delete window.updateAllInstances;
    };
  }, [geometries, setGeometries]); // Re-create the function when geometries changes
  
  // This component doesn't render anything
  return null;
};

export default InstanceUpdater;
