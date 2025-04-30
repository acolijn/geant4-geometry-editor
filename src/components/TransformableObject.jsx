import React, { useState, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CustomTransformControls from './CustomTransformControls';
import BoxObject from './BoxObject';
import CylinderObject from './CylinderObject';
import SphereObject from './SphereObject';

// TransformableObject component to handle transform controls
function TransformableObject({ object, objectKey, isSelected, transformMode, onSelect, onTransformEnd }) {
  const meshRef = useRef();
  const { gl } = useThree();
  
  // This tracks if we're currently transforming
  const [isTransforming, setIsTransforming] = useState(false);
  
  // Check if this is the World volume
  const isWorld = object.name === 'World';
  
  // Handle transform start
  const handleTransformStart = useCallback(() => {
    setIsTransforming(true);
    gl.domElement.style.cursor = 'grabbing';
    
    // Ensure this object stays selected
    onSelect(objectKey);
    
    // Disable orbit controls during transformation
    const controls = gl.domElement.parentElement?.__r3f?.controls;
    if (controls) {
      controls.enabled = false;
    }
  }, [gl, objectKey, onSelect]);
  
  // Handle transform change (during dragging)
  const handleTransformChange = useCallback(() => {
    if (!isTransforming || !meshRef.current) return;
    
    // Get current transform values
    const position = meshRef.current.position;
    const rotation = meshRef.current.rotation;
    const scale = meshRef.current.scale;
    
    // Convert to the format expected by the application
    const newPosition = {
      x: parseFloat(position.x.toFixed(3)),
      y: parseFloat(position.y.toFixed(3)),
      z: parseFloat(position.z.toFixed(3)),
      unit: object.position?.unit || 'cm'
    };
    
    // Convert THREE.js Euler rotations to Geant4-compatible sequential rotations
    // In Geant4: first rotateX, then rotateY around new Y, then rotateZ around new Z
    // We need to extract these sequential angles from the THREE.js Euler rotation
    
    // Get the rotation matrix from the current Euler angles
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationFromEuler(rotation);
    
    // Extract the sequential rotation angles (in degrees)
    // This is an approximation that works for most cases
    const rotationOrder = 'XYZ'; // THREE.js default rotation order
    const eulerDegrees = {
      x: parseFloat((rotation.x * 180 / Math.PI).toFixed(3)),
      y: parseFloat((rotation.y * 180 / Math.PI).toFixed(3)),
      z: parseFloat((rotation.z * 180 / Math.PI).toFixed(3)),
      unit: object.rotation?.unit || 'deg'
    };
    
    // For real-time updates, we don't apply scale changes during dragging
    // We'll only update position and rotation
    onTransformEnd(objectKey, {
      position: newPosition,
      rotation: eulerDegrees
    }, true);
    
    // Ensure object stays selected during transformation
    onSelect(objectKey);
  }, [isTransforming, meshRef, object, objectKey, onTransformEnd, onSelect]);
  
  // Handle transform end
  const handleTransformEnd = useCallback(() => {
    if (!isTransforming) return;
    
    // Only update the position when the transformation is complete
    if (meshRef.current) {
      const position = meshRef.current.position;
      const rotation = meshRef.current.rotation;
      const scale = meshRef.current.scale;
      
      // Convert to the format expected by the application
      const newPosition = {
        x: parseFloat(position.x.toFixed(3)),
        y: parseFloat(position.y.toFixed(3)),
        z: parseFloat(position.z.toFixed(3)),
        unit: object.position?.unit || 'cm'
      };
      
      // Convert THREE.js Euler rotations to Geant4-compatible sequential rotations
      // In Geant4: first rotateX, then rotateY around new Y, then rotateZ around new Z
      // We need to extract these sequential angles from the THREE.js Euler rotation
      
      // Get the rotation matrix from the current Euler angles
      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeRotationFromEuler(rotation);
      
      // Extract the sequential rotation angles (in degrees)
      // This is an approximation that works for most cases
      const newRotation = {
        x: parseFloat((rotation.x * 180 / Math.PI).toFixed(3)),
        y: parseFloat((rotation.y * 180 / Math.PI).toFixed(3)),
        z: parseFloat((rotation.z * 180 / Math.PI).toFixed(3)),
        unit: object.rotation?.unit || 'deg'
      };
      
      // For box objects, we need to update the size based on scale
      let newSize;
      if (object.type === 'box' && object.size) {
        newSize = {
          x: parseFloat((object.size.x * scale.x).toFixed(3)),
          y: parseFloat((object.size.y * scale.y).toFixed(3)),
          z: parseFloat((object.size.z * scale.z).toFixed(3)),
          unit: object.size.unit || 'cm'
        };
      }
      
      // For cylinders and spheres, update radius, height, and innerRadius
      let newRadius, newHeight, newInnerRadius;
      if (object.type === 'cylinder') {
        // For cylinders, x and z scale affect radius, y affects height
        // Since we rotated the cylinder to align with z-axis, we need to adjust which scale affects what
        newRadius = parseFloat((object.radius * ((scale.x + scale.z) / 2)).toFixed(3));
        newHeight = parseFloat((object.height * scale.y).toFixed(3));
        // Also update innerRadius if it exists
        if (object.innerRadius !== undefined) {
          newInnerRadius = parseFloat((object.innerRadius * ((scale.x + scale.z) / 2)).toFixed(3));
        }
        console.log('Updating cylinder dimensions:', { 
          newRadius, 
          newHeight, 
          newInnerRadius, 
          objectKey,
          type: object.type,
          name: object.name
        });
      } else if (object.type === 'sphere') {
        // For spheres, use average scale for radius
        newRadius = parseFloat((object.radius * ((scale.x + scale.y + scale.z) / 3)).toFixed(3));
      }
      
      // Call the callback with the updated object
      const updatedProps = {
        position: newPosition,
        rotation: newRotation,
        ...(newSize && { size: newSize }),
        ...(newRadius !== undefined && { radius: newRadius }),
        ...(newHeight !== undefined && { height: newHeight }),
        ...(newInnerRadius !== undefined && { innerRadius: newInnerRadius })
      };
      
      console.log('Applying transform updates:', { objectKey, ...updatedProps });
      onTransformEnd(objectKey, updatedProps, true);
      
      // Reset scale after applying it to the dimensions
      meshRef.current.scale.set(1, 1, 1);
    }
    
    // Re-enable orbit controls
    const controls = gl.domElement.parentElement?.__r3f?.controls;
    if (controls) {
      controls.enabled = true;
    }
    
    gl.domElement.style.cursor = 'auto';
    setIsTransforming(false);
    
    // Force selection to stay on this object after transformation
    onSelect(objectKey);
  }, [isTransforming, meshRef, object, objectKey, onTransformEnd, gl, onSelect]);
  
  return (
    <group>
      {/* Render the appropriate mesh first */}
      {object.type === 'box' && (
        <BoxObject
          ref={meshRef}
          object={object}
          isSelected={isSelected}
          onClick={() => onSelect(objectKey)}
        />
      )}
      {object.type === 'cylinder' && (
        <CylinderObject
          ref={meshRef}
          object={object}
          isSelected={isSelected}
          onClick={() => onSelect(objectKey)}
        />
      )}
      {object.type === 'sphere' && (
        <SphereObject
          ref={meshRef}
          object={object}
          isSelected={isSelected}
          onClick={() => onSelect(objectKey)}
        />
      )}
      
      {/* Add transform controls after the mesh is rendered, but not for World */}
      {isSelected && meshRef.current && !isWorld && (
        <CustomTransformControls
          object={meshRef}
          mode={transformMode}
          enabled={isSelected}
          onTransformStart={handleTransformStart}
          onTransformChange={handleTransformChange}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </group>
  );
}

export default TransformableObject;
