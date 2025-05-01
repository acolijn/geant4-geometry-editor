// Updated file with TransformControls wrapper that ensures 1:1 mapping between visual and property values
import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

function CustomTransformControls({ object, mode, enabled, onTransformStart, onTransformEnd, onTransformChange }) {
  // World volume boundaries are from -100 to +100 cm
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
      
      const handleStart = () => {
        // Save initial position and rotation when transformation starts
        if (object) {
          initialPosition.copy(object.position);
          initialRotation.copy(object.rotation);
        }
        onTransformStart?.();
      };
      
      const handleEnd = () => {
        onTransformEnd?.();
      };
      
      const handleChange = () => {
        // Ensure the transform controls apply a 1:1 mapping
        // between visual movement and property values
        if (mode === 'translate' && object) {
          // We don't need to modify anything here as we've fixed the nesting issue
          // in the Scene component. The object's position now directly reflects
          // the actual position in world space.
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
      space="local"
      // Set a fixed translation snap value to ensure precise movements
      // that match the property panel values (in cm)
      translationSnap={1}
      // Set rotation snap to 15 degrees for more precise rotation control
      rotationSnap={Math.PI / 12}
    />
  );
}

export default CustomTransformControls;
