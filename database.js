// database.js - Data structures and persistence for SIR

const DEFAULT_NODES = [];
const DEFAULT_RELATIONS = [];

const SIR_STORAGE_KEY = "SIR_graph_data";

class SIRDatabase {
  static load() {
    try {
      const stored = localStorage.getItem(SIR_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading from localstorage", e);
    }

    const defaults = { nodes: DEFAULT_NODES, relations: DEFAULT_RELATIONS };
    SIRDatabase.save(defaults.nodes, defaults.relations);
    return defaults;
  }

  static save(nodes, relations) {
    try {
      localStorage.setItem(SIR_STORAGE_KEY, JSON.stringify({ nodes, relations }));
    } catch (e) {
      console.error("Error writing to localstorage", e);
    }
  }

  static reset() {
    localStorage.removeItem(SIR_STORAGE_KEY);
    return SIRDatabase.load();
  }
}

// Export functions to global scope for browser files
window.SIRDatabase = SIRDatabase;
