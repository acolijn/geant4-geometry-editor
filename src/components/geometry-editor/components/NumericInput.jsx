import React, { useState, useEffect } from 'react';
import { TextField } from '@mui/material';
import { toInternalUnit, fromInternalUnit } from '../utils/UnitConverter';

/**
 * NumericInput Component
 * 
 * A specialized input component for handling numeric values with unit conversion
 * that properly supports decimal points and negative numbers.
 */
const NumericInput = ({
  label,
  internalValue, // Value in internal units (e.g., mm or rad)
  unit,          // Display unit (e.g., 'cm', 'deg')
  type,          // 'length' or 'angle'
  onUpdate,      // Callback when valid number entered
  size = 'small',
  disabled = false,
  onFocus = null
}) => {
  // State to track the displayed input value
  const [input, setInput] = useState('');

  // Update input when internalValue changes externally
  useEffect(() => {
    if (internalValue !== undefined && internalValue !== null) {
      setInput(String(fromInternalUnit(internalValue, unit, type)));
    } else {
      setInput('0');
    }
  }, [internalValue, unit, type]);

  const handleChange = (e) => {
    const val = e.target.value;

    // Allow valid partial values including negative numbers and decimals
    if (/^-?\d*\.?\d*$/.test(val)) {
      setInput(val);

      // Only convert and update if we have a valid number
      if (val !== '' && val !== '-' && val !== '.') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          onUpdate(toInternalUnit(num, unit, type));
        }
      }
    }
    // Ignore invalid characters
  };

  const handleFocus = (e) => {
    // Select all text when focused
    e.target.select();
    
    // Call the provided onFocus handler if any
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <TextField
      label={label}
      type="text"
      value={input}
      onChange={handleChange}
      onFocus={handleFocus}
      size={size}
      disabled={disabled}
      inputProps={{ 
        inputMode: 'decimal',
        style: { textAlign: 'right' }
      }}
    />
  );
};

export default NumericInput;
