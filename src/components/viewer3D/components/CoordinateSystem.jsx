import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CoordinateSystem component
 * Renders XYZ axes in the scene for better orientation
 */
function CoordinateSystem() {
  const { scene } = useThree();
  
  useEffect(() => {
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);
    
    return () => {
      scene.remove(axesHelper);
    };
  }, [scene]);
  
  return null;
}

export default CoordinateSystem;
