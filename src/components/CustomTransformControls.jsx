import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';

// Custom TransformControls wrapper component
function CustomTransformControls({ object, mode, enabled, onTransformStart, onTransformEnd, onTransformChange }) {
  const transformRef = useRef();
  const { camera } = useThree();
  
  // Update mode when it changes
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(mode);
    }
  }, [mode]);
  
  // Setup event listeners
  useEffect(() => {
    const controls = transformRef.current;
    if (controls && enabled) {
      // Handle transform start
      const handleMouseDown = () => {
        if (onTransformStart) onTransformStart();
      };
      
      // Handle transform end
      const handleMouseUp = () => {
        if (onTransformEnd) onTransformEnd();
      };
      
      // Handle transform change (during dragging)
      const handleObjectChange = () => {
        if (onTransformChange) onTransformChange();
      };
      
      controls.addEventListener('mouseDown', handleMouseDown);
      controls.addEventListener('mouseUp', handleMouseUp);
      controls.addEventListener('objectChange', handleObjectChange);
      
      return () => {
        controls.removeEventListener('mouseDown', handleMouseDown);
        controls.removeEventListener('mouseUp', handleMouseUp);
        controls.removeEventListener('objectChange', handleObjectChange);
      };
    }
  }, [enabled, onTransformStart, onTransformEnd, onTransformChange]);
  
  return (
    <TransformControls
      ref={transformRef}
      object={object}
      mode={mode}
      size={0.75}
      camera={camera}
      enabled={enabled}
    />
  );
}

export default CustomTransformControls;
