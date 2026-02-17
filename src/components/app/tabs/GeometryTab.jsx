import { Box } from '@mui/material';
import Viewer3D from '../../viewer3D/Viewer3D';
import GeometryEditor from '../../geometry-editor/GeometryEditor';

const GeometryTab = ({
  geometries,
  materials,
  selectedGeometry,
  onSelectGeometry,
  onUpdateGeometry,
  hitCollections,
  onUpdateHitCollections,
  onAddGeometry,
  onRemoveGeometry,
  onImportGeometries,
  onImportMaterials,
  updateDialogOpen,
  setUpdateDialogOpen
}) => {
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Box sx={{ width: '70%', height: '100%' }}>
        <Viewer3D
          geometries={geometries}
          selectedGeometry={selectedGeometry}
          onSelect={onSelectGeometry}
          onUpdateGeometry={onUpdateGeometry}
          materials={materials}
        />
      </Box>
      <Box sx={{ width: '30%', height: '100%', overflow: 'auto' }}>
        <GeometryEditor
          geometries={geometries}
          materials={materials}
          selectedGeometry={selectedGeometry}
          hitCollections={hitCollections}
          onUpdateHitCollections={onUpdateHitCollections}
          onUpdateGeometry={onUpdateGeometry}
          onAddGeometry={onAddGeometry}
          onRemoveGeometry={onRemoveGeometry}
          handleImportGeometries={onImportGeometries}
          handleImportMaterials={onImportMaterials}
          externalUpdateDialogData={null}
          updateDialogOpen={updateDialogOpen}
          setUpdateDialogOpen={setUpdateDialogOpen}
        />
      </Box>
    </Box>
  );
};

export default GeometryTab;
