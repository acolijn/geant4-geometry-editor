/**
 * Shared utility for resolving material colors in 3D shape components.
 *
 * @param {string} materialName - Name of the material to look up
 * @param {Object} materials - Materials dictionary (name → { color: [r,g,b,a], ... })
 * @param {string} [defaultColor="rgba(180, 180, 180, 0.7)"] - Fallback rgba string
 * @returns {string} An rgba color string
 */
export const getMaterialColor = (materialName, materials, defaultColor = 'rgba(180, 180, 180, 0.7)') => {
  if (!materialName || !materials || Object.keys(materials).length === 0) {
    return defaultColor;
  }

  const material = materials[materialName];

  if (material && material.color) {
    return `rgba(${Math.floor(material.color[0] * 255)}, ${Math.floor(material.color[1] * 255)}, ${Math.floor(material.color[2] * 255)}, ${material.color[3] ?? 0.7})`;
  }

  return defaultColor;
};
