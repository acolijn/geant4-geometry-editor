// Final fix with live sync: TransformableObject with correct dragging and prop sync
import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Box from './shapes/Box.jsx';
import Cylinder from './shapes/Cylinder.jsx';
import Sphere from './shapes/Sphere.jsx';

const radToDeg = (r) => THREE.MathUtils.radToDeg(r);
const degToRad = (d) => THREE.MathUtils.degToRad(d);

export default function TransformableObject({ object, transformMode, isSelected, onSelect, onTransformEnd }) {
  const groupRef = useRef();
  const transformRef = useRef();
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);

  // Apply incoming props unless dragging
  useEffect(() => {
    const group = groupRef.current;
    if (!group || isDragging) return;

    const [x, y, z] = object.position ? [object.position.x, object.position.y, object.position.z] : [0, 0, 0];
    const [rx, ry, rz] = object.rotation
      ? [degToRad(object.rotation.x), degToRad(object.rotation.y), degToRad(object.rotation.z)]
      : [0, 0, 0];

    group.position.set(x, y, z);
    group.rotation.set(rx, ry, rz);
  }, [object.position, object.rotation, isDragging]);

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

    const handleChange = () => {
      const group = groupRef.current;
      if (!group) return;

      onTransformEnd({
        position: {
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
          unit: object.position?.unit || 'cm'
        },
        rotation: {
          x: radToDeg(group.rotation.x),
          y: radToDeg(group.rotation.y),
          z: radToDeg(group.rotation.z),
          unit: object.rotation?.unit || 'deg'
        }
      });
    };

    const handleMouseDown = () => {
      setIsDragging(true);
      gl.domElement.style.cursor = 'grabbing';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
    };

    controls.addEventListener('objectChange', handleChange);
    controls.addEventListener('mouseDown', handleMouseDown);
    controls.addEventListener('mouseUp', handleMouseUp);

    return () => {
      controls.removeEventListener('objectChange', handleChange);
      controls.removeEventListener('mouseDown', handleMouseDown);
      controls.removeEventListener('mouseUp', handleMouseUp);
    };
  }, [gl, isSelected, object, onTransformEnd]);

  const sharedProps = {
    ref: groupRef,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: object.color,
    wireframe: object.name === 'World',
    selected: isSelected,
    onClick: () => onSelect()
  };

  return (
    <>
      {object.type === 'box' && <Box size={[object.size?.x || 1, object.size?.y || 1, object.size?.z || 1]} {...sharedProps} />}
      {object.type === 'cylinder' && <Cylinder radius={object.radius || 1} height={object.height || 1} innerRadius={object.innerRadius} {...sharedProps} />}
      {object.type === 'sphere' && <Sphere radius={object.radius || 1} {...sharedProps} />}

      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          size={0.75}
          camera={camera}
          enabled
        />
      )}
    </>
  );
}
