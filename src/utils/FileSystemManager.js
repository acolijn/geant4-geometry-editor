/**
 * FileSystemManager.js
 * Handles interactions with the local file system using the File System Access API
 */

// Default base directory structure
const DEFAULT_STRUCTURE = {
  projects: {},
  objects: {
    detectors: {},
    shielding: {},
    common: {}
  },
  templates: {}
};

class FileSystemManager {
  constructor() {
    this.baseDirectory = null;
    this.directoryHandle = null;
    this.initialized = false;
  }

  /**
   * Initialize the file system manager by requesting access to a directory
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      // Check if the File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API is not supported in this browser. Please use Chrome, Edge, or another compatible browser.');
      }

      console.log('Initializing File System Manager - requesting directory access...');
      
      // Request a directory from the user with simplified options
      // Some browsers might not support all options
      try {
        this.directoryHandle = await window.showDirectoryPicker({
          id: 'geant4-projects',
          mode: 'readwrite'
        });
      } catch (e) {
        // Fallback to basic options if the above fails
        console.warn('Using fallback directory picker options:', e);
        this.directoryHandle = await window.showDirectoryPicker();
      }
      
      if (!this.directoryHandle) {
        throw new Error('Failed to get directory handle. User may have cancelled the selection.');
      }
      
      console.log('Directory selected:', this.directoryHandle);
      
      // Verify we have write access
      const verifyPermission = async (fileHandle, readWrite) => {
        const options = {};
        if (readWrite) {
          options.mode = 'readwrite';
        }
        
        // Check if we already have permission
        if ((await fileHandle.queryPermission(options)) === 'granted') {
          return true;
        }
        
        // Request permission if needed
        if ((await fileHandle.requestPermission(options)) === 'granted') {
          return true;
        }
        
        return false;
      };
      
      const hasWriteAccess = await verifyPermission(this.directoryHandle, true);
      if (!hasWriteAccess) {
        throw new Error('Write permission denied for the selected directory.');
      }
      
      this.baseDirectory = this.directoryHandle;
      this.initialized = true;
      
      // Create the default directory structure if it doesn't exist
      console.log('Creating directory structure...');
      await this.ensureDirectoryStructure();
      
      console.log('File System Manager initialized successfully!');
      return true;
    } catch (error) {
      console.error('Failed to initialize file system:', error);
      this.initialized = false;
      this.baseDirectory = null;
      this.directoryHandle = null;
      throw error; // Re-throw to allow the component to show a specific error message
    }
  }

  /**
   * Ensure the default directory structure exists
   */
  async ensureDirectoryStructure() {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    // Create main directories if they don't exist
    for (const dir of Object.keys(DEFAULT_STRUCTURE)) {
      await this.createDirectoryIfNotExists(dir);
      
      // Create subdirectories if applicable
      if (typeof DEFAULT_STRUCTURE[dir] === 'object') {
        for (const subdir of Object.keys(DEFAULT_STRUCTURE[dir])) {
          await this.createDirectoryIfNotExists(`${dir}/${subdir}`);
        }
      }
    }
  }

  /**
   * Create a directory if it doesn't exist
   * @param {string} path - Path to the directory
   */
  async createDirectoryIfNotExists(path) {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    const parts = path.split('/');
    let currentHandle = this.baseDirectory;

    for (const part of parts) {
      try {
        // Try to get the directory
        currentHandle = await currentHandle.getDirectoryHandle(part);
      } catch (error) {
        // Directory doesn't exist, create it
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }
    }

    return currentHandle;
  }

  /**
   * Save a project to the file system
   * @param {string} name - Project name
   * @param {Object} geometry - Geometry data
   * @param {Object} metadata - Project metadata
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveProject(name, geometry, metadata = {}) {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      // Create project directory
      const projectsDir = await this.baseDirectory.getDirectoryHandle('projects', { create: true });
      const projectDir = await projectsDir.getDirectoryHandle(name, { create: true });

      // Save metadata
      const metadataFile = await projectDir.getFileHandle('metadata.json', { create: true });
      const metadataWriter = await metadataFile.createWritable();
      await metadataWriter.write(JSON.stringify({
        name,
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: metadata.description || '',
        ...metadata
      }, null, 2));
      await metadataWriter.close();

      // Save geometry
      const geometryFile = await projectDir.getFileHandle('geometry.json', { create: true });
      const geometryWriter = await geometryFile.createWritable();
      await geometryWriter.write(JSON.stringify(geometry, null, 2));
      await geometryWriter.close();

      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      return false;
    }
  }

  /**
   * Load a project from the file system
   * @param {string} name - Project name
   * @returns {Promise<Object|null>} Project data or null if not found
   */
  async loadProject(name) {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      // Get project directory
      const projectsDir = await this.baseDirectory.getDirectoryHandle('projects');
      const projectDir = await projectsDir.getDirectoryHandle(name);

      // Load metadata
      const metadataFile = await projectDir.getFileHandle('metadata.json');
      const metadataContents = await (await metadataFile.getFile()).text();
      const metadata = JSON.parse(metadataContents);

      // Load geometry
      const geometryFile = await projectDir.getFileHandle('geometry.json');
      const geometryContents = await (await geometryFile.getFile()).text();
      const geometry = JSON.parse(geometryContents);

      return {
        metadata,
        geometry
      };
    } catch (error) {
      console.error(`Failed to load project ${name}:`, error);
      return null;
    }
  }

  /**
   * List all projects
   * @returns {Promise<Array>} List of project names and metadata
   */
  async listProjects() {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      const projects = [];
      const projectsDir = await this.baseDirectory.getDirectoryHandle('projects');
      
      // Iterate through project directories
      for await (const [name, handle] of projectsDir.entries()) {
        if (handle.kind === 'directory') {
          try {
            // Try to load metadata
            const metadataFile = await handle.getFileHandle('metadata.json');
            const metadataContents = await (await metadataFile.getFile()).text();
            const metadata = JSON.parse(metadataContents);
            
            projects.push({
              name,
              ...metadata
            });
          } catch (error) {
            // If metadata doesn't exist, just add the name
            projects.push({ name });
          }
        }
      }
      
      return projects;
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  /**
   * Save an object to the file system
   * @param {string} name - Object name
   * @param {Object} object - Object data
   * @param {string} category - Category (detectors, shielding, common)
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveObject(name, object, category = 'common') {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      // Ensure the category exists
      const objectsDir = await this.baseDirectory.getDirectoryHandle('objects', { create: true });
      const categoryDir = await objectsDir.getDirectoryHandle(category, { create: true });

      // Save object
      const objectFile = await categoryDir.getFileHandle(`${name}.json`, { create: true });
      const objectWriter = await objectFile.createWritable();
      await objectWriter.write(JSON.stringify(object, null, 2));
      await objectWriter.close();

      return true;
    } catch (error) {
      console.error('Failed to save object:', error);
      return false;
    }
  }

  /**
   * Load an object from the file system
   * @param {string} name - Object name
   * @param {string} category - Category (detectors, shielding, common)
   * @returns {Promise<Object|null>} Object data or null if not found
   */
  async loadObject(name, category = 'common') {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      // Get object file
      const objectsDir = await this.baseDirectory.getDirectoryHandle('objects');
      const categoryDir = await objectsDir.getDirectoryHandle(category);
      const objectFile = await categoryDir.getFileHandle(`${name}.json`);
      
      // Load object data
      const objectContents = await (await objectFile.getFile()).text();
      return JSON.parse(objectContents);
    } catch (error) {
      console.error(`Failed to load object ${name} from ${category}:`, error);
      return null;
    }
  }

  /**
   * List all objects in a category
   * @param {string} category - Category (detectors, shielding, common)
   * @returns {Promise<Array>} List of object names
   */
  async listObjects(category = 'common') {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      const objects = [];
      const objectsDir = await this.baseDirectory.getDirectoryHandle('objects');
      const categoryDir = await objectsDir.getDirectoryHandle(category);
      
      // Iterate through object files
      for await (const [name, handle] of categoryDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) {
          objects.push(name.replace('.json', ''));
        }
      }
      
      return objects;
    } catch (error) {
      console.error(`Failed to list objects in ${category}:`, error);
      return [];
    }
  }

  /**
   * List all categories
   * @returns {Promise<Array>} List of category names
   */
  async listCategories() {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      const categories = [];
      const objectsDir = await this.baseDirectory.getDirectoryHandle('objects');
      
      // Iterate through category directories
      for await (const [name, handle] of objectsDir.entries()) {
        if (handle.kind === 'directory') {
          categories.push(name);
        }
      }
      
      return categories;
    } catch (error) {
      console.error('Failed to list categories:', error);
      return [];
    }
  }

  /**
   * Create a new category
   * @param {string} name - Category name
   * @returns {Promise<boolean>} Whether the creation was successful
   */
  async createCategory(name) {
    if (!this.initialized) {
      throw new Error('FileSystemManager not initialized');
    }

    try {
      const objectsDir = await this.baseDirectory.getDirectoryHandle('objects', { create: true });
      await objectsDir.getDirectoryHandle(name, { create: true });
      return true;
    } catch (error) {
      console.error(`Failed to create category ${name}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
const fileSystemManager = new FileSystemManager();
export default fileSystemManager;
