// TransformableObject with flat structure and world positions
import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Box from './shapes/Box.jsx';
import Cylinder from './shapes/Cylinder.jsx';
import Sphere from './shapes/Sphere.jsx';
import Trapezoid from './shapes/Trapezoid.jsx';
import Torus from './shapes/Torus.jsx';
import Ellipsoid from './shapes/Ellipsoid.jsx';
import Polycone from './shapes/Polycone.jsx';

const radToDeg = (r) => THREE.MathUtils.radToDeg(r);
const degToRad = (d) => THREE.MathUtils.degToRad(d);

export default function TransformableObject({ 
  object, 
  objectKey, 
  transformMode, 
  isSelected, 
  onSelect, 
  onTransformEnd,
  worldPosition,
  worldRotation
}) {
  const groupRef = useRef();
  const transformRef = useRef();
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const lastPositionRef = useRef(null); // Track last position to prevent jumps

  // Apply incoming props unless dragging
  useEffect(() => {
    const group = groupRef.current;
    if (!group || isDragging) return;

    // Use world position if provided, otherwise use object's own position
    if (worldPosition) {
      group.position.set(worldPosition[0], worldPosition[1], worldPosition[2]);
    } else {
      const [x, y, z] = object.position ? [object.position.x, object.position.y, object.position.z] : [0, 0, 0];
      group.position.set(x, y, z);
    }
    
    // Use world rotation if provided, otherwise use object's own rotation
    if (worldRotation) {
      group.rotation.set(worldRotation[0], worldRotation[1], worldRotation[2]);
    } else {
      const [rx, ry, rz] = object.rotation
        ? [degToRad(object.rotation.x), degToRad(object.rotation.y), degToRad(object.rotation.z)]
        : [0, 0, 0];
      group.rotation.set(rx, ry, rz);
    }
    
    // Store the current position for comparison during dragging
    lastPositionRef.current = { 
      position: worldPosition ? { x: worldPosition[0], y: worldPosition[1], z: worldPosition[2] } : { ...object.position },
      rotation: worldRotation ? { x: radToDeg(worldRotation[0]), y: radToDeg(worldRotation[1]), z: radToDeg(worldRotation[2]) } : { ...object.rotation }
    };
  }, [object.position, object.rotation, worldPosition, worldRotation, isDragging]);

  // Sync transform mode to control
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Handle drag and update geometry during interaction
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls || !isSelected) return;

    // Track changes during dragging
    const handleChange = () => {
      if (!isDragging) return;
      
      const group = groupRef.current;
      if (!group) return;
      
      // Calculate the delta from the original position
      const originalPosition = lastPositionRef.current?.position || { x: 0, y: 0, z: 0 };
      
      // Get current world position from the group
      const currentPosition = {
        x: group.position.x,
        y: group.position.y,
        z: group.position.z,
        unit: object.position?.unit || 'cm'
      };
      
      // Convert world rotation to degrees for the data model
      const currentRotation = {
        x: radToDeg(group.rotation.x),
        y: radToDeg(group.rotation.y),
        z: radToDeg(group.rotation.z),
        unit: object.rotation?.unit || 'deg'
      };
      
      // For objects with a parent, we need to convert world position to local position
      // This is handled by the parent component that calculates world positions
      
      // Send live updates to parent - use the current world position directly
      onTransformEnd(objectKey, { 
        position: currentPosition, 
        rotation: currentRotation 
      });
    };

    // Start dragging
    const handleMouseDown = () => {
      setIsDragging(true);
      gl.domElement.style.cursor = 'grabbing';
      
      // Store the current position at the start of dragging
      const group = groupRef.current;
      if (group) {
        lastPositionRef.current = {
          position: {
            x: group.position.x,
            y: group.position.y,
            z: group.position.z
          },
          rotation: {
            x: radToDeg(group.rotation.x),
            y: radToDeg(group.rotation.y),
            z: radToDeg(group.rotation.z)
          }
        };
      }
    };

    // End dragging and finalize position
    const handleMouseUp = () => {
      const group = groupRef.current;
      if (group) {
        // Get final world position after drag
        const finalPosition = {
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
          unit: object.position?.unit || 'cm'
        };
        
        // Get final world rotation after drag
        const finalRotation = {
          x: radToDeg(group.rotation.x),
          y: radToDeg(group.rotation.y),
          z: radToDeg(group.rotation.z),
          unit: object.rotation?.unit || 'deg'
        };
        
        // Send final update to parent with world coordinates
        // The parent component will handle converting to local coordinates if needed
        onTransformEnd(objectKey, { 
          position: finalPosition, 
          rotation: finalRotation 
        });
      }
      
      // Reset drag state
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
    };

    // Set up event listeners
    controls.addEventListener('objectChange', handleChange);
    controls.addEventListener('mouseDown', handleMouseDown);
    controls.addEventListener('mouseUp', handleMouseUp);

    return () => {
      controls.removeEventListener('objectChange', handleChange);
      controls.removeEventListener('mouseDown', handleMouseDown);
      controls.removeEventListener('mouseUp', handleMouseUp);
    };
  }, [gl, isSelected, object, onTransformEnd, isDragging, objectKey]);

  // Shared props for all shape types
  const sharedProps = {
    ref: groupRef,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: object.color,
    wireframe: object.name === 'World',
    selected: isSelected,
    onClick: (e) => {
      e.stopPropagation();
      onSelect();
    }
  };

  // Debug log the object properties to help diagnose rendering issues
  console.log(`RENDER - Object ${object.name} of type ${object.type}:`, {
    objectProps: object,
    size: object.size,
    innerRadius: object.innerRadius,
    inner_radius: object.inner_radius,
    worldPosition,
    worldRotation
  });
  
  // Force a default size for box objects if size is missing
  let boxSize = [1, 1, 1];
  if (object.type === 'box') {
    if (object.size) {
      boxSize = [object.size.x || 1, object.size.y || 1, object.size.z || 1];
    } else {
      console.warn(`RENDER WARNING - Box object ${object.name} missing size property, using default size`);
    }
  }
  
  return (
    <>
      {object.type === 'box' && (
        <Box 
          size={boxSize} 
          {...sharedProps} 
        />
      )}
      {object.type === 'cylinder' && (
        <Cylinder 
          radius={object.radius || 1} 
          height={object.height || 1} 
          innerRadius={object.innerRadius || object.inner_radius || 0} 
          {...sharedProps} 
        />
      )}
      {object.type === 'sphere' && (
        <Sphere 
          radius={object.radius || 1} 
          {...sharedProps} 
        />
      )}
      {object.type === 'trapezoid' && (
        <Trapezoid 
          size={[
            object.dx1 || 5, // Half-length in x at -z/2
            object.dx2 || 5, // Half-length in x at +z/2
            object.dy1 || 5, // Half-length in y at -z/2
            object.dy2 || 5, // Half-length in y at +z/2
            object.dz || 5    // Half-length in z
          ]} 
          {...sharedProps} 
          color="rgba(255, 150, 100, 0.7)"
        />
      )}
      {object.type === 'torus' && (
        <Torus 
          size={[
            object.majorRadius || 5,
            object.minorRadius || 1
          ]} 
          {...sharedProps} 
          color="rgba(255, 100, 100, 0.7)"
        />
      )}
      {object.type === 'ellipsoid' && (
        <Ellipsoid 
          size={[
            object.xRadius || 5,
            object.yRadius || 3,
            object.zRadius || 4
          ]} 
          {...sharedProps} 
          color="rgba(100, 255, 255, 0.7)"
        />
      )}
      {object.type === 'polycone' && (
        <Polycone 
          zSections={object.zSections || [
            { z: -5, rMin: 0, rMax: 3 },
            { z: 0, rMin: 0, rMax: 5 },
            { z: 5, rMin: 0, rMax: 2 }
          ]} 
          {...sharedProps} 
          color="rgba(255, 200, 100, 0.7)"
        />
      )}

      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          size={0.75}
          camera={camera}
          enabled
          space="local"
          // Set transform controls to use world space for translation
          // but local space for rotation and scaling
          translationSnap={null}
          rotationSnap={null}
          scaleSnap={null}
        />
      )}
    </>
  );
}
