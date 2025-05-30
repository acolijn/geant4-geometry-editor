import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * CameraSetup component
 * Handles camera configuration and controls
 * Sets up the initial camera position and orientation
 */
function CameraSetup({ setFrontViewCamera, worldSize }) {
  const { camera } = useThree();
  
  // Calculate camera distance based on world size
  const calculateCameraDistance = () => {
    // Get the maximum dimension of the world volume
    const maxDimension = Math.max(
      worldSize?.x || 2000,
      worldSize?.y || 2000,
      worldSize?.z || 2000
    );
    
    // Set camera distance to be 1.75x the maximum dimension
    // This provides enough space to view the entire world volume
    return -1.75 * maxDimension;
  };
  
  // Set front view on initial load with z-axis pointing upward
  useEffect(() => {
    // Position camera to look at the scene from the front (y-axis)
    // with z-axis pointing upward
    const cameraDistance = calculateCameraDistance();
    camera.position.set(0, cameraDistance, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1); // Set z-axis as the up direction
    
    // Store the camera in the ref for the front view button
    if (setFrontViewCamera) {
      setFrontViewCamera(camera);
    }
  }, [camera, setFrontViewCamera, worldSize]);
  
  return null;
}

export default CameraSetup;
