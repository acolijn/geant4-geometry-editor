import { Box } from '@mui/material';
import Viewer3D from '../../viewer3D/Viewer3D';
import GeometryEditor from '../../geometry-editor/GeometryEditor';

const GeometryTab = () => {
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Box sx={{ width: '70%', height: '100%' }}>
        <Viewer3D />
      </Box>
      <Box sx={{ width: '30%', height: '100%', overflow: 'auto' }}>
        <GeometryEditor />
      </Box>
    </Box>
  );
};

export default GeometryTab;
