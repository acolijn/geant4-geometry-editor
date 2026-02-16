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

// Import geometry components
import BoxObject from './BoxObject.jsx';
import CylinderObject from './CylinderObject.jsx';
import SphereObject from './SphereObject.jsx';
import TrapezoidObject from './TrapezoidObject.jsx';
import TorusObject from './TorusObject.jsx';
import EllipsoidObject from './EllipsoidObject.jsx';
import PolyconeObject from './PolyconeObject.jsx';
import UnionObject from './UnionObject.jsx';
import AssemblyObject from './AssemblyObject.jsx';

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
 * @param {Array} props.volumes All volumes in the scene, needed for union and assembly objects
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
  isSourceObject = false,
  isMotherVolume = false,
  materials = {},
  volumes = []
}) {
  // Create a ref for the object
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
      // All rotation values are now in radians, so we can apply them directly
      const [rx, ry, rz] = object.rotation
        ? [object.rotation.x, object.rotation.y, object.rotation.z]
        : [0, 0, 0];
      group.rotation.set(rx, ry, rz);
    }
    
    // Store the current position for comparison during dragging
    lastPositionRef.current = { 
      position: worldPosition ? { x: worldPosition[0], y: worldPosition[1], z: worldPosition[2] } : { ...object.position },
      rotation: worldRotation ? { x: worldRotation[0], y: worldRotation[1], z: worldRotation[2] } : { ...object.rotation }
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
      const isIntermediateObject = isMotherVolume && (object.mother_volume && object.mother_volume !== 'World');
      
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

  // Create a group for the transform controls
  const renderObject = () => {
    // Clone the object to avoid modifying the original
    const clonedObject = { ...object };
    
    // Render the appropriate object type
    switch (object.type) {
      case 'box':
        return <BoxObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'cylinder':
        return <CylinderObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'sphere':
        return <SphereObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'trapezoid':
        return <TrapezoidObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'torus':
        return <TorusObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'ellipsoid':
        return <EllipsoidObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'polycone':
        return <PolyconeObject ref={groupRef} object={clonedObject} isSelected={isSelected} onClick={onSelect} materials={materials} />;
      case 'union':
        // For union objects, we need to be careful about how we pass props to avoid reference issues
        return (
          <UnionObject 
            ref={groupRef} 
            object={clonedObject} 
            volumes={volumes} 
            isSelected={isSelected} 
            onClick={onSelect} 
            materials={materials} 
            // Add a key based on the object name to ensure proper re-rendering
            key={`union-${clonedObject.name}`}
          />
        );
      case 'assembly':
        return <AssemblyObject ref={groupRef} object={clonedObject} volumes={volumes} isSelected={isSelected} onClick={onSelect} materials={materials} />;
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
