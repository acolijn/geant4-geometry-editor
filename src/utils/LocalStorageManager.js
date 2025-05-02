/**
 * LocalStorageManager.js
 * A fallback storage manager that uses localStorage instead of the File System Access API
 */

class LocalStorageManager {
  constructor() {
    this.initialized = true;
    this.storagePrefix = 'geant4-editor-';
    this.projectsKey = `${this.storagePrefix}projects-list`;
    this.categoriesKey = `${this.storagePrefix}categories`;
    
    // Initialize default categories if they don't exist
    if (!localStorage.getItem(this.categoriesKey)) {
      localStorage.setItem(this.categoriesKey, JSON.stringify(['detectors', 'shielding', 'common']));
    }
  }

  /**
   * Initialize the storage manager (no-op for localStorage)
   * @returns {Promise<boolean>} Always returns true
   */
  async initialize() {
    return true;
  }

  /**
   * Save a project to localStorage
   * @param {string} name - Project name
   * @param {Object} geometry - Geometry data
   * @param {Object} metadata - Project metadata
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveProject(name, geometry, metadata = {}) {
    try {
      // Create project data with metadata
      const projectData = {
        geometry,
        metadata: {
          name,
          createdAt: metadata.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: metadata.description || '',
          ...metadata
        }
      };

      // Save project data
      localStorage.setItem(`${this.storagePrefix}project-${name}`, JSON.stringify(projectData));

      // Update projects list
      const projectsList = this.getProjectsList();
      const existingIndex = projectsList.findIndex(p => p.name === name);
      
      if (existingIndex >= 0) {
        // Update existing project metadata
        projectsList[existingIndex] = {
          name,
          createdAt: projectData.metadata.createdAt,
          updatedAt: projectData.metadata.updatedAt,
          description: projectData.metadata.description
        };
      } else {
        // Add new project metadata
        projectsList.push({
          name,
          createdAt: projectData.metadata.createdAt,
          updatedAt: projectData.metadata.updatedAt,
          description: projectData.metadata.description
        });
      }

      // Save updated projects list
      localStorage.setItem(this.projectsKey, JSON.stringify(projectsList));
      
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      return false;
    }
  }

  /**
   * Load a project from localStorage
   * @param {string} name - Project name
   * @returns {Promise<Object|null>} Project data or null if not found
   */
  async loadProject(name) {
    try {
      const projectDataJson = localStorage.getItem(`${this.storagePrefix}project-${name}`);
      if (!projectDataJson) {
        return null;
      }
      
      return JSON.parse(projectDataJson);
    } catch (error) {
      console.error(`Failed to load project ${name}:`, error);
      return null;
    }
  }

  /**
   * List all projects
   * @returns {Promise<Array>} List of project metadata
   */
  async listProjects() {
    return this.getProjectsList();
  }

  /**
   * Get the list of projects from localStorage
   * @returns {Array} List of project metadata
   */
  getProjectsList() {
    try {
      const projectsListJson = localStorage.getItem(this.projectsKey);
      return projectsListJson ? JSON.parse(projectsListJson) : [];
    } catch (error) {
      console.error('Failed to get projects list:', error);
      return [];
    }
  }

  /**
   * Save an object to localStorage
   * @param {string} name - Object name
   * @param {Object} object - Object data
   * @param {string} category - Category (detectors, shielding, common)
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveObject(name, object, category = 'common') {
    try {
      // Ensure the category exists
      await this.ensureCategoryExists(category);
      
      // Save object
      localStorage.setItem(`${this.storagePrefix}object-${category}-${name}`, JSON.stringify(object));
      
      // Update objects list for this category
      const objectsKey = `${this.storagePrefix}objects-${category}`;
      const objectsList = JSON.parse(localStorage.getItem(objectsKey) || '[]');
      
      if (!objectsList.includes(name)) {
        objectsList.push(name);
        localStorage.setItem(objectsKey, JSON.stringify(objectsList));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save object:', error);
      return false;
    }
  }

  /**
   * Load an object from localStorage
   * @param {string} name - Object name
   * @param {string} category - Category (detectors, shielding, common)
   * @returns {Promise<Object|null>} Object data or null if not found
   */
  async loadObject(name, category = 'common') {
    try {
      const objectDataJson = localStorage.getItem(`${this.storagePrefix}object-${category}-${name}`);
      if (!objectDataJson) {
        return null;
      }
      
      return JSON.parse(objectDataJson);
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
    try {
      const objectsKey = `${this.storagePrefix}objects-${category}`;
      const objectsList = localStorage.getItem(objectsKey);
      return objectsList ? JSON.parse(objectsList) : [];
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
    try {
      const categoriesJson = localStorage.getItem(this.categoriesKey);
      return categoriesJson ? JSON.parse(categoriesJson) : ['detectors', 'shielding', 'common'];
    } catch (error) {
      console.error('Failed to list categories:', error);
      return ['detectors', 'shielding', 'common'];
    }
  }

  /**
   * Create a new category
   * @param {string} name - Category name
   * @returns {Promise<boolean>} Whether the creation was successful
   */
  async createCategory(name) {
    try {
      const categories = await this.listCategories();
      
      if (!categories.includes(name)) {
        categories.push(name);
        localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to create category ${name}:`, error);
      return false;
    }
  }

  /**
   * Ensure a category exists
   * @param {string} category - Category name
   */
  async ensureCategoryExists(category) {
    const categories = await this.listCategories();
    
    if (!categories.includes(category)) {
      await this.createCategory(category);
    }
  }
}

// Export a singleton instance
const localStorageManager = new LocalStorageManager();
export default localStorageManager;
