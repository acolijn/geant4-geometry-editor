// Updated TransformableObject with verified pivot alignment
import React, { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Box from './shapes/Box.jsx';
import Cylinder from './shapes/Cylinder.jsx';
import Sphere from './shapes/Sphere.jsx';
import CustomTransformControls from './CustomTransformControls.jsx';

export default function TransformableObject({ object, objectKey, transformMode, isSelected, onSelect, onTransformEnd, isMotherVolume = false }) {
  const meshRef = useRef();
  const transformRef = useRef();
  const { camera, gl } = useThree();
  const [isTransforming, setIsTransforming] = useState(false);
  
  // Store the previous object position to detect changes from properties panel
  const prevObjectRef = useRef(object);

  // Get position and rotation from the object
  const position = [object.position?.x || 0, object.position?.y || 0, object.position?.z || 0];
  const rotation = [
    THREE.MathUtils.degToRad(object.rotation?.x || 0),
    THREE.MathUtils.degToRad(object.rotation?.y || 0),
    THREE.MathUtils.degToRad(object.rotation?.z || 0)
  ];

  // Update transform mode when it changes
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
    }
  }, [transformMode]);
  
  // This effect syncs the mesh position with the object position when changed via properties panel
  useEffect(() => {
    // Skip during active transformations to avoid conflicts
    if (isTransforming) return;
    
    // Check if position or rotation has changed from the properties panel
    const prevPos = prevObjectRef.current?.position || {};
    const prevRot = prevObjectRef.current?.rotation || {};
    const currPos = object?.position || {};
    const currRot = object?.rotation || {};
    
    const positionChanged = 
      prevPos.x !== currPos.x || 
      prevPos.y !== currPos.y || 
      prevPos.z !== currPos.z;
      
    const rotationChanged = 
      prevRot.x !== currRot.x || 
      prevRot.y !== currRot.y || 
      prevRot.z !== currRot.z;
    
    // If position or rotation changed and we have a mesh reference, update it
    if ((positionChanged || rotationChanged) && meshRef.current) {
      // Update the mesh position to match the object position exactly
      // This ensures 1:1 mapping between property values and visual position
      if (positionChanged) {
        meshRef.current.position.set(
          currPos.x || 0,
          currPos.y || 0,
          currPos.z || 0
        );
      }
      
      // Update the mesh rotation to match the object rotation exactly
      if (rotationChanged) {
        meshRef.current.rotation.set(
          THREE.MathUtils.degToRad(currRot.x || 0),
          THREE.MathUtils.degToRad(currRot.y || 0),
          THREE.MathUtils.degToRad(currRot.z || 0)
        );
      }
    }
    
    // Update the previous object reference
    prevObjectRef.current = JSON.parse(JSON.stringify(object));
  }, [object, isTransforming]);

  // Set up transform control event listeners
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls || !isSelected) return;

    const handleStart = () => {
      setIsTransforming(true);
      gl.domElement.style.cursor = 'grabbing';

      // Disable orbit controls during transformation
      const orbitControls = gl.domElement.parentElement?.__r3f?.controls;
      if (orbitControls) {
        orbitControls.enabled = false;
      }
    };

    const handleChange = () => {
      if (!meshRef.current) return;
      
      // Update in real-time during transformation
      const pos = meshRef.current.position;
      const rot = meshRef.current.rotation;
      
      // Ensure exact 1:1 mapping between visual position and property values
      // by using the raw values without any scaling or transformation
      const updated = {
        position: {
          x: parseFloat(pos.x.toFixed(2)),
          y: parseFloat(pos.y.toFixed(2)),
          z: parseFloat(pos.z.toFixed(2)),
          unit: object.position?.unit || 'cm'
        },
        rotation: {
          x: parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(2)),
          y: parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(2)),
          z: parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(2)),
          unit: object.rotation?.unit || 'deg'
        }
      };
      
      // Update in real-time
      onTransformEnd(objectKey, updated, true);
    };

    const handleEnd = () => {
      setIsTransforming(false);
      gl.domElement.style.cursor = 'auto';

      // Re-enable orbit controls
      const orbitControls = gl.domElement.parentElement?.__r3f?.controls;
      if (orbitControls) {
        orbitControls.enabled = true;
      }

      if (meshRef.current) {
        const pos = meshRef.current.position;
        const rot = meshRef.current.rotation;

        // Ensure exact 1:1 mapping between visual position and property values
        // Use exact values without any scaling or transformation
        const updated = {
          position: {
            x: parseFloat(pos.x.toFixed(2)),
            y: parseFloat(pos.y.toFixed(2)),
            z: parseFloat(pos.z.toFixed(2)),
            unit: object.position?.unit || 'cm'
          },
          rotation: {
            x: parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(2)),
            y: parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(2)),
            z: parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(2)),
            unit: object.rotation?.unit || 'deg'
          }
        };

        // Final update with keepSelected=true to maintain selection
        onTransformEnd(objectKey, updated, true);
      }
    };

    controls.addEventListener('mouseDown', handleStart);
    controls.addEventListener('objectChange', handleChange);
    controls.addEventListener('mouseUp', handleEnd);

    return () => {
      controls.removeEventListener('mouseDown', handleStart);
      controls.removeEventListener('objectChange', handleChange);
      controls.removeEventListener('mouseUp', handleEnd);
    };
  }, [gl, isSelected, object, onTransformEnd, objectKey]);

  // Props shared by all shape components
  const sharedProps = {
    ref: meshRef,
    position,
    rotation,
    color: object.color,
    wireframe: object.name === 'World',
    selected: isSelected,
    onClick: (e) => {
      e.stopPropagation();
      onSelect(objectKey);
    }
  };

  return (
    <>
      {/* Render the appropriate shape based on object type */}
      {object.type === 'box' && (
        <Box 
          size={[object.size?.x || 1, object.size?.y || 1, object.size?.z || 1]} 
          {...sharedProps} 
        />
      )}
      {object.type === 'cylinder' && (
        <Cylinder 
          radius={object.radius || 1} 
          height={object.height || 1} 
          innerRadius={object.innerRadius} 
          {...sharedProps} 
        />
      )}
      {object.type === 'sphere' && (
        <Sphere 
          radius={object.radius || 1} 
          {...sharedProps} 
        />
      )}

      {/* Attach custom transform controls directly to the mesh */}
      {isSelected && meshRef.current && (
        <CustomTransformControls
          ref={transformRef}
          object={meshRef.current}
          mode={transformMode}
          enabled={true}
          onTransformStart={() => setIsTransforming(true)}
          onTransformEnd={() => {
            setIsTransforming(false);
            if (meshRef.current) {
              const pos = meshRef.current.position;
              const rot = meshRef.current.rotation;
              
              const updated = {
                position: {
                  x: parseFloat(pos.x.toFixed(3)),
                  y: parseFloat(pos.y.toFixed(3)),
                  z: parseFloat(pos.z.toFixed(3)),
                  unit: object.position?.unit || 'cm'
                },
                rotation: {
                  x: parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(3)),
                  y: parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(3)),
                  z: parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(3)),
                  unit: object.rotation?.unit || 'deg'
                }
              };
              
              onTransformEnd(objectKey, updated, true);
            }
          }}
          onTransformChange={() => {
            if (meshRef.current) {
              const pos = meshRef.current.position;
              const rot = meshRef.current.rotation;
              
              const updated = {
                position: {
                  x: parseFloat(pos.x.toFixed(3)),
                  y: parseFloat(pos.y.toFixed(3)),
                  z: parseFloat(pos.z.toFixed(3)),
                  unit: object.position?.unit || 'cm'
                },
                rotation: {
                  x: parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(3)),
                  y: parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(3)),
                  z: parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(3)),
                  unit: object.rotation?.unit || 'deg'
                }
              };
              
              onTransformEnd(objectKey, updated, true);
            }
          }}
        />
      )}
    </>
  );
}
