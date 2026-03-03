import { Container } from '@mui/material';
import JsonViewer from '../../json-viewer/JsonViewer';

const JsonTab = () => {
  return (
    <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
      <JsonViewer />
    </Container>
  );
};

export default JsonTab;
