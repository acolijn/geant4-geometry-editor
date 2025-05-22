/**
 * UnitConverter.js
 * 
 * A utility for converting between different units in the Geant4 Geometry Editor.
 * All values are stored internally in mm (for lengths) and rad (for angles).
 * This utility provides functions to convert between these internal units and
 * various display units that can be selected in the UI.
 */

// Length conversion factors to mm (internal unit)
const LENGTH_CONVERSION_FACTORS = {
  //micrometer
  um: 0.001,       // micrometer
  mm: 1.0,         // millimeter (base unit)
  cm: 10.0,        // centimeter
  m: 1000.0,       // meter
  in: 25.4,        // inch
};

// Angle conversion factors to rad (internal unit)
const ANGLE_CONVERSION_FACTORS = {
  rad: 1.0,                    // radian (base unit)
  deg: Math.PI / 180.0         // degree
};

/**
 * Convert a value from a display unit to the internal unit (mm or rad)
 * 
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The unit to convert from
 * @param {string} type - The type of unit ('length' or 'angle')
 * @returns {number} The converted value in the internal unit (mm or rad)
 */
export const toInternalUnit = (value, fromUnit, type = 'length') => {
  if (value === undefined || value === null) return value;
  
  const conversionFactors = type === 'angle' 
    ? ANGLE_CONVERSION_FACTORS 
    : LENGTH_CONVERSION_FACTORS;
  
  const factor = conversionFactors[fromUnit];
  
  if (!factor) {
    console.warn(`Unknown unit: ${fromUnit}. Using value as is.`);
    return value;
  }
  
  return value * factor;
};

/**
 * Convert a value from the internal unit (mm or rad) to a display unit
 * 
 * @param {number} value - The value to convert (in mm or rad)
 * @param {string} toUnit - The unit to convert to
 * @param {string} type - The type of unit ('length' or 'angle')
 * @returns {number} The converted value in the specified unit
 */
export const fromInternalUnit = (value, toUnit, type = 'length') => {
  if (value === undefined || value === null) return value;
  
  const conversionFactors = type === 'angle' 
    ? ANGLE_CONVERSION_FACTORS 
    : LENGTH_CONVERSION_FACTORS;
  
  const factor = conversionFactors[toUnit];
  
  if (!factor) {
    console.warn(`Unknown unit: ${toUnit}. Using value as is.`);
    return value;
  }
  
  return value / factor;
};

/**
 * Get the available units for a specific type
 * 
 * @param {string} type - The type of unit ('length' or 'angle')
 * @returns {string[]} Array of available unit names
 */
export const getAvailableUnits = (type = 'length') => {
  const conversionFactors = type === 'angle' 
    ? ANGLE_CONVERSION_FACTORS 
    : LENGTH_CONVERSION_FACTORS;
  
  return Object.keys(conversionFactors);
};

/**
 * Format a value with its unit for display
 * 
 * @param {number} value - The value to format (in internal units)
 * @param {string} unit - The unit to display
 * @param {string} type - The type of unit ('length' or 'angle')
 * @param {number} precision - The number of decimal places to show
 * @returns {string} The formatted value with unit
 */
export const formatValueWithUnit = (value, unit, type = 'length', precision = 2) => {
  if (value === undefined || value === null) return '';
  
  const convertedValue = fromInternalUnit(value, unit, type);
  return `${convertedValue.toFixed(precision)} ${unit}`;
};

export default {
  toInternalUnit,
  fromInternalUnit,
  getAvailableUnits,
  formatValueWithUnit,
  LENGTH_CONVERSION_FACTORS,
  ANGLE_CONVERSION_FACTORS
};
