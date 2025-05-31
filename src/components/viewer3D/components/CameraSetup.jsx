import React, { useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * CameraSetup component
 * Handles camera configuration and controls
 * Sets up the initial camera position and orientation
 */
function CameraSetup({ setFrontViewCamera, worldSize }) {
  const { camera, controls } = useThree();
  const controlsRef = useRef(null);
  
  // Calculate camera distance based on world size
  // Using the implementation from Viewer3D.jsx (factor of 2 instead of 1.75)
  const calculateCameraDistance = useCallback(() => {
    // Get the maximum dimension of the world volume
    const maxDimension = Math.max(
      worldSize?.x || 2000,
      worldSize?.y || 2000,
      worldSize?.z || 2000
    );
    
    // Set camera distance to be 2x the maximum dimension to ensure everything is visible
    // This allows the camera to scale properly with larger world volumes
    return -2 * maxDimension;
  }, [worldSize]);
  
  // Function to set front view
  const setFrontView = useCallback(() => {
    const cameraDistance = calculateCameraDistance();
    camera.position.set(0, cameraDistance, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1); // Maintain z-axis as up direction
    camera.updateProjectionMatrix();
  }, [camera, calculateCameraDistance]);
  
  // Update controls reference when available
  useEffect(() => {
    if (controls && !controlsRef.current) {
      controlsRef.current = controls;
      
      // Set maxDistance based on world size
      if (controlsRef.current) {
        const distance = Math.abs(calculateCameraDistance());
        controlsRef.current.maxDistance = distance * 10;
      }
    }
  }, [controls, calculateCameraDistance]);
  
  // Set front view on initial load with z-axis pointing upward
  useEffect(() => {
    // Position camera to look at the scene from the front (y-axis)
    // with z-axis pointing upward
    setFrontView();
    
    // Store the camera and setFrontView function for external access
    if (setFrontViewCamera) {
      setFrontViewCamera({
        camera,
        setFrontView,
        calculateCameraDistance
      });
    }
    
    // Update camera far clipping plane based on world size
    if (camera) {
      camera.far = Math.abs(calculateCameraDistance()) * 4;
      camera.updateProjectionMatrix();
    }
  }, [camera, setFrontViewCamera, setFrontView, calculateCameraDistance]);
  
  return null;
}

export default CameraSetup;
