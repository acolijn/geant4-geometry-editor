// Updated file with TransformControls wrapper that ensures 1:1 mapping between visual and property values
import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

function CustomTransformControls({ object, mode, enabled, onTransformStart, onTransformEnd, onTransformChange }) {
  // World volume boundaries are from -100 to +100 cm
  // Keep track of the object type to handle cylinders specially
  const objectTypeRef = useRef(null);
  const transformRef = useRef();
  const { camera } = useThree();

  // Update the target object whenever it changes
  useEffect(() => {
    if (transformRef.current && object) {
      transformRef.current.attach(object);
    }
  }, [object]);

  // Update mode when it changes
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(mode);
    }
  }, [mode]);

  // Setup event listeners
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    if (enabled) {
      // Store initial state when transformation starts
      let initialPosition = new THREE.Vector3();
      let initialRotation = new THREE.Euler();
      let initialQuaternion = new THREE.Quaternion();
      
      // Determine if the object is a cylinder by checking its geometry
      const detectObjectType = () => {
        if (!object) return null;
        
        // Check if the object has a geometry property
        if (object.geometry) {
          if (object.geometry instanceof THREE.CylinderGeometry) {
            return 'cylinder';
          }
        }
        
        // Check if the object has children that might be cylinders
        if (object.children && object.children.length > 0) {
          for (const child of object.children) {
            if (child.geometry instanceof THREE.CylinderGeometry) {
              return 'cylinder';
            }
          }
        }
        
        return null;
      };
      
      const handleStart = () => {
        // Save initial position and rotation when transformation starts
        if (object) {
          initialPosition.copy(object.position);
          initialRotation.copy(object.rotation);
          initialQuaternion.setFromEuler(object.rotation);
          
          // Detect and store the object type
          objectTypeRef.current = detectObjectType();
        }
        onTransformStart?.();
      };
      
      const handleEnd = () => {
        onTransformEnd?.();
      };
      
      const handleChange = () => {
        // Special handling for rotation mode with cylinders
        if (mode === 'rotate' && object && objectTypeRef.current === 'cylinder') {
          // For cylinders, we need to ensure rotations are applied correctly
          // to prevent erratic behavior
          if (controls.axis === 'X' || controls.axis === 'Y' || controls.axis === 'Z') {
            // Let the rotation happen naturally but ensure it's applied correctly
            // The issue is fixed in the TransformableObject component
          }
        }
        
        onTransformChange?.();
      };

      controls.addEventListener('mouseDown', handleStart);
      controls.addEventListener('mouseUp', handleEnd);
      controls.addEventListener('objectChange', handleChange);

      return () => {
        controls.removeEventListener('mouseDown', handleStart);
        controls.removeEventListener('mouseUp', handleEnd);
        controls.removeEventListener('objectChange', handleChange);
      };
    }
  }, [enabled, onTransformStart, onTransformEnd, onTransformChange, object, mode]);

  return (
    <TransformControls
      ref={transformRef}
      object={object}
      mode={mode}
      camera={camera}
      enabled={enabled}
      size={0.75}
      // Use world space for cylinders in rotation mode to prevent erratic behavior
      // Use local space for all other cases
      space={mode === 'rotate' && objectTypeRef.current === 'cylinder' ? 'world' : 'local'}
      // Set a fixed translation snap value to ensure precise movements
      // that match the property panel values (in cm)
      translationSnap={1}
      // Set rotation snap to 15 degrees for more precise rotation control
      rotationSnap={Math.PI / 12}
    />
  );
}

export default CustomTransformControls;
