// algorithms.js - Intelligence, influence, communities and pathfinding for SIR

/**
 * Calculates the decay factor of a relation based on months since the last interaction.
 * @param {string} lastInteractionIso ISO Date string
 * @returns {number} Value between 0.10 and 1.0
 */
function calculateDecayFactor(lastInteractionIso) {
  if (!lastInteractionIso) return 0.10;
  const lastDate = new Date(lastInteractionIso);
  const now = new Date("2026-07-17T20:00:00Z"); // Anchor to mock current time for consistency
  const diffTime = Math.max(0, now - lastDate);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const diffMonths = diffDays / 30.44;

  if (diffMonths <= 0) return 1.0;
  if (diffMonths <= 6) {
    // 0 to 6 months: linear decay from 100% to 90%
    return 1.0 - (0.10 * (diffMonths / 6));
  } else if (diffMonths <= 12) {
    // 6 to 12 months: linear decay from 90% to 75%
    return 0.90 - (0.15 * ((diffMonths - 6) / 6));
  } else if (diffMonths <= 24) {
    // 12 to 24 months: linear decay from 75% to 50%
    return 0.75 - (0.25 * ((diffMonths - 12) / 12));
  } else {
    // > 24 months: linear decay from 50% to 10% (capped at 36 months)
    if (diffMonths >= 36) return 0.10;
    return 0.50 - (0.40 * ((diffMonths - 24) / 12));
  }
}

/**
 * Maps an influence index to a named level with color and boundaries.
 * @param {number} index Influence index (0 - 1000)
 */
function getInfluenceLevel(index) {
  const score = Math.round(index);
  if (score < 50) return { level: 0, name: "Nodo Nuevo", color: "#6B7280", class: "level-new" };
  if (score < 150) return { level: 1, name: "Conector", color: "#3B82F6", class: "level-connector" };
  if (score < 300) return { level: 2, name: "Influenciador", color: "#10B981", class: "level-influencer" };
  if (score < 500) return { level: 3, name: "Catalizador", color: "#F59E0B", class: "level-catalyst" };
  if (score < 750) return { level: 4, name: "Hub Estratégico", color: "#F97316", class: "level-hub" };
  return { level: 5, name: "Supernodo", color: "#EF4444", class: "level-super" };
}

/**
 * Computes all node influence metrics and details.
 * @param {Array} nodes List of node objects
 * @param {Array} relations List of relation objects
 * @returns {Object} A map from nodeId to calculated influence statistics
 */
function calculateInfluenceIndexes(nodes, relations) {
  const stats = {};
  const activeRelations = relations.filter(r => r.estado === "Activo");

  // Get active weights and build adjacency lists
  const adj = {}; // nodeId -> array of { neighborId, relation, activeWeight }
  nodes.forEach(n => {
    adj[n.id] = [];
    stats[n.id] = {
      degree: 0,
      uniqueTypes: new Set(),
      sumActiveWeights: 0,
      mostRecentActivity: null,
      betweenness: 0,
      closeness: 0
    };
  });

  const nodeTypes = new Set(nodes.map(n => n.tipo));
  const totalTypesCount = Math.max(1, nodeTypes.size);

  // Process relations to populate raw degrees, type diversities, quality, activity
  activeRelations.forEach(rel => {
    const origNode = nodes.find(n => n.id === rel.origen);
    const destNode = nodes.find(n => n.id === rel.destino);
    if (!origNode || !destNode) return;

    const decay = calculateDecayFactor(rel.ultimaInteraccion);
    const activeWeight = rel.pesoInicial * decay;

    // Undirected parsing for metrics calculations
    adj[rel.origen].push({ neighborId: rel.destino, rel, activeWeight });
    adj[rel.destino].push({ neighborId: rel.origen, rel, activeWeight });

    // Update raw stats for origin
    const sO = stats[rel.origen];
    sO.degree++;
    sO.uniqueTypes.add(destNode.tipo);
    sO.sumActiveWeights += activeWeight;
    if (!sO.mostRecentActivity || new Date(rel.ultimaInteraccion) > new Date(sO.mostRecentActivity)) {
      sO.mostRecentActivity = rel.ultimaInteraccion;
    }

    // Update raw stats for destination
    const sD = stats[rel.destino];
    sD.degree++;
    sD.uniqueTypes.add(origNode.tipo);
    sD.sumActiveWeights += activeWeight;
    if (!sD.mostRecentActivity || new Date(rel.ultimaInteraccion) > new Date(sD.mostRecentActivity)) {
      sD.mostRecentActivity = rel.ultimaInteraccion;
    }
  });

  // Calculate maximum degree in the graph for normalization
  const maxDegree = Math.max(1, ...Object.values(stats).map(s => s.degree));

  // --- Centrality (Approx Closeness & Betweenness Centrality) ---
  // Using Breadth-First Search (BFS) to compute shortest path counts and path lengths
  const closenessValues = {};
  const betweennessValues = {};
  nodes.forEach(n => {
    closenessValues[n.id] = 0;
    betweennessValues[n.id] = 0;
  });

  nodes.forEach(startNode => {
    // Single-source shortest path counts and distances (Brandes' algorithm helper style)
    const queue = [startNode.id];
    const dist = {};
    const paths = {};
    const parents = {};
    const order = [];

    nodes.forEach(n => {
      dist[n.id] = -1;
      paths[n.id] = 0;
      parents[n.id] = [];
    });

    dist[startNode.id] = 0;
    paths[startNode.id] = 1;

    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      adj[u].forEach(({ neighborId }) => {
        if (dist[neighborId] === -1) {
          dist[neighborId] = dist[u] + 1;
          queue.push(neighborId);
        }
        if (dist[neighborId] === dist[u] + 1) {
          paths[neighborId] += paths[u];
          parents[neighborId].push(u);
        }
      });
    }

    // Accumulate closeness
    let sumDist = 0;
    let reached = 0;
    nodes.forEach(n => {
      if (dist[n.id] > 0) {
        sumDist += dist[n.id];
        reached++;
      }
    });
    if (reached > 0 && sumDist > 0) {
      closenessValues[startNode.id] = reached / sumDist;
    }

    // Accumulate betweenness dependencies
    const dependency = {};
    nodes.forEach(n => {
      dependency[n.id] = 0;
    });
    while (order.length > 0) {
      const w = order.pop();
      parents[w].forEach(v => {
        dependency[v] += (paths[v] / paths[w]) * (1 + dependency[w]);
      });
      if (w !== startNode.id) {
        betweennessValues[w] += dependency[w];
      }
    }
  });

  const maxCloseness = Math.max(0.0001, ...Object.values(closenessValues));
  const maxBetweenness = Math.max(0.0001, ...Object.values(betweennessValues));

  // --- Pass 1: Preliminary Influence (Excluding Neighbor Influence) ---
  // Re-adjust weights to 100% excluding neighbors:
  // Degree: 25% -> 29.41%
  // Diversity: 20% -> 23.53%
  // Quality: 15% -> 17.65%
  // Age: 10% -> 11.76%
  // Activity: 10% -> 11.76%
  // Centrality: 5% -> 5.88%
  const prelimScores = {};
  const now = new Date("2026-07-17T20:00:00Z");

  nodes.forEach(n => {
    const raw = stats[n.id];

    // 1. Degree score (25%)
    const scoreDegree = (raw.degree / maxDegree) * 1000;

    // 2. Diversity score (20%)
    const scoreDiversity = (raw.uniqueTypes.size / totalTypesCount) * 1000;

    // 3. Quality score (15%)
    const avgWeight = raw.degree > 0 ? (raw.sumActiveWeights / raw.degree) : 0;
    const scoreQuality = Math.min(1000, (avgWeight / 20) * 1000); // 20 is initial max weight

    // 4. Age score (10%)
    const ageDays = Math.max(0, (now - new Date(n.fechaCreacion)) / (1000 * 60 * 60 * 24));
    const scoreAge = Math.min(1000, (ageDays / 365) * 1000); // normalized to 1 year

    // 5. Activity score (10%)
    const scoreActivity = raw.mostRecentActivity ? calculateDecayFactor(raw.mostRecentActivity) * 1000 : 0;

    // 6. Centrality score (5%)
    const normCloseness = (closenessValues[n.id] / maxCloseness) * 1000;
    const normBetweenness = (betweennessValues[n.id] / maxBetweenness) * 1000;
    const scoreCentrality = (normCloseness + normBetweenness) / 2; // combined closeness & betweenness

    prelimScores[n.id] = {
      degree: scoreDegree,
      diversity: scoreDiversity,
      quality: scoreQuality,
      age: scoreAge,
      activity: scoreActivity,
      centrality: scoreCentrality,
      partialSum: (0.25 * scoreDegree) + (0.20 * scoreDiversity) + (0.15 * scoreQuality) + (0.10 * scoreAge) + (0.10 * scoreActivity) + (0.05 * scoreCentrality)
    };
  });

  // --- Pass 2: Calculate Final Scores (Including Neighbor Influence) ---
  const finalIndexes = {};
  nodes.forEach(n => {
    const raw = stats[n.id];
    const prelim = prelimScores[n.id];

    // Compute neighbor influence (15%)
    let scoreNeighbors = 0;
    if (raw.degree > 0) {
      let sumNeighborPrelim = 0;
      adj[n.id].forEach(({ neighborId }) => {
        // Use neighbors' partial sums normalized to a 1000-point scale
        // Since partial sum is missing the 15% neighbor score, normalize: partialSum / 0.85
        sumNeighborPrelim += prelimScores[neighborId].partialSum / 0.85;
      });
      scoreNeighbors = sumNeighborPrelim / raw.degree;
    }

    // Combine all components
    const finalScore = prelim.partialSum + (0.15 * scoreNeighbors);
    const roundedScore = Math.max(0, Math.min(1000, Math.round(finalScore)));

    finalIndexes[n.id] = {
      index: roundedScore,
      levelInfo: getInfluenceLevel(roundedScore),
      breakdown: {
        degree: Math.round(prelim.degree),
        diversity: Math.round(prelim.diversity),
        quality: Math.round(prelim.quality),
        neighbors: Math.round(scoreNeighbors),
        age: Math.round(prelim.age),
        activity: Math.round(prelim.activity),
        centrality: Math.round(prelim.centrality)
      }
    };
  });

  return finalIndexes;
}

/**
 * Automatical community detection using Label Propagation Algorithm (LPA).
 * @param {Array} nodes List of node objects
 * @param {Array} relations List of active relation objects
 * @returns {Object} Map from nodeId to community index/ID
 */
function detectCommunitiesLPA(nodes, relations) {
  const communities = {};
  const activeRelations = relations.filter(r => r.estado === "Activo");

  // 1. Initialize communities: each node is in its own community
  nodes.forEach(n => {
    communities[n.id] = n.id;
  });

  // Build weighted adjacency map
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });

  activeRelations.forEach(rel => {
    const decay = calculateDecayFactor(rel.ultimaInteraccion);
    const weight = rel.pesoInicial * decay;
    adj[rel.origen].push({ neighborId: rel.destino, weight });
    adj[rel.destino].push({ neighborId: rel.origen, weight });
  });

  const nodeIds = nodes.map(n => n.id);
  const maxIterations = 15;

  // Shuffle helper
  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  // 2. Iterate propagation
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    shuffleArray(nodeIds);

    nodeIds.forEach(u => {
      const neighbors = adj[u];
      if (neighbors.length === 0) return;

      // Count weighted label occurrences
      const counts = {};
      neighbors.forEach(({ neighborId, weight }) => {
        const label = communities[neighborId];
        counts[label] = (counts[label] || 0) + weight;
      });

      // Find label with max weight
      let maxLabel = communities[u];
      let maxVal = -1;
      for (const label in counts) {
        if (counts[label] > maxVal) {
          maxVal = counts[label];
          maxLabel = label;
        }
      }

      if (communities[u] !== maxLabel) {
        communities[u] = maxLabel;
        changed = true;
      }
    });

    if (!changed) break; // Early termination if converged
  }

  // Normalize community labels to simple indices (1, 2, 3...)
  const labelMap = {};
  let currentLabelIndex = 1;
  const normalizedCommunities = {};

  nodes.forEach(n => {
    const rawLabel = communities[n.id];
    if (!labelMap[rawLabel]) {
      labelMap[rawLabel] = `Comunidad ${currentLabelIndex++}`;
    }
    normalizedCommunities[n.id] = labelMap[rawLabel];
  });

  return normalizedCommunities;
}

/**
 * Finds the shortest pathway (Dijkstra) between two nodes.
 * Traverses relations in both directions, weighting edges by strength:
 * cost = 1.0 / (activeWeight * (confidence / 100))
 */
function findShortestRoute(nodes, relations, startNodeId, endNodeId) {
  if (startNodeId === endNodeId) return [startNodeId];

  // Adjacency for pathfinding
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });

  relations.filter(r => r.estado === "Activo").forEach(rel => {
    const decay = calculateDecayFactor(rel.ultimaInteraccion);
    const activeWeight = rel.pesoInicial * decay;
    const confidenceFactor = rel.confianza / 100.0;
    
    // Avoid dividing by zero: cap active weight at 0.1
    const cost = 1.0 / (Math.max(0.1, activeWeight) * Math.max(0.1, confidenceFactor));

    adj[rel.origen].push({ to: rel.destino, cost, rel });
    adj[rel.destino].push({ to: rel.origen, cost, rel });
  });

  // Dijkstra's priority queue structures
  const dist = {};
  const prev = {};
  const visited = new Set();
  const pq = []; // Array of { node, cost }

  nodes.forEach(n => {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  });

  dist[startNodeId] = 0;
  pq.push({ node: startNodeId, cost: 0 });

  while (pq.length > 0) {
    // Sort array to simulate priority queue
    pq.sort((a, b) => a.cost - b.cost);
    const { node: u } = pq.shift();

    if (u === endNodeId) break;
    if (visited.has(u)) continue;
    visited.add(u);

    adj[u].forEach(({ to, cost }) => {
      if (visited.has(to)) return;
      const alt = dist[u] + cost;
      if (alt < dist[to]) {
        dist[to] = alt;
        prev[to] = u;
        pq.push({ node: to, cost: alt });
      }
    });
  }

  // Reconstruct path
  if (dist[endNodeId] === Infinity) return null; // No path found

  const path = [];
  let curr = endNodeId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr];
  }

  return path;
}

// Export functions to global scope
window.SIRAlgorithms = {
  calculateDecayFactor,
  getInfluenceLevel,
  calculateInfluenceIndexes,
  detectCommunitiesLPA,
  findShortestRoute
};
