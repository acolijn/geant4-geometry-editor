// Function to handle right-click for context menu
export const handleContextMenu = (event, volumeIndex, setContextMenu) => {
  event.preventDefault();
  setContextMenu({
    mouseX: event.clientX,
    mouseY: event.clientY,
    volumeIndex
  });
};

// Function to close context menu
export const handleCloseContextMenu = (setContextMenu) => {
  // Close the context menu
  setContextMenu(null);
};