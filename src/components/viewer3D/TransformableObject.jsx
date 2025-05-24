/**
 * TransformableObject Component
 * 
 * This component handles the transformation and selection of 3D objects in the scene.
 * It wraps various geometry types and provides transform controls when selected.
 * 
 * Key features:
 * - Supports different geometry types (Box, Cylinder, Sphere, etc.)
 * - Handles object selection and transformation
 * - Maintains proper selection state during and after transformations
 * - Supports both local and world coordinate systems
 */
import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

// Import geometry components
import BoxObject from './BoxObject.jsx';
import CylinderObject from './CylinderObject.jsx';
import SphereObject from './SphereObject.jsx';
import TrapezoidObject from './TrapezoidObject.jsx';
import TorusObject from './TorusObject.jsx';
import EllipsoidObject from './EllipsoidObject.jsx';
import PolyconeObject from './PolyconeObject.jsx';
import UnionObject from './UnionObject.jsx';

/**
 * Convert radians to degrees
 * @param {number} r - Angle in radians
 * @returns {number} Angle in degrees
 */
const radToDeg = (r) => THREE.MathUtils.radToDeg(r);

/**
 * Convert degrees to radians
 * @param {number} d - Angle in degrees
 * @returns {number} Angle in radians
 */
const degToRad = (d) => THREE.MathUtils.degToRad(d);

/**
 * Debug helper function to log object details
 * Useful for diagnosing positioning and rotation issues
 * 
 * @param {string} prefix - Descriptive prefix for the log
 * @param {Object} object - The object to debug
 */
const debugObject = (prefix, object) => {
  console.log(`${prefix} - Type: ${object.type}, Name: ${object.name}`, {
    position: object.position,
    rotation: object.rotation,
    worldPosition: object.calculatedWorldPosition,
    worldRotation: object.calculatedWorldRotation
  });
};

/**
 * TransformableObject component for handling 3D object transformations
 * 
 * @param {Object} props Component props
 * @param {Object} props.object The geometry object with properties like type, position, rotation
 * @param {string} props.objectKey Unique identifier for the object
 * @param {string} props.transformMode The current transform mode ('translate', 'rotate', or 'scale')
 * @param {boolean} props.isSelected Whether this object is currently selected
 * @param {Function} props.onSelect Callback when the object is selected
 * @param {Function} props.onTransformEnd Callback when transformation ends, receives updated position and rotation
 * @param {Array} props.worldPosition World position coordinates [x, y, z] if applicable
 * @param {Array} props.worldRotation World rotation values [x, y, z] in radians if applicable
 * @param {boolean} props.isSourceObject Whether this is a source object that should trigger updates to other instances
 * @returns {JSX.Element} The rendered 3D object with transform controls when selected
 */
export default function TransformableObject({ 
  object, 
  objectKey, 
  transformMode, 
  isSelected, 
  onSelect, 
  onTransformEnd,
  worldPosition,
  worldRotation,
  isSourceObject = false
}) {
  // Create a ref for the object
  const groupRef = useRef();
  const transformRef = useRef();
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const lastPositionRef = useRef(null); // Track last position to prevent jumps
  
  // Log when the component is mounted or updated
  useEffect(() => {
    console.log(`TransformableObject mounted/updated: ${objectKey} (${object.type})`);
    return () => {
      console.log(`TransformableObject unmounted: ${objectKey} (${object.type})`);
    };
  }, [objectKey, object.type]);

  // Apply incoming props unless dragging
  useEffect(() => {
    const group = groupRef.current;
    if (!group || isDragging) return;

    // Debug the object to help diagnose issues
    debugObject(`Setting position for ${objectKey}`, object);

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
      // All rotation values are now in radians, so we can apply them directly
      const [rx, ry, rz] = object.rotation
        ? [object.rotation.x, object.rotation.y, object.rotation.z]
        : [0, 0, 0];
      group.rotation.set(rx, ry, rz);
    }
    
    // Store the current position for comparison during dragging
    lastPositionRef.current = { 
      position: worldPosition ? { x: worldPosition[0], y: worldPosition[1], z: worldPosition[2] } : { ...object.position },
      rotation: worldRotation ? { x: radToDeg(worldRotation[0]), y: radToDeg(worldRotation[1]), z: radToDeg(worldRotation[2]) } : { ...object.rotation }
    };
  }, [object.position, object.rotation, worldPosition, worldRotation, isDragging, objectKey]);

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
      
      // For all objects, we need to send position updates during dragging
      // The Viewer3D component will decide how to handle them based on whether
      // this is a mother volume or a daughter object
      
      // Get current world position from the group
      const currentPosition = {
        x: group.position.x,
        y: group.position.y,
        z: group.position.z,
        unit: object.position?.unit || 'cm'
      };
      
      // Store rotation in radians (no unit needed)
      const currentRotation = {
        x: group.rotation.x,
        y: group.rotation.y,
        z: group.rotation.z
      };
      
      // Check if this is an intermediate object (both a mother and a daughter)
      const isIntermediateObject = isMotherVolume && (motherVolume && motherVolume !== 'World');
      
      // Send live updates to the Viewer3D component
      // The Viewer3D component will handle mother volumes and daughter objects differently
      onTransformEnd(objectKey, { 
        position: currentPosition, 
        rotation: currentRotation,
        // Flag intermediate objects for special handling
        _isIntermediateObject: isIntermediateObject
      }, isIntermediateObject, true); // Keep intermediate objects selected during dragging
      
      // Debug the transformation (for development purposes only)
      // console.log(`Transform change for ${objectKey} (${object.type})`, {
      //   position: [group.position.x, group.position.y, group.position.z],
      //   rotation: [radToDeg(group.rotation.x), radToDeg(group.rotation.y), radToDeg(group.rotation.z)]
      // });
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
            x: group.rotation.x,
            y: group.rotation.y,
            z: group.rotation.z
          }
        };
      }
    };

    // End dragging and finalize position
    const handleMouseUp = (e) => {
      // Prevent the event from bubbling up to avoid deselection
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      
      const group = groupRef.current;
      if (group) {
        // Get final world position after drag
        const finalPosition = {
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
          unit: object.position?.unit || 'cm'
        };
        
        // Store final rotation in radians (no unit needed)
        const finalRotation = {
          x: group.rotation.x,
          y: group.rotation.y,
          z: group.rotation.z
        };
        
        // Debug the final transformation
        console.log(`Final transform for ${objectKey} (${object.type})`, {
          position: finalPosition,
          rotation: finalRotation,
          originalPosition: object.position,
          originalRotation: object.rotation,
          worldPosition: object.calculatedWorldPosition,
          worldRotation: object.calculatedWorldRotation,
          motherVolume: object.mother_volume
        });
        
        // Send final update to parent with world coordinates
        // The parent component will handle converting to local coordinates if needed
        // Pass true as the third parameter to ensure the object stays selected
        // Pass false as the fourth parameter to indicate this is a final update, not a live update
        // Pass isSourceObject as the fifth parameter to indicate if this should trigger updates to instances
        onTransformEnd(objectKey, { 
          position: finalPosition, 
          rotation: finalRotation 
        }, true, false, isSourceObject);
      }
      
      // Reset drag state
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
      
      // Prevent default to avoid any unexpected behavior
      if (e && e.preventDefault) {
        e.preventDefault();
      }
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
      // Don't select the World volume by mouse clicking in the 3D view
      // but allow other objects to be selected
      if (object.name === 'World' || object.isNonSelectable) {
        console.log(`${object.name || object.type} is not selectable by mouse clicking`);
      } else {
        onSelect();
      }
    }
  };

  // Debug log the object properties to help diagnose rendering issues
  console.log(`RENDER - Object ${object.name} of type ${object.type}:`, {
    objectProps: object,
    dimensions: object.dimensions,
    innerRadius: object.innerRadius,
    inner_radius: object.inner_radius,
    worldPosition,
    worldRotation
  });
  
  // Force a default size for box objects if size is missing
  /*let boxSize = [1, 1, 1];
  if (object.type === 'box') {
    console.log(`RENDER - Box object ${object.name} dimensions:`, object.dimensions);
    if (object.dimensions) {
      boxSize = [object.dimensions.x || 1, object.dimensions.y || 1, object.dimensions.z || 1];
    } else {
      console.warn(`RENDER WARNING - Box object ${object.name} missing dimensions property, using default size`);
    }
  }*/
  
  // Create a group for the transform controls
  const renderObject = () => {
    // Clone the object to avoid modifying the original
    const clonedObject = { ...object };
    
    // Debug the object being rendered
    console.log(`Rendering ${objectKey} (${object.type})`, {
      position: worldPosition || (object.position ? [object.position.x, object.position.y, object.position.z] : [0, 0, 0]),
      rotation: worldRotation || (object.rotation ? [degToRad(object.rotation.x), degToRad(object.rotation.y), degToRad(object.rotation.z)] : [0, 0, 0])
    });
    
    // Render the appropriate object type
    switch (object.type) {
      case 'box':
        return <BoxObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'cylinder':
        return <CylinderObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'sphere':
        return <SphereObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'trapezoid':
        return <TrapezoidObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'torus':
        return <TorusObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'ellipsoid':
        return <EllipsoidObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'polycone':
        return <PolyconeObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      case 'union':
        return <UnionObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} />;
      default:
        console.error(`Unknown object type: ${object.type}`);
        return null;
    }
  };

  // No additional state needed

  return (
    <>
      {renderObject()}
      
      {/* Only show transform controls if the object is selected AND not marked as non-movable */}
      {isSelected && groupRef.current && !object.isNonMovable && (
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
