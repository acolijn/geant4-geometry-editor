/**
 * IndexedDBManager.js
 * Fallback storage manager using IndexedDB for browsers that don't support the File System Access API
 * (Firefox, Safari, older browsers, etc.)
 */

const DB_NAME = 'geant4-geometry-editor';
const DB_VERSION = 1;

// Store names
const STORES = {
  PROJECTS: 'projects',
  OBJECTS: 'objects',
  CATEGORIES: 'categories',
  METADATA: 'metadata'
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.baseDirectory = null; // For compatibility with FileSystemManager API
  }

  /**
   * Initialize the IndexedDB storage
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing IndexedDB Manager...');
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
          console.error('IndexedDB error:', event.target.error);
          this.initialized = false;
          reject(new Error('Failed to open IndexedDB: ' + event.target.error?.message));
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.initialized = true;
          this.baseDirectory = { name: 'IndexedDB Storage' }; // For compatibility
          console.log('IndexedDB initialized successfully');
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          console.log('IndexedDB upgrade needed, creating stores...');
          const db = event.target.result;
          
          // Create projects store
          if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
            const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'name' });
            projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          
          // Create objects store
          if (!db.objectStoreNames.contains(STORES.OBJECTS)) {
            const objectsStore = db.createObjectStore(STORES.OBJECTS, { keyPath: 'id' });
            objectsStore.createIndex('category', 'category', { unique: false });
            objectsStore.createIndex('name', 'name', { unique: false });
          }
          
          // Create categories store
          if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
            db.createObjectStore(STORES.CATEGORIES, { keyPath: 'name' });
          }
          
          // Create metadata store
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          }
        };
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        this.initialized = false;
        reject(error);
      }
    });
  }

  /**
   * Ensure the default directory structure exists (compatibility method)
   */
  async ensureDirectoryStructure() {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }
    
    // Create default categories if they don't exist
    const defaultCategories = ['detectors', 'shielding', 'common'];
    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }

  /**
   * Create a directory if it doesn't exist (compatibility method)
   * @param {string} path - Path to the directory
   */
  async createDirectoryIfNotExists() {
    // No-op for IndexedDB, kept for API compatibility
    return true;
  }

  /**
   * Save a project to IndexedDB
   * @param {string} name - Project name
   * @param {Object} geometry - Geometry data
   * @param {Object} metadata - Project metadata
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveProject(name, geometry, metadata = {}) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.PROJECTS], 'readwrite');
        const store = transaction.objectStore(STORES.PROJECTS);
        
        const projectData = {
          name,
          geometry,
          metadata: {
            name,
            createdAt: metadata.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description: metadata.description || '',
            ...metadata
          },
          updatedAt: new Date().toISOString()
        };
        
        const request = store.put(projectData);
        
        request.onsuccess = () => {
          console.log(`Project "${name}" saved successfully`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Failed to save project:', event.target.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to save project:', error);
        resolve(false);
      }
    });
  }

  /**
   * Load a project from IndexedDB
   * @param {string} name - Project name
   * @returns {Promise<Object|null>} Project data or null if not found
   */
  async loadProject(name) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.PROJECTS], 'readonly');
        const store = transaction.objectStore(STORES.PROJECTS);
        const request = store.get(name);
        
        request.onsuccess = (event) => {
          const result = event.target.result;
          if (result) {
            resolve({
              metadata: result.metadata,
              geometry: result.geometry
            });
          } else {
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          console.error(`Failed to load project ${name}:`, event.target.error);
          resolve(null);
        };
      } catch (error) {
        console.error(`Failed to load project ${name}:`, error);
        resolve(null);
      }
    });
  }

  /**
   * List all projects
   * @returns {Promise<Array>} List of project names and metadata
   */
  async listProjects() {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.PROJECTS], 'readonly');
        const store = transaction.objectStore(STORES.PROJECTS);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          const projects = event.target.result.map(project => ({
            name: project.name,
            ...project.metadata
          }));
          resolve(projects);
        };
        
        request.onerror = (event) => {
          console.error('Failed to list projects:', event.target.error);
          resolve([]);
        };
      } catch (error) {
        console.error('Failed to list projects:', error);
        resolve([]);
      }
    });
  }

  /**
   * Delete a project
   * @param {string} name - Project name
   * @returns {Promise<boolean>} Whether the deletion was successful
   */
  async deleteProject(name) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.PROJECTS], 'readwrite');
        const store = transaction.objectStore(STORES.PROJECTS);
        const request = store.delete(name);
        
        request.onsuccess = () => {
          console.log(`Project "${name}" deleted successfully`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Failed to delete project:', event.target.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to delete project:', error);
        resolve(false);
      }
    });
  }

  /**
   * Save an object to IndexedDB
   * @param {string} name - Object name
   * @param {Object} object - Object data
   * @param {string} category - Category name (optional, defaults to 'common')
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveObject(name, object, category = 'common') {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.OBJECTS], 'readwrite');
        const store = transaction.objectStore(STORES.OBJECTS);
        
        const objectData = {
          id: `${category}/${name}`,
          name,
          category,
          data: object,
          updatedAt: new Date().toISOString()
        };
        
        const request = store.put(objectData);
        
        request.onsuccess = () => {
          console.log(`Object "${name}" saved successfully in category "${category}"`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Failed to save object:', event.target.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to save object:', error);
        resolve(false);
      }
    });
  }

  /**
   * Load an object from IndexedDB
   * @param {string} name - Object name
   * @param {string} category - Category name (optional)
   * @returns {Promise<Object|null>} Object data or null if not found
   */
  async loadObject(name, category = null) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.OBJECTS], 'readonly');
        const store = transaction.objectStore(STORES.OBJECTS);
        
        if (category) {
          // Direct lookup with category
          const request = store.get(`${category}/${name}`);
          
          request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.data : null);
          };
          
          request.onerror = (event) => {
            console.error(`Failed to load object ${name}:`, event.target.error);
            resolve(null);
          };
        } else {
          // Search by name across all categories
          const index = store.index('name');
          const request = index.get(name);
          
          request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.data : null);
          };
          
          request.onerror = (event) => {
            console.error(`Failed to load object ${name}:`, event.target.error);
            resolve(null);
          };
        }
      } catch (error) {
        console.error(`Failed to load object ${name}:`, error);
        resolve(null);
      }
    });
  }

  /**
   * List all objects in a category
   * @param {string} category - Category name
   * @returns {Promise<Array>} List of object names
   */
  async listObjects(category = null) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.OBJECTS], 'readonly');
        const store = transaction.objectStore(STORES.OBJECTS);
        
        if (category) {
          const index = store.index('category');
          const request = index.getAll(category);
          
          request.onsuccess = (event) => {
            const objects = event.target.result.map(obj => obj.name);
            resolve(objects);
          };
          
          request.onerror = (event) => {
            console.error(`Failed to list objects in ${category}:`, event.target.error);
            resolve([]);
          };
        } else {
          const request = store.getAll();
          
          request.onsuccess = (event) => {
            const objects = event.target.result.map(obj => obj.name);
            resolve(objects);
          };
          
          request.onerror = (event) => {
            console.error('Failed to list objects:', event.target.error);
            resolve([]);
          };
        }
      } catch (error) {
        console.error('Failed to list objects:', error);
        resolve([]);
      }
    });
  }

  /**
   * Delete an object
   * @param {string} name - Object name
   * @param {string} category - Category name
   * @returns {Promise<boolean>} Whether the deletion was successful
   */
  async deleteObject(name, category = 'common') {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.OBJECTS], 'readwrite');
        const store = transaction.objectStore(STORES.OBJECTS);
        const request = store.delete(`${category}/${name}`);
        
        request.onsuccess = () => {
          console.log(`Object "${name}" deleted successfully`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Failed to delete object:', event.target.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to delete object:', error);
        resolve(false);
      }
    });
  }

  /**
   * Create a category
   * @param {string} name - Category name
   * @returns {Promise<boolean>} Whether the creation was successful
   */
  async createCategory(name) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.CATEGORIES], 'readwrite');
        const store = transaction.objectStore(STORES.CATEGORIES);
        const request = store.put({ name, createdAt: new Date().toISOString() });
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Failed to create category:', event.target.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to create category:', error);
        resolve(false);
      }
    });
  }

  /**
   * List all categories
   * @returns {Promise<Array>} List of category names
   */
  async listCategories() {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([STORES.CATEGORIES], 'readonly');
        const store = transaction.objectStore(STORES.CATEGORIES);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          const categories = event.target.result.map(cat => cat.name);
          resolve(categories);
        };
        
        request.onerror = (event) => {
          console.error('Failed to list categories:', event.target.error);
          resolve([]);
        };
      } catch (error) {
        console.error('Failed to list categories:', error);
        resolve([]);
      }
    });
  }

  /**
   * Delete a category (and optionally all objects in it)
   * @param {string} name - Category name
   * @param {boolean} deleteObjects - Whether to delete objects in the category
   * @returns {Promise<boolean>} Whether the deletion was successful
   */
  async deleteCategory(name, deleteObjects = false) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    return new Promise((resolve) => {
      const run = async () => {
        try {
          if (deleteObjects) {
            // Delete all objects in the category first
            const objects = await this.listObjects(name);
            for (const objName of objects) {
              await this.deleteObject(objName, name);
            }
          }
          
          const transaction = this.db.transaction([STORES.CATEGORIES], 'readwrite');
          const store = transaction.objectStore(STORES.CATEGORIES);
          const request = store.delete(name);
          
          request.onsuccess = () => {
            console.log(`Category "${name}" deleted successfully`);
            resolve(true);
          };
          
          request.onerror = (event) => {
            console.error('Failed to delete category:', event.target.error);
            resolve(false);
          };
        } catch (error) {
          console.error('Failed to delete category:', error);
          resolve(false);
        }
      };
      run();
    });
  }

  /**
   * Export all data as a downloadable JSON file
   * @returns {Promise<void>}
   */
  async exportAllData() {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    try {
      const projects = await this.listProjects();
      const categories = await this.listCategories();
      
      const exportData = {
        projects: [],
        objects: [],
        categories,
        exportedAt: new Date().toISOString()
      };
      
      // Export all projects with their data
      for (const project of projects) {
        const projectData = await this.loadProject(project.name);
        if (projectData) {
          exportData.projects.push({
            name: project.name,
            ...projectData
          });
        }
      }
      
      // Export all objects
      const transaction = this.db.transaction([STORES.OBJECTS], 'readonly');
      const store = transaction.objectStore(STORES.OBJECTS);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          exportData.objects = event.target.result;
          
          // Create and download the export file
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `geant4-geometry-backup-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error('Failed to export data'));
        };
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data from a JSON file
   * @param {Object} data - The data to import
   * @returns {Promise<boolean>} Whether the import was successful
   */
  async importData(data) {
    if (!this.initialized) {
      throw new Error('IndexedDBManager not initialized');
    }

    try {
      // Import categories
      if (data.categories && Array.isArray(data.categories)) {
        for (const category of data.categories) {
          await this.createCategory(category);
        }
      }
      
      // Import projects
      if (data.projects && Array.isArray(data.projects)) {
        for (const project of data.projects) {
          await this.saveProject(project.name, project.geometry, project.metadata);
        }
      }
      
      // Import objects
      if (data.objects && Array.isArray(data.objects)) {
        for (const obj of data.objects) {
          await this.saveObject(obj.name, obj.data, obj.category);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * Read a JSON file (compatibility method - uses file input)
   * @returns {Promise<Object>} The parsed JSON content
   */
  async readJsonFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        try {
          const content = await file.text();
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse JSON file: ' + error.message));
        }
      };
      
      input.click();
    });
  }

  /**
   * Write a JSON file (compatibility method - uses download)
   * @param {string} filename - The filename to save as
   * @param {Object} data - The data to save
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async writeJsonFile(filename, data) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Failed to write JSON file:', error);
      return false;
    }
  }
}

// Export a singleton instance
const indexedDBManager = new IndexedDBManager();
export default indexedDBManager;
