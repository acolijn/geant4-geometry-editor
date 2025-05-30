/**
 * AssemblyObject Component
 * 
 * This component renders an assembly with an optional wireframe box and a label.
 * Assemblies are containers for other objects and can be visualized with minimal
 * visual elements to avoid cluttering the scene while still being identifiable.
 */
import React, { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// Default size for assemblies
const DEFAULT_SIZE = 100;

// Global setting for wireframe visibility
// Set to false to hide wireframes for all assemblies
const SHOW_WIREFRAMES = false;

/**
 * Create a text label for the assembly
 * 
 * @param {string} text - The text to display
 * @param {Object} props - Additional props for the label
 * @returns {JSX.Element} - The Html component for the label
 */
const Label = ({ text, ...props }) => (
  <Html
    position={[0, DEFAULT_SIZE/2 + 10, 0]}
    center
    {...props}
  >
    <div style={{
      padding: '6px 10px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      pointerEvents: 'none'
    }}>
      {text}
    </div>
  </Html>
);

/**
 * AssemblyObject component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.object - The assembly object with properties
 * @param {boolean} props.isSelected - Whether the assembly is selected
 * @param {Function} props.onClick - Function to call when the assembly is clicked
 * @returns {JSX.Element} - The rendered assembly
 */
const AssemblyObject = forwardRef(({ object, isSelected, onClick }, ref) => {
  // Create a wireframe box to represent the assembly
  const size = DEFAULT_SIZE;
  
  // Create a wireframe material with the object's color or a default color
  const color = useMemo(() => {
    if (object.color) {
      if (Array.isArray(object.color)) {
        return new THREE.Color(object.color[0], object.color[1], object.color[2]);
      } else if (object.color.r !== undefined) {
        return new THREE.Color(object.color.r, object.color.g, object.color.b);
      }
    }
    return new THREE.Color(0, 0.7, 0); // Default green color for assemblies
  }, [object.color]);
  
  // Create materials for the wireframe
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: isSelected ? 0.8 : 0.4,
      depthTest: true,
      depthWrite: false
    });
  }, [color, isSelected]);
  
  // Create a box geometry for the wireframe
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(size, size, size), [size]);
  
  // Create edges geometry for the wireframe
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(boxGeometry), [boxGeometry]);
  
  return (
    <group ref={ref} onClick={onClick}>
      {/* Wireframe box - only shown when SHOW_WIREFRAMES is true or the assembly is selected */}
{/*       {(SHOW_WIREFRAMES || isSelected) && (
        <lineSegments 
          geometry={edgesGeometry} 
          material={lineMaterial} 
        />
      )} */}
      {SHOW_WIREFRAMES && (
        <lineSegments 
          geometry={edgesGeometry} 
          material={lineMaterial} 
        />      
      )}
      {/* Invisible box for better click detection */}
      <mesh visible={false}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Label showing the assembly name - only visible when selected */}
      {isSelected && (
        <Label text={object.displayName || object.name || 'Assembly'} />
      )}
    </group>
  );
});

export default AssemblyObject;
