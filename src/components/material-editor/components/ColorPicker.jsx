import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Slider, 
  Typography, 
  TextField,
  Button
} from '@mui/material';

/**
 * ColorPicker component for selecting RGBA colors
 * 
 * @param {Object} props - Component props
 * @param {Array} props.color - RGBA color array [r, g, b, a] with values from 0-1
 * @param {Function} props.onChange - Function called when color changes
 * @returns {JSX.Element} ColorPicker component
 */
const ColorPicker = ({ color = [0.5, 0.5, 0.5, 1.0], onChange }) => {
  // Convert color array to individual components
  const [r, setR] = useState(color[0]);
  const [g, setG] = useState(color[1]);
  const [b, setB] = useState(color[2]);
  const [a, setA] = useState(color[3]);

  // Use a ref to track if the change is coming from internal state or props
  const isInternalChange = React.useRef(false);
  
  // Update the color when any internal component changes
  useEffect(() => {
    // Only call onChange if this was triggered by an internal change (slider/input)
    if (isInternalChange.current) {
      isInternalChange.current = false;
      onChange([r, g, b, a]);
    }
  }, [r, g, b, a, onChange]);

  // Update local state when color prop changes
  useEffect(() => {
    // Skip if the color array is undefined or null
    if (!color) return;
    
    // Skip update if values are the same to prevent infinite loop
    if (r === color[0] && g === color[1] && b === color[2] && a === color[3]) {
      return;
    }
    
    // Update the local state with the new color values
    setR(color[0]);
    setG(color[1]);
    setB(color[2]);
    setA(color[3]);
  }, [color]);
  
  // Wrapper functions for the setters that mark changes as internal
  const handleRChange = (newValue) => {
    isInternalChange.current = true;
    setR(newValue);
  };
  
  const handleGChange = (newValue) => {
    isInternalChange.current = true;
    setG(newValue);
  };
  
  const handleBChange = (newValue) => {
    isInternalChange.current = true;
    setB(newValue);
  };
  
  const handleAChange = (newValue) => {
    isInternalChange.current = true;
    setA(newValue);
  };

  // Convert RGBA values (0-1) to CSS color string
  const getRgbaString = () => {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  };

  // Handle slider changes
  const handleChange = (setter) => (event, newValue) => {
    isInternalChange.current = true;
    setter(newValue);
  };

  // Handle text input changes
  const handleInputChange = (setter, min = 0, max = 1) => (event) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      isInternalChange.current = true;
      setter(Math.min(max, Math.max(min, value)));
    }
  };

  // Predefined color presets
  const presets = [
    { name: 'Red', color: [1, 0, 0, 1] },
    { name: 'Green', color: [0, 1, 0, 1] },
    { name: 'Blue', color: [0, 0, 1, 1] },
    { name: 'Yellow', color: [1, 1, 0, 1] },
    { name: 'Cyan', color: [0, 1, 1, 1] },
    { name: 'Magenta', color: [1, 0, 1, 1] },
    { name: 'White', color: [1, 1, 1, 1] },
    { name: 'Black', color: [0, 0, 0, 1] },
    { name: 'Gray', color: [0.5, 0.5, 0.5, 1] }
  ];

  return (
    <Box sx={{ width: '100%', p: 1 }}>
      {/* Color preview */}
      <Box 
        sx={{ 
          width: '100%', 
          height: '40px', 
          backgroundColor: getRgbaString(),
          border: '1px solid #ccc',
          borderRadius: '4px',
          mb: 2
        }} 
      />
      
      {/* RGB sliders */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ width: '20px', color: 'red' }}>R:</Typography>
        <Slider 
          value={r}
          min={0}
          max={1}
          step={0.01}
          onChange={handleChange(setR)}
          sx={{ mx: 2, color: 'red' }}
        />
        <TextField
          value={r}
          onChange={handleInputChange(setR)}
          size="small"
          type="number"
          inputProps={{ min: 0, max: 1, step: 0.01 }}
          sx={{ width: '70px' }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ width: '20px', color: 'green' }}>G:</Typography>
        <Slider 
          value={g}
          min={0}
          max={1}
          step={0.01}
          onChange={handleChange(setG)}
          sx={{ mx: 2, color: 'green' }}
        />
        <TextField
          value={g}
          onChange={handleInputChange(setG)}
          size="small"
          type="number"
          inputProps={{ min: 0, max: 1, step: 0.01 }}
          sx={{ width: '70px' }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ width: '20px', color: 'blue' }}>B:</Typography>
        <Slider 
          value={b}
          min={0}
          max={1}
          step={0.01}
          onChange={handleChange(setB)}
          sx={{ mx: 2, color: 'blue' }}
        />
        <TextField
          value={b}
          onChange={handleInputChange(setB)}
          size="small"
          type="number"
          inputProps={{ min: 0, max: 1, step: 0.01 }}
          sx={{ width: '70px' }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ width: '20px' }}>A:</Typography>
        <Slider 
          value={a}
          min={0}
          max={1}
          step={0.01}
          onChange={handleChange(setA)}
          sx={{ mx: 2 }}
        />
        <TextField
          value={a}
          onChange={handleInputChange(setA)}
          size="small"
          type="number"
          inputProps={{ min: 0, max: 1, step: 0.01 }}
          sx={{ width: '70px' }}
        />
      </Box>
      
      {/* Color presets */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Presets:</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {presets.map((preset) => (
          <Button
            key={preset.name}
            variant="outlined"
            size="small"
            onClick={() => {
              // Update internal state first
              setR(preset.color[0]);
              setG(preset.color[1]);
              setB(preset.color[2]);
              setA(preset.color[3]);
              // Then trigger onChange
              isInternalChange.current = true;
              onChange(preset.color);
            }}
            sx={{ 
              minWidth: 0, 
              width: '30px', 
              height: '30px', 
              p: 0,
              backgroundColor: `rgba(${preset.color[0] * 255}, ${preset.color[1] * 255}, ${preset.color[2] * 255}, ${preset.color[3]})`,
              border: '1px solid #ccc',
              '&:hover': {
                backgroundColor: `rgba(${preset.color[0] * 255}, ${preset.color[1] * 255}, ${preset.color[2] * 255}, ${preset.color[3] * 0.8})`,
              }
            }}
            title={preset.name}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ColorPicker;
