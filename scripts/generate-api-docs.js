import jsdoc2md from 'jsdoc-to-markdown';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const sourceDir = path.resolve(__dirname, '../src');
const outputDir = path.resolve(__dirname, '../docs/api');
const jsdocHomeDir = path.resolve(__dirname, '../.jsdoc-home');

// Ensure JSDoc temp/cache paths resolve to a writable directory in all environments.
if (!fs.existsSync(jsdocHomeDir)) {
  fs.mkdirSync(jsdocHomeDir, { recursive: true });
}
process.env.HOME = jsdocHomeDir;

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Files to document
const apiModules = [
  {
    name: 'GeometryEditor',
    title: 'Geometry Editor',
    file: 'components/geometry-editor/GeometryEditor.jsx',
    summary: 'Main editor panel for creating, selecting, and editing geometry objects.'
  },
  {
    name: 'ProjectManager',
    title: 'Project Manager',
    file: 'components/project-manager/ProjectManager.jsx',
    summary: 'Save/load workflow for projects and reusable geometry objects.'
  },
  {
    name: 'Viewer3D',
    title: '3D Viewer',
    file: 'components/viewer3D/Viewer3D.jsx',
    summary: 'Three.js-based scene viewer and transform interaction layer.'
  },
  {
    name: 'MaterialsEditor',
    title: 'Materials Editor',
    file: 'components/material-editor/MaterialsEditor.jsx',
    summary: 'Material creation and editing UI for NIST and custom materials.'
  },
  {
    name: 'JsonViewer',
    title: 'JSON Viewer',
    file: 'components/json-viewer/JsonViewer.jsx',
    summary: 'Displays and imports combined geometry/material JSON.'
  },
  {
    name: 'GeometryOperations',
    title: 'Geometry Operations',
    file: 'components/geometry-editor/utils/GeometryOperations.js',
    summary: 'Core add/update/remove geometry state operations used by the editor.'
  }
];

// Generate the API index page
const generateApiIndex = () => {
  const availableModules = apiModules.filter(module =>
    fs.existsSync(path.join(sourceDir, module.file))
  );

  const indexContent = `# API Reference

This section contains automatically generated documentation from JSDoc comments in the codebase.

## Modules

${availableModules.map(module => `- [${module.title}](${module.name}.md): ${module.summary}`).join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'index.md'), indexContent);
  console.log('Generated API index page');
};

// Generate documentation for each module
const generateModuleDocs = async () => {
  for (const module of apiModules) {
    const inputFile = path.join(sourceDir, module.file);
    const outputFile = path.join(outputDir, `${module.name}.md`);
    
    try {
      const exists = fs.existsSync(inputFile);
      if (!exists) {
        console.error(`File not found: ${inputFile}`);
        continue;
      }
      
      // Generate markdown from JSDoc comments
      const markdown = await jsdoc2md.render({
        files: inputFile,
        'no-cache': true,
        'example-lang': 'javascript',
        'name-format': 'code',
        // Add React-specific handling
        'heading-depth': 2,
        'module-index-format': 'list',
        'param-list-format': 'list',
        'property-list-format': 'list'
      });
      
      let outputContent = `# ${module.title} API\n\n${module.summary}\n\n`;

      if (markdown.trim()) {
        outputContent += markdown;
      } else {
        outputContent += 'No JSDoc content was found for this module.\n';
      }

      fs.writeFileSync(outputFile, outputContent);
      console.log(`Generated documentation for ${module.name}`);
    } catch (error) {
      console.error(`Error generating docs for ${module.name}:`, error);
    }
  }
};

// Main execution
const main = async () => {
  console.log('Generating API documentation...');
  generateApiIndex();
  await generateModuleDocs();
  console.log('API documentation generation complete!');
};

main().catch(error => {
  console.error('Error generating API documentation:', error);
  process.exit(1);
});
