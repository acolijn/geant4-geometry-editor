import { Container } from '@mui/material';
import MaterialsEditor from '../../material-editor/MaterialsEditor';

const MaterialsTab = () => {
  return (
    <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
      <MaterialsEditor />
    </Container>
  );
};

export default MaterialsTab;
