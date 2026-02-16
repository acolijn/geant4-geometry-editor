const getAssemblyComponents = (volumes, assemblyName) => {
  return volumes
    .map((volume, index) => ({ index, volume }))
    .filter(({ volume }) => volume.mother_volume === assemblyName)
    .map(({ index, volume }) => ({
      index,
      volume,
      _componentId: volume._componentId
    }));
};

const buildUpdatedAssembly = (sourceAssembly, targetAssembly) => {
  const updatedAssembly = {
    ...sourceAssembly,
    position: { ...targetAssembly.position },
    rotation: { ...targetAssembly.rotation },
    name: targetAssembly.name,
    mother_volume: targetAssembly.mother_volume
  };

  if (targetAssembly._compoundId) {
    updatedAssembly._compoundId = targetAssembly._compoundId;
  }

  if (targetAssembly._instanceId) {
    updatedAssembly._instanceId = targetAssembly._instanceId;
  }

  if (targetAssembly.g4name) {
    updatedAssembly.g4name = targetAssembly.g4name;
  }

  return updatedAssembly;
};

const buildUpdatedComponent = (sourceComponent, targetComponent, targetAssemblyName) => {
  const updatedComponent = {
    ...sourceComponent.volume,
    name: targetComponent.volume.name,
    mother_volume: targetAssemblyName,
    _componentId: targetComponent.volume._componentId
  };

  if (targetComponent.volume.g4name) {
    updatedComponent.g4name = targetComponent.volume.g4name;
  }

  return updatedComponent;
};

export const syncAssembliesFromSource = ({
  volumes,
  sourceIndex,
  targetIndices,
  onUpdateGeometry,
  isTargetEligible = () => true
}) => {
  if (!Array.isArray(volumes) || !Array.isArray(targetIndices) || !onUpdateGeometry) {
    return { success: false, updatedCount: 0 };
  }

  const sourceAssembly = volumes[sourceIndex];
  if (!sourceAssembly || !sourceAssembly.name) {
    return { success: false, updatedCount: 0 };
  }

  const sourceComponents = getAssemblyComponents(volumes, sourceAssembly.name);
  let updatedCount = 0;

  for (const targetIndex of targetIndices) {
    if (targetIndex < 0 || targetIndex >= volumes.length) {
      continue;
    }

    const targetAssembly = volumes[targetIndex];
    if (!targetAssembly || !isTargetEligible(sourceAssembly, targetAssembly)) {
      continue;
    }

    onUpdateGeometry(
      `volume-${targetIndex}`,
      buildUpdatedAssembly(sourceAssembly, targetAssembly),
      true,
      false
    );

    const targetComponents = getAssemblyComponents(volumes, targetAssembly.name);

    for (const sourceComponent of sourceComponents) {
      const matchingTargetComponent = targetComponents.find(
        (targetComponent) =>
          targetComponent._componentId &&
          sourceComponent._componentId &&
          targetComponent._componentId === sourceComponent._componentId
      );

      if (!matchingTargetComponent) {
        continue;
      }

      onUpdateGeometry(
        `volume-${matchingTargetComponent.index}`,
        buildUpdatedComponent(sourceComponent, matchingTargetComponent, targetAssembly.name),
        true,
        false
      );
    }

    updatedCount++;
  }

  return { success: true, updatedCount };
};
