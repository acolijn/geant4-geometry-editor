import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppHeader from './components/app/AppHeader';
import GeometryTab from './components/app/tabs/GeometryTab';
import MaterialsTab from './components/app/tabs/MaterialsTab';
import JsonTab from './components/app/tabs/JsonTab';
import { AppStateProvider } from './contexts/AppStateContext';
import { useAppContext } from './contexts/useAppContext';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  }
});

function AppContent() {
  const { tabValue, setTabValue } = useAppContext();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader
        tabValue={tabValue}
        onChangeTab={(e, newValue) => setTabValue(newValue)}
      />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {tabValue === 0 && <GeometryTab />}
        {tabValue === 1 && <MaterialsTab />}
        {tabValue === 2 && <JsonTab />}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ThemeProvider>
  );
}

export default App;
