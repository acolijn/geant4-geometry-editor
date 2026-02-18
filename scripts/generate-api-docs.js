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

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Components to document
const components = [
  { name: 'GeometryEditor', file: 'components/GeometryEditor.jsx' },
  { name: 'ProjectManager', file: 'components/ProjectManager.jsx' },
  // Add more components as needed
];

// Generate the API index page
const generateApiIndex = () => {
  const indexContent = `# API Reference

This section contains automatically generated documentation from JSDoc comments in the codebase.

## Components

${components.map(comp => `- [${comp.name}](${comp.name}.md)`).join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'index.md'), indexContent);
  console.log('Generated API index page');
};

// Generate documentation for each component
const generateComponentDocs = async () => {
  for (const component of components) {
    const inputFile = path.join(sourceDir, component.file);
    const outputFile = path.join(outputDir, `${component.name}.md`);
    
    try {
      const exists = fs.existsSync(inputFile);
      if (!exists) {
        console.error(`File not found: ${inputFile}`);
        continue;
      }
      
      // Check if we have a manually created documentation file
      const manualDocExists = fs.existsSync(outputFile);
      let manualDocHeader = '';
      
      // If manual documentation exists, preserve the header section (everything before ## Constants or ## Functions)
      if (manualDocExists) {
        const existingContent = fs.readFileSync(outputFile, 'utf8');
        const headerEndIndex = Math.max(
          existingContent.indexOf('## Constants'),
          existingContent.indexOf('## Functions'),
          existingContent.indexOf('## Methods')
        );
        
        if (headerEndIndex > 0) {
          manualDocHeader = existingContent.substring(0, headerEndIndex).trim() + '\n\n';
        } else {
          // If no section markers found, preserve the entire content as header
          manualDocHeader = existingContent;
        }
      }
      
      // Read the file content to add React component annotations if needed
      const fileContent = fs.readFileSync(inputFile, 'utf8');
      const isReactComponent = fileContent.includes('React.') || 
                              fileContent.includes('import React') || 
                              fileContent.includes('from "react"') || 
                              fileContent.includes('from \'react\'');
      
      // Generate markdown from JSDoc comments
      const markdown = await jsdoc2md.render({
        files: inputFile,
        configure: path.resolve(__dirname, '../jsdoc.json'),
        'no-cache': true,
        'example-lang': 'javascript',
        'name-format': 'code',
        // Add React-specific handling
        'heading-depth': 2,
        'module-index-format': 'list',
        'param-list-format': 'list',
        'property-list-format': 'list'
      });
      
      // Use the manual documentation header if it exists, otherwise create a default header
      let outputContent = '';
      
      if (manualDocHeader) {
        outputContent = manualDocHeader;
      } else {
        outputContent = '# ' + component.name + ' Component API\n\n';
        
        // Add React component specific introduction if applicable
        if (isReactComponent) {
          outputContent += 'This documentation describes the ' + component.name + ' React component, its props, state, and methods.\n\n';
        }
      }
      
      // Add the generated markdown
      outputContent += markdown;
      
      // Add usage examples if it's a React component
      if (isReactComponent) {
        outputContent += '\n## Usage Example\n\n```jsx\nimport { ' + component.name + ' } from \'./components/' + component.name + '\'\n\nfunction App() {\n  return (\n    <' + component.name + ' \n      // Add appropriate props here\n    />\n  );\n}\n```\n';
      }
      
      fs.writeFileSync(outputFile, outputContent);
      console.log(`Generated documentation for ${component.name}`);
    } catch (error) {
      console.error(`Error generating docs for ${component.name}:`, error);
    }
  }
};

// Main execution
const main = async () => {
  console.log('Generating API documentation...');
  generateApiIndex();
  await generateComponentDocs();
  console.log('API documentation generation complete!');
};

main().catch(error => {
  console.error('Error generating API documentation:', error);
  process.exit(1);
});
