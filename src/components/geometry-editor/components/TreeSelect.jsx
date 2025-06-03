import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  InputBase,
  ClickAwayListener,
  Popper,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

/**
 * TreeSelect Component
 * 
 * A custom select component that displays options in a collapsible tree structure.
 * This is designed to replace the standard Material UI Select for hierarchical data.
 */
const TreeSelect = ({
  label,
  value,
  onChange,
  renderTree,
  renderValue,
  placeholder,
  fullWidth = true,
  size = 'small',
  margin = 'normal',
  helperText,
  error,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({ world: true });
  const anchorRef = useRef(null);
  
  // Toggle node expansion
  const toggleNodeExpansion = (nodeKey, event) => {
    event.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Handle opening the dropdown
  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
    }
  };
  
  // Handle closing the dropdown
  const handleClose = () => {
    setOpen(false);
  };
  
  // Handle selecting an option
  const handleSelect = (newValue, event) => {
    event.stopPropagation();
    onChange(newValue);
    handleClose();
  };
  
  return (
    <FormControl 
      fullWidth={fullWidth} 
      margin={margin} 
      size={size}
      error={error}
      disabled={disabled}
    >
      <InputLabel 
        shrink 
        htmlFor="tree-select"
        sx={{
          backgroundColor: 'white',
          px: 0.5,
        }}
      >
        {label}
      </InputLabel>
      <OutlinedInput
        id="tree-select"
        ref={anchorRef}
        value={value}
        onClick={handleOpen}
        readOnly
        placeholder={placeholder}
        endAdornment={<ArrowDropDownIcon />}
        renderValue={renderValue}
        inputProps={{
          style: { cursor: 'pointer' }
        }}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
      
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        style={{ 
          width: anchorRef.current ? anchorRef.current.clientWidth : undefined,
          zIndex: 1300
        }}
        placement="bottom-start"
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Paper 
            elevation={8}
            sx={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              mt: 0.5
            }}
          >
            <Box sx={{ p: 1 }}>
              {renderTree && renderTree({ 
                expandedNodes, 
                toggleNodeExpansion, 
                handleSelect,
                selectedValue: value
              })}
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </FormControl>
  );
};

export default TreeSelect;
