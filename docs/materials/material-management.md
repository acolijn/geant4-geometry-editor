# Material Management

The Material Management system in the Geant4 Geometry Editor provides tools for organizing, maintaining, and using materials in your geometry designs.

## Overview

Effective material management is essential for creating accurate and maintainable geometry designs. The Geant4 Geometry Editor provides a comprehensive set of tools for:

- Creating and editing materials
- Organizing materials in categories
- Importing and exporting materials
- Assigning materials to geometry objects
- Tracking material usage

## Material Library

The Material Library is the central repository for all materials available in your project:

### Built-in Materials

- **NIST Materials**: Standard materials from the NIST database
- **Default Materials**: Common materials pre-configured for convenience
- **Example Materials**: Sample materials demonstrating different configurations

### User-Defined Materials

- **Element-Based Materials**: Custom materials defined by elemental composition
- **Compounds**: Materials composed of other materials
- **Imported Materials**: Materials imported from external sources

## Material Categories

Materials can be organized into categories for easier management:

- **Standard**: NIST and other standard materials
- **User-Defined**: Materials created by the user
- **Project-Specific**: Materials specific to the current project
- **Custom Categories**: User-created categories for specialized materials

To create a new category:

1. Click "Manage Categories" in the Materials Tab
2. Click "Add Category"
3. Enter a name for the category
4. Click "Create"

## Material Actions

The Materials Tab provides several actions for managing materials:

### Creating Materials

- Click "Create New Material" to open the material creation dialog
- Select the material type (NIST, Element-Based, or Compound)
- Fill in the required properties
- Click "Create" to add the material to your library

### Editing Materials

- Select a material in the Materials Tab
- Click "Edit" to modify its properties
- Make the desired changes
- Click "Apply" to save the changes

### Duplicating Materials

- Select a material in the Materials Tab
- Click "Duplicate"
- A copy of the material will be created with "_copy" appended to the name
- Edit the copy as needed

### Deleting Materials

- Select a material in the Materials Tab
- Click "Delete"
- Confirm the deletion
- Note: Materials currently in use cannot be deleted


## Material Assignment

To assign a material to a geometry object:

1. Select the object in the 3D Viewer or Geometry Tree
2. In the Properties Tab, locate the Material dropdown
3. Select a material from the list
4. The object will immediately update with the new material


## Best Practices

For effective material management:

- Use meaningful names for materials
- Organize materials into logical categories
- Document the source and properties of custom materials
- Regularly export your material library for backup
- Use material presets as starting points for custom materials
- Review unused materials periodically and remove them if no longer needed
