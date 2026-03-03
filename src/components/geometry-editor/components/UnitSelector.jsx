import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { getAvailableUnits } from '../utils/UnitConverter';

/**
 * UnitSelector Component
 *
 * Reusable dropdown for picking a display unit (length or angle).
 * Renders identically to the inline FormControl blocks it replaces.
 *
 * @param {Object} props
 * @param {'length'|'angle'} props.type - Unit category
 * @param {string} props.value - Currently selected unit
 * @param {Function} props.onChange - Called with the new unit string
 */
const UnitSelector = ({ type, value, onChange }) => (
  <FormControl size="small" sx={{ minWidth: '90px' }}>
    <InputLabel>Unit</InputLabel>
    <Select
      value={value}
      label="Unit"
      onChange={(e) => onChange(e.target.value)}
      size="small"
    >
      {getAvailableUnits(type).map(unit => (
        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default UnitSelector;
