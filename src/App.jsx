import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppHeader from './components/app/AppHeader';
import GeometryTab from './components/app/tabs/GeometryTab';
import MaterialsTab from './components/app/tabs/MaterialsTab';
import JsonTab from './components/app/tabs/JsonTab';
import { useAppState } from './hooks/useAppState';
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

function App() {
  const {
    tabValue,
    setTabValue,
    geometries,
    materials,
    selectedGeometry,
    setSelectedGeometry,
    hitCollections,
    setHitCollections,
    updateDialogOpen,
    setUpdateDialogOpen,
    handleUpdateGeometry,
    handleAddGeometry,
    handleRemoveGeometry,
    handleImportGeometries,
    handleImportMaterials,
    handleUpdateMaterials,
    handleLoadProject
  } = useAppState();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppHeader
          tabValue={tabValue}
          onChangeTab={(e, newValue) => setTabValue(newValue)}
          geometries={geometries}
          materials={materials}
          hitCollections={hitCollections}
          onLoadProject={handleLoadProject}
        />
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {tabValue === 0 && (
            <GeometryTab
              geometries={geometries}
              materials={materials}
              selectedGeometry={selectedGeometry}
              onSelectGeometry={setSelectedGeometry}
              onUpdateGeometry={handleUpdateGeometry}
              hitCollections={hitCollections}
              onUpdateHitCollections={setHitCollections}
              onAddGeometry={handleAddGeometry}
              onRemoveGeometry={handleRemoveGeometry}
              onImportGeometries={handleImportGeometries}
              onImportMaterials={handleImportMaterials}
              updateDialogOpen={updateDialogOpen}
              setUpdateDialogOpen={setUpdateDialogOpen}
            />
          )}
          {tabValue === 1 && (
            <MaterialsTab
              materials={materials}
              onUpdateMaterials={handleUpdateMaterials}
            />
          )}
          {tabValue === 2 && (
            <JsonTab
              geometries={geometries}
              materials={materials}
              onImportGeometries={handleImportGeometries}
              onImportMaterials={handleImportMaterials}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
