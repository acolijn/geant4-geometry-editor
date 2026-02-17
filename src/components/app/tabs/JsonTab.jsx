import { Container } from '@mui/material';
import JsonViewer from '../../json-viewer/JsonViewer';

const JsonTab = ({
  geometries,
  materials,
  onImportGeometries,
  onImportMaterials
}) => {
  return (
    <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
      <JsonViewer
        geometries={geometries}
        materials={materials}
        onImportGeometries={onImportGeometries}
        onImportMaterials={onImportMaterials}
      />
    </Container>
  );
};

export default JsonTab;
