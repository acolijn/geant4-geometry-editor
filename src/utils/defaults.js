// Default geometry structure
export const defaultGeometry = {
  world: {
    type: 'box',
    name: 'World',
    material: 'G4_AIR',
    size: {
      x: 2000.0,
      y: 2000.0,
      z: 2000.0
    },
    position: {
      x: 0.0,
      y: 0.0,
      z: 0.0
    },
    rotation: {
      x: 0.0,
      y: 0.0,
      z: 0.0
    }
  },
  volumes: []
};

// Default materials from the sample file
export const defaultMaterials = {
  "LXe": {
    "type": "element_based",
    "density": 3.02,
    "density_unit": "g/cm3",
    "state": "liquid",
    "temperature": 165.0,
    "temperature_unit": "kelvin",
    "composition": {
      "Xe": 1.0
    },
    "color": [0.0, 0.5, 1.0, 0.3]
  },
  "G4_AIR": {
    "type": "nist",
    "density": 0.00120479,
    "density_unit": "g/cm3",
    "color": [0.9, 0.9, 1.0, 0.1]
  },
  "G4_WATER": {
    "type": "nist",
    "density": 1.0,
    "density_unit": "g/cm3",
    "color": [0.0, 0.0, 0.8, 0.3]
  },
  "G4_Al": {
    "type": "nist",
    "density": 2.699,
    "density_unit": "g/cm3",
    "color": [0.8, 0.8, 0.8, 1.0]
  },
  "G4_PLASTIC_SC_VINYLTOLUENE": {
    "type": "nist",
    "density": 1.032,
    "density_unit": "g/cm3",
    "color": [0.2, 0.8, 0.2, 1.0]
  }
};
