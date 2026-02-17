import { Container } from '@mui/material';
import MaterialsEditor from '../../material-editor/MaterialsEditor';

const MaterialsTab = ({ materials, onUpdateMaterials }) => {
  return (
    <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
      <MaterialsEditor
        materials={materials}
        onUpdateMaterials={onUpdateMaterials}
      />
    </Container>
  );
};

export default MaterialsTab;
