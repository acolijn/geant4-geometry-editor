# API Reference

This section contains automatically generated documentation from JSDoc comments in the codebase.

## Component Organization

The application has been refactored into a modular structure with components organized by functionality:

### Main Components
- [GeometryEditor](GeometryEditor.md) - Main editor component
- [ProjectManager](ProjectManager.md) - Project management functionality

### Geometry Editor Components
- `PropertyEditor` - Edits properties of selected geometry objects
- `AddNewTab` - Interface for adding new geometry objects
- Dialog components for saving, loading, and updating objects

### 3D Viewer Components
- `TransformableObject` - Wrapper component that adds transformation controls
- Shape objects (Box, Cylinder, Sphere, etc.) - Render 3D geometries
