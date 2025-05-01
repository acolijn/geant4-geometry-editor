// Simple TransformControls wrapper with cylinder rotation fix
import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

function CustomTransformControls({ object, mode, enabled, onTransformStart, onTransformEnd, onTransformChange }) {
  // Simple reference to detect if the object is a cylinder
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
      // Simple event handlers that call the callbacks
      const handleStart = () => {
        onTransformStart?.();
      };
      
      const handleEnd = () => {
        onTransformEnd?.();
      };
      
      const handleChange = () => {
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
    />
  );
}

export default CustomTransformControls;
