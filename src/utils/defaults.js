// Default geometry structure
export const defaultGeometry = {
  world: {
    type: 'box',
    name: 'World',
    material: 'G4_AIR',
    size: {
      x: 200.0,
      y: 200.0,
      z: 200.0
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
    }
  },
  "G4_AIR": {
    "type": "nist",
    "density": 0.00120479,
    "density_unit": "g/cm3"
  },
  "G4_WATER": {
    "type": "nist",
    "density": 1.0,
    "density_unit": "g/cm3"
  },
  "G4_Al": {
    "type": "nist",
    "density": 2.699,
    "density_unit": "g/cm3"
  },
  "G4_PLASTIC_SC_VINYLTOLUENE": {
    "type": "nist",
    "density": 1.032,
    "density_unit": "g/cm3"
  }
};
