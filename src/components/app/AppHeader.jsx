import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import { ProjectManager } from '../project-manager';

const tabsSx = {
  flexGrow: 1,
  '& .MuiTab-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'normal'
  },
  '& .Mui-selected': {
    color: '#ffffff',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px 4px 0 0'
  },
  '& .MuiTabs-indicator': {
    height: 3,
    backgroundColor: '#ffffff'
  }
};

const AppHeader = ({
  tabValue,
  onChangeTab,
  geometries,
  materials,
  hitCollections,
  onLoadProject
}) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ mr: 2 }}>
          Geant4 Geometry Editor
        </Typography>
        <Tabs
          value={tabValue}
          onChange={onChangeTab}
          sx={tabsSx}
          centered
        >
          <Tab label="3D View" />
          <Tab label="Materials" />
          <Tab label="JSON" />
        </Tabs>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <ProjectManager
            geometries={geometries}
            materials={materials}
            hitCollections={hitCollections}
            onLoadProject={onLoadProject}
            compactMode={true}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;

