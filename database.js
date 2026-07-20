// database.js - Data structures and persistence for SIR

const DEFAULT_NODES = [];
const DEFAULT_RELATIONS = [];
const DEFAULT_DELETED_NODES = [];
const DELETED_NODE_RETENTION_DAYS = 7;
const SIR_STORAGE_KEY = "SIR_graph_data";

const cloneRecord = (value) => JSON.parse(JSON.stringify(value));

const addDaysToIso = (isoDate, days) => {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const normalizeState = (state = {}) => ({
  nodes: Array.isArray(state.nodes) ? state.nodes : [...DEFAULT_NODES],
  relations: Array.isArray(state.relations) ? state.relations : [...DEFAULT_RELATIONS],
  deletedNodes: Array.isArray(state.deletedNodes) ? state.deletedNodes : [...DEFAULT_DELETED_NODES]
});

const pruneExpiredDeletedNodes = (deletedNodes = []) => {
  const now = Date.now();
  return deletedNodes.filter(entry => {
    const purgeAt = new Date(entry.purgeAt || 0).getTime();
    return Number.isFinite(purgeAt) && purgeAt > now;
  });
};

class SIRDatabase {
  static load() {
    try {
      const stored = localStorage.getItem(SIR_STORAGE_KEY);
      if (stored) {
        const parsed = normalizeState(JSON.parse(stored));
        parsed.deletedNodes = pruneExpiredDeletedNodes(parsed.deletedNodes);
        SIRDatabase.save(parsed.nodes, parsed.relations, parsed.deletedNodes);
        return parsed;
      }
    } catch (e) {
      console.error("Error reading from localstorage", e);
    }

    const defaults = normalizeState();
    SIRDatabase.save(defaults.nodes, defaults.relations, defaults.deletedNodes);
    return defaults;
  }

  static save(nodes, relations, deletedNodes = []) {
    try {
      const payload = normalizeState({ nodes, relations, deletedNodes });
      localStorage.setItem(SIR_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Error writing to localstorage", e);
    }
  }

  static reset() {
    localStorage.removeItem(SIR_STORAGE_KEY);
    return SIRDatabase.load();
  }

  static archiveNode(node, relations, deletedNodes = []) {
    const archivedAt = new Date().toISOString();
    return [
      ...deletedNodes,
      {
        archiveId: `trash-${node.id}-${Date.now()}`,
        deletedAt: archivedAt,
        purgeAt: addDaysToIso(archivedAt, DELETED_NODE_RETENTION_DAYS),
        node: cloneRecord(node),
        relations: cloneRecord(relations)
      }
    ];
  }

  static restoreArchivedNode(archiveId, nodes, relations, deletedNodes = []) {
    const archiveIndex = deletedNodes.findIndex(entry => entry.archiveId === archiveId);
    if (archiveIndex === -1) {
      return { nodes, relations, deletedNodes, restored: null };
    }

    const archive = deletedNodes[archiveIndex];
    const restoredNode = cloneRecord(archive.node);
    const restoredRelations = cloneRecord(archive.relations);

    const nextNodes = [...nodes, restoredNode];
    const nextRelations = [...relations, ...restoredRelations];
    const nextDeletedNodes = deletedNodes.filter(entry => entry.archiveId !== archiveId);

    return {
      nodes: nextNodes,
      relations: nextRelations,
      deletedNodes: nextDeletedNodes,
      restored: archive
    };
  }
}

// Export functions to global scope for browser files
window.SIRDatabase = SIRDatabase;
