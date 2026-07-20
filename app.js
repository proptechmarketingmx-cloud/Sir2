// app.js - SIR Orchestrator and UI Interactions

document.addEventListener("DOMContentLoaded", () => {
  const getTodayDateValue = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  };

  const getTypeBadgeClass = (type) => {
    const normalized = String(type || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    return `badge-${normalized || "default"}`;
  };

  const escapeHTML = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const toDateInputValue = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
  };

  const createEntityId = (prefix) => {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

  const sidebarPanel = document.getElementById("sidebar-panel");
  const sidebarToggleBtn = document.getElementById("btn-toggle-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const searchSuggestionsEl = document.getElementById("search-suggestions");

  const busyOverlay = document.getElementById("busy-overlay");
  const busyTitleEl = document.getElementById("busy-title");

  const confirmModal = document.getElementById("confirm-modal");
  const confirmModalTitleEl = document.getElementById("confirm-modal-title");
  const confirmModalMessageEl = document.getElementById("confirm-modal-message");
  const confirmModalInputGroup = document.getElementById("confirm-modal-input-group");
  const confirmModalInput = document.getElementById("confirm-modal-input");
  const btnCloseConfirmModal = document.getElementById("btn-close-confirm-modal");
  const btnCancelConfirmModal = document.getElementById("btn-cancel-confirm-modal");
  const btnAcceptConfirmModal = document.getElementById("btn-accept-confirm-modal");

  const btnAddAttribute = document.getElementById("btn-add-attribute");
  const nodeAttributesEditor = document.getElementById("node-attributes-editor");

  const mobileSidebarQuery = window.matchMedia("(max-width: 960px)");
  let activeModalEl = null;
  let modalRestoreFocus = null;
  let confirmState = null;

  const setBusyState = (isBusy, label = "Procesando...") => {
    if (!busyOverlay || !busyTitleEl) return;
    busyTitleEl.textContent = label;
    busyOverlay.style.display = isBusy ? "flex" : "none";
    busyOverlay.setAttribute("aria-hidden", isBusy ? "false" : "true");
  };

  const openSidebar = (animate = true) => {
    if (!sidebarPanel || !sidebarBackdrop) return;
    sidebarPanel.classList.add("open");
    sidebarBackdrop.classList.add("show");
    sidebarToggleBtn?.setAttribute("aria-expanded", "true");
    if (!animate) {
      sidebarPanel.style.transition = "none";
      sidebarBackdrop.style.transition = "none";
      requestAnimationFrame(() => {
        sidebarPanel.style.transition = "";
        sidebarBackdrop.style.transition = "";
      });
    }
  };

  const closeSidebar = (animate = true) => {
    if (!sidebarPanel || !sidebarBackdrop) return;
    sidebarPanel.classList.remove("open");
    sidebarBackdrop.classList.remove("show");
    sidebarToggleBtn?.setAttribute("aria-expanded", "false");
    if (!animate) {
      sidebarPanel.style.transition = "none";
      sidebarBackdrop.style.transition = "none";
      requestAnimationFrame(() => {
        sidebarPanel.style.transition = "";
        sidebarBackdrop.style.transition = "";
      });
    }
  };

  const syncResponsiveLayout = () => {
    if (mobileSidebarQuery.matches) {
      closeSidebar(false);
    } else {
      openSidebar(false);
    }
  };

  const getFocusableElements = (root) => {
    if (!root) return [];
    return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
  };

  const openDialog = (modalEl, initialFocusEl = null) => {
    if (!modalEl) return;
    activeModalEl = modalEl;
    modalRestoreFocus = document.activeElement;
    modalEl.style.display = "flex";
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const focusTarget = initialFocusEl || getFocusableElements(modalEl)[0] || modalEl.querySelector(".modal-card");
    requestAnimationFrame(() => {
      focusTarget?.focus?.();
    });
  };

  const closeDialog = (modalEl) => {
    if (!modalEl) return;
    modalEl.style.display = "none";
    modalEl.setAttribute("aria-hidden", "true");
    if (activeModalEl === modalEl) {
      activeModalEl = null;
      document.body.classList.remove("modal-open");
      const restore = modalRestoreFocus;
      modalRestoreFocus = null;
      restore?.focus?.();
    }
  };

  const handleModalKeydown = (event) => {
    if (!activeModalEl) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (activeModalEl === confirmModal) {
        resolveConfirm(false);
      } else {
        closeDialog(activeModalEl);
      }
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = getFocusableElements(activeModalEl);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const createAttributeRow = (key = "", value = "") => {
    const row = document.createElement("div");
    row.className = "attribute-row";
    row.innerHTML = `
      <input type="text" class="form-control attribute-key" placeholder="Clave" value="${escapeHTML(key)}" aria-label="Clave del atributo">
      <input type="text" class="form-control attribute-value" placeholder="Valor" value="${escapeHTML(value)}" aria-label="Valor del atributo">
      <button type="button" class="btn btn-secondary attribute-remove-btn" aria-label="Eliminar atributo">✕</button>
    `;
    row.querySelector(".attribute-remove-btn").onclick = () => {
      row.remove();
      ensureAttributeEditorHasRow();
    };
    return row;
  };

  const ensureAttributeEditorHasRow = () => {
    if (!nodeAttributesEditor) return;
    if (nodeAttributesEditor.children.length === 0) {
      nodeAttributesEditor.appendChild(createAttributeRow());
    }
  };

  const setAttributeEditor = (attributes = {}) => {
    if (!nodeAttributesEditor) return;
    nodeAttributesEditor.innerHTML = "";
    const entries = Object.entries(attributes || {});
    if (entries.length === 0) {
      nodeAttributesEditor.appendChild(createAttributeRow());
      return;
    }
    entries.forEach(([key, value]) => nodeAttributesEditor.appendChild(createAttributeRow(key, value)));
  };

  const readAttributesFromEditor = () => {
    const attrs = {};
    if (!nodeAttributesEditor) return attrs;
    nodeAttributesEditor.querySelectorAll(".attribute-row").forEach(row => {
      const key = row.querySelector(".attribute-key")?.value.trim();
      const value = row.querySelector(".attribute-value")?.value.trim();
      if (!key) return;
      attrs[key] = value;
    });
    return attrs;
  };

  const getNodeSearchText = (node) => [
    node.nombre,
    node.contacto,
    node.organizacion,
    node.perfilUrl,
    node.descripcion,
    ...(Object.values(node.atributos || {}))
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const getNodeRelationsById = (nodeId) => relations.filter(r => r.origen === nodeId || r.destino === nodeId);

  const buildDeleteNodeMessage = (node) => {
    const relationCount = getNodeRelationsById(node.id).length;
    const relationLabel = relationCount === 1 ? "relaci�n" : "relaciones";
    return `�Est�s seguro de eliminar a <strong>${escapeHTML(node.nombre)}</strong>? Se mover� a la papelera junto con ${relationCount} ${relationLabel}. Podr�s restaurarla durante 7 d�as.`;
  };

  const getTrashExpirationText = (purgeAt) => {
    const date = new Date(purgeAt);
    if (Number.isNaN(date.getTime())) return "Sin vencimiento";
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
  };

  let searchSuggestionState = [];
  const renderSearchSuggestions = (query) => {
    if (!searchSuggestionsEl) return;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      searchSuggestionsEl.style.display = "none";
      searchSuggestionsEl.innerHTML = "";
      searchSuggestionState = [];
      return;
    }

    const matches = nodes
      .filter(n => n.nombre.toLowerCase().includes(trimmed))
      .slice(0, 6);
    searchSuggestionState = matches;

    if (matches.length === 0) {
      searchSuggestionsEl.innerHTML = `<div class="empty-state" style="padding:0.75rem;">Sin resultados.</div>`;
      searchSuggestionsEl.style.display = "block";
      return;
    }

    searchSuggestionsEl.innerHTML = matches.map((match, index) => {
      const attrs = [match.tipo, match.estado, match.organizacion, match.contacto].filter(Boolean).join(" · ");
      return `
        <button type="button" class="search-suggestion-item" data-index="${index}" data-id="${match.id}" role="option">
          <span class="search-suggestion-name">${escapeHTML(match.nombre)}</span>
          <span class="search-suggestion-meta">${escapeHTML(attrs)}</span>
        </button>
      `;
    }).join("");

    searchSuggestionsEl.style.display = "block";
    searchSuggestionsEl.querySelectorAll(".search-suggestion-item").forEach(btn => {
      btn.onclick = () => {
        const nodeId = btn.getAttribute("data-id");
        if (nodeId) {
          searchInput.value = nodes.find(n => n.id === nodeId)?.nombre || "";
          searchSuggestionsEl.style.display = "none";
          performSearch();
        }
      };
    });
  };

  const showConfirmDialog = ({ title, message, confirmLabel = "Confirmar", requireText = "", danger = true }) => {
    if (!confirmModal) return Promise.resolve(window.confirm(message));
    confirmState = { requireText, resolve: null };
    confirmModalTitleEl.textContent = title;
    confirmModalMessageEl.innerHTML = message;
    confirmModalInputGroup.style.display = requireText ? "block" : "none";
    confirmModalInput.value = "";
    btnAcceptConfirmModal.textContent = confirmLabel;
    btnAcceptConfirmModal.classList.toggle("btn-danger", danger);
    btnAcceptConfirmModal.classList.toggle("btn-secondary", !danger);
    openDialog(confirmModal, requireText ? confirmModalInput : btnAcceptConfirmModal);
    if (requireText) confirmModalInput.focus();
    return new Promise(resolve => {
      confirmState.resolve = resolve;
    });
  };

  const resolveConfirm = (result) => {
    if (!confirmState?.resolve) return;
    const required = confirmState.requireText;
    if (result && required) {
      const typed = confirmModalInput.value.trim();
      if (typed !== required) {
        showToast(`Debes escribir "${required}" para continuar`, true);
        confirmModalInput.focus();
        return;
      }
    }
    const resolve = confirmState.resolve;
    confirmState = null;
    closeDialog(confirmModal);
    resolve(result);
  };

  // --- App State ---
  let nodes = [];
  let relations = [];
  let deletedNodes = [];
  let influenceIndexes = {};
  let communityMap = {};
  
  // Vis.js instances
  let network = null;
  let visNodes = new vis.DataSet([]);
  let visEdges = new vis.DataSet([]);
  let selectedNodeId = null;
  let physicsEnabled = true;

  // Active highlights state
  let activeHighlightNodes = null;
  let activeHighlightEdges = null;

  // DOM Elements
  const statNodesEl = document.getElementById("stat-nodes");
  const statRelationsEl = document.getElementById("stat-relations");
  const statAvgInfluenceEl = document.getElementById("stat-avg-influence");
  const statCommunitiesEl = document.getElementById("stat-communities");
  
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  
  const ctrlZoomIn = document.getElementById("ctrl-zoom-in");
  const ctrlZoomOut = document.getElementById("ctrl-zoom-out");
  const ctrlFit = document.getElementById("ctrl-fit");
  const ctrlPhysics = document.getElementById("ctrl-physics");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  const selectedNodeContainer = document.getElementById("selected-node-container");
  const quickRelationSection = document.getElementById("quick-relation-section");
  const quickRelationForm = document.getElementById("quick-relation-form");
  const relOrigName = document.getElementById("rel-orig-name");
  const relOrigId = document.getElementById("rel-orig-id");
  const relDestSelect = document.getElementById("rel-dest-select");

  const pathStartSelect = document.getElementById("path-start");
  const pathEndSelect = document.getElementById("path-end");
  const btnFindPath = document.getElementById("btn-find-path");
  const pathfinderResultsBox = document.getElementById("pathfinder-results-box");
  const pathStepsEl = document.getElementById("path-steps");

  const communitiesListEl = document.getElementById("communities-list");
  const recommendationsEl = document.getElementById("recommendations-container");
  
  const allEntitiesListEl = document.getElementById("all-entities-list");
  const deletedNodesListEl = document.getElementById("deleted-nodes-list");
  const trashElementsTitle = document.getElementById("trash-elements-title");
  const dataElementsTitle = document.getElementById("data-elements-title");

  const btnExport = document.getElementById("btn-export");
  const btnImportTrigger = document.getElementById("btn-import-trigger");
  const btnImport = document.getElementById("btn-import");
  const btnReset = document.getElementById("btn-reset");
  const btnClearAll = document.getElementById("btn-clear-all");
  const btnAddNode = document.getElementById("btn-add-node");

  // Modal Node Elements
  const nodeModal = document.getElementById("node-modal");
  const btnCloseNodeModal = document.getElementById("btn-close-node-modal");
  const btnCancelNodeModal = document.getElementById("btn-cancel-node-modal");
  const btnSaveNode = document.getElementById("btn-save-node");
  const nodeForm = document.getElementById("node-form");
  const editNodeId = document.getElementById("edit-node-id");
  const nodeNameInput = document.getElementById("node-name");
  const nodeTypeSelect = document.getElementById("node-type");
  const nodeStatusSelect = document.getElementById("node-status");
  const nodeDescInput = document.getElementById("node-desc");
  const nodeCreationDateInput = document.getElementById("node-creation-date");
  const nodeContactInput = document.getElementById("node-contact");
  const nodeOrganizationInput = document.getElementById("node-organization");
  const nodeProfileUrlInput = document.getElementById("node-profile-url");

  // Toast
  const toastBanner = document.getElementById("toast-banner");
  const toastText = document.getElementById("toast-text");

  // --- Load Data & Compute Intelligence ---
  function init() {
    const data = window.SIRDatabase.load();
    nodes = data.nodes;
    deletedNodes = data.deletedNodes || [];
    relations = data.relations;

    // Set dates default value to current date
    const today = getTodayDateValue();
    nodeCreationDateInput.value = today;
    document.getElementById("rel-date").value = today;

    computeSystemState();
    setupGraph();
    updateUI();
    syncResponsiveLayout();
  }

  function computeSystemState() {
    // 1. Calculate Influence Indexes
    influenceIndexes = window.SIRAlgorithms.calculateInfluenceIndexes(nodes, relations);
    
    // 2. Discover Communities
    communityMap = window.SIRAlgorithms.detectCommunitiesLPA(nodes, relations);
  }

  // --- Vis.js Graph Config ---
  function setupGraph() {
    const container = document.getElementById("network-canvas");
    
    visNodes = new vis.DataSet([]);
    visEdges = new vis.DataSet([]);
    
    updateVisDatasets();

    const data = { nodes: visNodes, edges: visEdges };
    
    const options = {
      physics: {
        enabled: physicsEnabled,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -70,
          centralGravity: 0.015,
          springLength: 120,
          springConstant: 0.08,
          damping: 0.4
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25
        }
      },
      nodes: {
        shape: "dot",
        font: {
          color: "#f3f4f6",
          size: 14,
          face: "Inter",
          strokeWidth: 2,
          strokeColor: "#0b0f19"
        },
        borderWidth: 3,
        shadow: {
          enabled: true,
          color: "rgba(0,0,0,0.6)",
          size: 6,
          x: 2,
          y: 2
        }
      },
      edges: {
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        },
        font: {
          color: "#9ca3af",
          size: 10,
          face: "Inter",
          strokeWidth: 2,
          strokeColor: "#0b0f19",
          align: "middle"
        },
        smooth: {
          enabled: true,
          type: "cubicBezier",
          roundness: 0.4
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        selectable: true,
        selectConnectedEdges: false
      }
    };

    network = new vis.Network(container, data, options);

    // Click events
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        selectNode(params.nodes[0]);
      } else {
        clearNodeSelection();
      }
    });

    // Hover effect
    network.on("hoverNode", () => {
      document.body.style.cursor = "pointer";
    });
    network.on("blurNode", () => {
      document.body.style.cursor = "default";
    });
  }

  // Sync state data to Vis DataSet with optional filtering highlights
  function updateVisDatasets(highlightNodeIds = null, highlightEdgeIds = null) {
    const nodesArray = [];
    const edgesArray = [];

    // Helper for Node Border Colors representing entity types
    const getTypeColor = (type) => {
      switch (type) {
        case "Persona": return "#10B981"; // Teal
        case "Empresa": return "#8B5CF6"; // Purple
        case "Asociación": return "#3B82F6"; // Blue
        case "Evento": return "#F59E0B"; // Yellow/Orange
        case "Proyecto": return "#F97316"; // Orange
        case "Propiedad": return "#EC4899"; // Pink
        case "Universidad": return "#06B6D4"; // Cyan
        default: return "#6B7280";
      }
    };

    nodes.forEach(n => {
      const stats = influenceIndexes[n.id] || { index: 0, levelInfo: { color: "#6B7280", name: "Nuevo" } };
      const isSelected = selectedNodeId === n.id;
      const isHighlighted = !highlightNodeIds || highlightNodeIds.has(n.id);
      
      // Calculate dynamic size representing Influence Index
      const size = 12 + Math.sqrt(stats.index) * 1.3;

      // Halo representation based on activity recency
      // Find node's relations to get most recent activity
      const nodeRelations = relations.filter(r => r.estado === "Activo" && (r.origen === n.id || r.destino === n.id));
      let recencyMonths = 999;
      if (nodeRelations.length > 0) {
        const dates = nodeRelations.map(r => new Date(r.ultimaInteraccion));
        const newest = new Date(Math.max(...dates));
        recencyMonths = (new Date() - newest) / (1000 * 60 * 60 * 24 * 30.44);
      }

      // Halos are active if node had interactions within the last 3 months
      const hasRecentActivity = recencyMonths <= 3;
      const haloGlow = hasRecentActivity ? {
        enabled: true,
        color: stats.levelInfo.color,
        size: 15 + (isSelected ? 8 : 0),
        x: 0,
        y: 0
      } : {
        enabled: isSelected,
        color: "#ffffff",
        size: 10,
        x: 0,
        y: 0
      };

      // Fading values when a subset is highlighted
      let bgColor = stats.levelInfo.color;
      let borderColor = getTypeColor(n.tipo);
      let fontColor = "#f3f4f6";

      if (!isHighlighted) {
        bgColor = "rgba(43, 56, 82, 0.15)";
        borderColor = "rgba(75, 85, 99, 0.15)";
        fontColor = "rgba(156, 163, 175, 0.25)";
      }      // Create rich HTML Tooltip content as a real DOM element so vis-network renders it correctly
      const tooltipEl = document.createElement("div");
      tooltipEl.style.background = "#151b2c";
      tooltipEl.style.border = "1px solid rgba(255,255,255,0.15)";
      tooltipEl.style.borderRadius = "6px";
      tooltipEl.style.padding = "8px";
      tooltipEl.style.fontFamily = "Inter,sans-serif";
      tooltipEl.style.color = "#f3f4f6";
      tooltipEl.innerHTML = `
        <strong style="font-size:14px; display:block; margin-bottom:4px; color:#ffffff;">${escapeHTML(n.nombre)}</strong>
        <span style="font-size:10px; padding:2px 6px; border-radius:3px; background:${borderColor}22; color:${borderColor}; font-weight:700; border:1px solid ${borderColor}55; margin-right:4px;">${escapeHTML(n.tipo)}</span>
        <span style="font-size:10px; padding:2px 6px; border-radius:3px; background:${stats.levelInfo.color}22; color:${stats.levelInfo.color}; font-weight:700; border:1px solid ${stats.levelInfo.color}55;">${escapeHTML(stats.levelInfo.name)}</span>
        <div style="margin-top:6px; font-size:11px;">
          <strong>M�tricas:</strong>
          <div style="margin-top:2px;">�ndice de Influencia: <b style="color:${stats.levelInfo.color}">${stats.index}</b></div>
          <div>Comunidad: <b>${escapeHTML(communityMap[n.id] || "Sin Grupo")}</b></div>
          <div style="color:#9ca3af; margin-top:4px; font-style:italic;">${escapeHTML(n.descripcion || "Sin descripci�n.")}</div>
        </div>
      `;

      nodesArray.push({
        id: n.id,
        label: n.nombre,
        title: tooltipEl,
        size: size,
        color: {
          background: bgColor,
          border: borderColor,
          highlight: {
            background: stats.levelInfo.color,
            border: "#ffffff"
          }
        },
        font: {
          color: fontColor
        },
        shadow: haloGlow,
        borderWidth: isSelected ? 5 : 3
      });
    });

    relations.forEach(r => {
      const isOrigNode = nodes.some(n => n.id === r.origen);
      const isDestNode = nodes.some(n => n.id === r.destino);
      if (!isOrigNode || !isDestNode) return;

      const isEdgeHighlighted = !highlightEdgeIds || highlightEdgeIds.has(r.id);
      const decay = window.SIRAlgorithms.calculateDecayFactor(r.ultimaInteraccion);
      const activeWeight = r.pesoInicial * decay;
      
      // Edge thickness represents active weight
      const width = 1 + (activeWeight / 20) * 4.5;
      
      // Color fading represents decay
      let colorVal = `rgba(156, 163, 175, ${0.15 + decay * 0.45})`;
      let label = r.tipo;

      if (!isEdgeHighlighted) {
        colorVal = "rgba(255, 255, 255, 0.04)";
        label = "";
      } else if (highlightEdgeIds) {
        // Spotlight highlighting
        colorVal = "#8B5CF6";
      }

      edgesArray.push({
        id: r.id,
        from: r.origen,
        to: r.destino,
        label: label,
        width: width,
        color: {
          color: colorVal,
          highlight: "#8B5CF6"
        }
      });
    });

    visNodes.clear();
    visNodes.add(nodesArray);
    visEdges.clear();
    visEdges.add(edgesArray);
  }

  // --- UI Renderer Updates ---
  function updateUI() {
    // 1. Stats Counter values
    statNodesEl.textContent = nodes.length;
    statRelationsEl.textContent = relations.filter(r => r.estado === "Activo").length;
    
    const sumInfluence = Object.values(influenceIndexes).reduce((acc, stats) => acc + stats.index, 0);
    const avgInfluence = nodes.length > 0 ? Math.round(sumInfluence / nodes.length) : 0;
    statAvgInfluenceEl.textContent = avgInfluence;

    const uniqueCommunities = new Set(Object.values(communityMap));
    statCommunitiesEl.textContent = uniqueCommunities.size;
    renderDeletedNodes();

    // 2. Refresh lists and selects
    populateDropdowns();
    renderCommunitiesList();
    renderRecommendations();
    renderDataTab();
  }

  function populateDropdowns() {
    // Show inactive nodes too, but mark them unavailable instead of hiding them.
    const sortedNodes = [...nodes].sort((a,b) => a.nombre.localeCompare(b.nombre));
    
    // Clear and fill selects
    pathStartSelect.innerHTML = "";
    pathEndSelect.innerHTML = "";
    relDestSelect.innerHTML = '<option value="" disabled selected>-- Selecciona Entidad --</option>';

    sortedNodes.forEach(p => {
      const label = p.estado === "Activo" ? p.nombre : `${p.nombre} (Inactivo)`;
      const option1 = new Option(label, p.id);
      const option2 = new Option(label, p.id);
      const option3 = new Option(label, p.id);
      const inactive = p.estado !== "Activo";

      option1.disabled = inactive;
      option2.disabled = inactive;
      option3.disabled = inactive;
      
      pathStartSelect.add(option1);
      pathEndSelect.add(option2);
      
      // Quick relations select (excluding currently selected node)
      if (p.id !== selectedNodeId) {
        relDestSelect.add(option3);
      }
    });
  }

  function renderCommunitiesList() {
    communitiesListEl.innerHTML = "";
    
    // Aggregate community members
    const commGroups = {};
    nodes.forEach(n => {
      const commName = communityMap[n.id] || "Sin Grupo";
      if (!commGroups[commName]) commGroups[commName] = [];
      commGroups[commName].push(n);
    });

    const activeRelations = relations.filter(r => r.estado === "Activo");
    if (nodes.length === 0) {
      communitiesListEl.innerHTML = '<div class="empty-state">No hay nodos en el sistema.</div>';
      return;
    }

    if (activeRelations.length === 0) {
      communitiesListEl.innerHTML = '<div class="empty-state">No hay relaciones activas suficientes para clasificar comunidades.</div>';
      return;
    }

    const groupsArray = Object.keys(commGroups).sort();

    groupsArray.forEach(groupName => {
      const members = commGroups[groupName];
      // Sort members by influence index descending
      members.sort((a, b) => {
        const idxA = (influenceIndexes[a.id] || { index: 0 }).index;
        const idxB = (influenceIndexes[b.id] || { index: 0 }).index;
        return idxB - idxA;
      });

      const item = document.createElement("div");
      item.className = "intel-item";
      
      // Click community to highlight its members
      item.onclick = () => {
        const memberIds = new Set(members.map(m => m.id));
        const memberRelationIds = new Set();
        relations.forEach(r => {
          if (r.estado === "Activo" && memberIds.has(r.origen) && memberIds.has(r.destino)) {
            memberRelationIds.add(r.id);
          }
        });
        
        updateVisDatasets(memberIds, memberRelationIds);
        showToast(`Resaltando a la '${groupName}' (${members.length} nodos)`);
      };

      const topMemberName = members[0] ? members[0].nombre : "Ninguno";

      item.innerHTML = `
        <div class="intel-item-header">
          <span>${escapeHTML(groupName)}</span>
          <span class="badge badge-default">${members.length} miembros</span>
        </div>
        <div class="intel-item-body">
          Hub principal: <b>${escapeHTML(topMemberName)}</b><br>
          Miembros: <span style="font-size: 11px;">${members.map(m => escapeHTML(m.nombre)).join(", ")}</span>
        </div>
      `;

      communitiesListEl.appendChild(item);
    });
  }

  function renderRecommendations() {
    recommendationsEl.innerHTML = "";

    // 1. Alliances Discovery (Hop 2 paths where no direct link exists)
    const alliances = [];
    const adj = {};
    nodes.forEach(n => { adj[n.id] = new Set(); });
    relations.filter(r => r.estado === "Activo").forEach(r => {
      adj[r.origen].add(r.destino);
      adj[r.destino].add(r.origen);
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const u = nodes[i].id;
        const v = nodes[j].id;
        if (adj[u].has(v)) continue; // Direct link exists
        
        // Find mutual neighbors
        const mutual = [...adj[u]].filter(nId => adj[v].has(nId));
        if (mutual.length >= 2) {
          alliances.push({
            nodeA: nodes[i],
            nodeB: nodes[j],
            mutualNames: mutual.map(id => nodes.find(n => n.id === id).nombre),
            count: mutual.length
          });
        }
      }
    }

    alliances.sort((a, b) => b.count - a.count);

    if (alliances.length > 0) {
      const box = document.createElement("div");
      box.className = "recommendations-box";
      box.innerHTML = `
        <div class="recommendations-title">🔮 Alianzas Estratégicas Recomendadas</div>
        <p style="margin-bottom:0.5rem;">Parejas de entidades no conectadas que comparten múltiples intermediarios:</p>
      `;
      alliances.slice(0, 3).forEach(a => {
        const div = document.createElement("div");
        div.style.marginBottom = "0.4rem";
        div.innerHTML = `
          • <b>${escapeHTML(a.nodeA.nombre)}</b> y <b>${escapeHTML(a.nodeB.nombre)}</b> tienen ${a.count} contactos en común (<i>${a.mutualNames.map(escapeHTML).join(", ")}</i>).
        `;
        box.appendChild(div);
      });
      recommendationsEl.appendChild(box);
    }

    // 2. Risk Bottlenecks (degree > 5 or betweenness in top 15%)
    const sortedBetweenness = Object.entries(influenceIndexes)
      .map(([id, s]) => ({ id, score: s.breakdown.centrality, name: nodes.find(n => n.id === id)?.nombre }))
      .sort((a, b) => b.score - a.score);

    const highRiskNodes = sortedBetweenness.filter(x => x.score > 600); // 600 points normalized

    if (highRiskNodes.length > 0) {
      const box = document.createElement("div");
      box.className = "recommendations-box";
      box.style.background = "rgba(239, 68, 68, 0.05)";
      box.style.borderColor = "rgba(239, 68, 68, 0.25)";
      box.innerHTML = `
        <div class="recommendations-title" style="color:var(--accent-red);">⚠️ Puntos Críticos de Riesgo (Concentración)</div>
        <p style="margin-bottom:0.5rem;">Nodos que concentran flujos claves de comunicación. Su salida afectará drásticamente la red:</p>
      `;
      highRiskNodes.slice(0, 2).forEach(hr => {
        const div = document.createElement("div");
        div.innerHTML = `
          • <b>${escapeHTML(hr.name)}</b> posee un índice crítico de centralidad (${hr.score}/1000). Considera expandir enlaces periféricos.
        `;
        box.appendChild(div);
      });
      recommendationsEl.appendChild(box);
    }
  }

  function renderDataTab() {
    allEntitiesListEl.innerHTML = "";
    dataElementsTitle.textContent = `Entidades en Sistema (${nodes.length})`;

    if (nodes.length === 0) {
      allEntitiesListEl.innerHTML = '<div class="empty-state">No hay nodos en el sistema.</div>';
      return;
    }

    // Sort nodes alphabetically
    const sorted = [...nodes].sort((a,b) => a.nombre.localeCompare(b.nombre));

    sorted.forEach(n => {
      const div = document.createElement("div");
      div.className = "all-elements-item";
      
      const badgeClass = `badge ${getTypeBadgeClass(n.tipo)}`;
      
      div.innerHTML = `
        <span class="all-elements-item-name">${escapeHTML(n.nombre)}</span>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="${badgeClass}">${escapeHTML(n.tipo)}</span>
          <button class="overlay-btn" style="padding:0.2rem 0.4rem; font-size:0.7rem; color:var(--accent-red);" title="Eliminar" data-id="${n.id}">🗑️</button>
        </div>
      `;

      // Click name to highlight and focus
      div.querySelector(".all-elements-item-name").onclick = () => {
        selectNode(n.id);
        if (network) {
          network.focus(n.id, { scale: 1.1, animation: { duration: 500 } });
        }
      };

      // Click delete button
      div.querySelector("button").onclick = (e) => {
        e.stopPropagation();
        if (confirm(`¿Estás seguro de eliminar a ${n.nombre}? Se borrarán también todas sus relaciones.`)) {
          deleteNode(n.id);
        }
      };

      allEntitiesListEl.appendChild(div);
    });
  }

  // --- Search ---
  function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    renderSearchSuggestions(query);
    if (!query) {
      showToast("Escribe un nombre para buscar", true);
      return;
    }

    const match = nodes.find(n => n.nombre.toLowerCase().includes(query));
    if (match) {
      if (searchSuggestionsEl) searchSuggestionsEl.style.display = "none";
      selectNode(match.id);
      network.focus(match.id, {
        scale: 1.25,
        animation: { duration: 600, easingFunction: "easeInOutQuad" }
      });
      showToast(`Localizado: ${match.nombre}`);
    } else {
      showToast("No se encontró ningún nodo coincidente", true);
    }
  }

  // --- Node Selection Details Pane ---
  function selectNode(nodeId) {
    selectedNodeId = nodeId;
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;

    const stats = influenceIndexes[nodeId] || { index: 0, levelInfo: { name: "Nodo Nuevo", color: "#6B7280" }, breakdown: {} };

    // Format creation date
    const cDate = new Date(n.fechaCreacion).toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });

    // Active relations of this node
    const activeRels = relations.filter(r => r.estado === "Activo" && (r.origen === nodeId || r.destino === nodeId));

    let relationsHtml = "";
    if (activeRels.length === 0) {
      relationsHtml = `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Sin conexiones activas</div>`;
    } else {
      relationsHtml = '<div style="display:flex; flex-direction:column; gap:0.25rem;">';
      activeRels.forEach(r => {
        const isOrig = r.origen === nodeId;
        const targetId = isOrig ? r.destino : r.origen;
        const targetNode = nodes.find(x => x.id === targetId);
        if (!targetNode) return;

        const decay = window.SIRAlgorithms.calculateDecayFactor(r.ultimaInteraccion);
        const currentWeight = Math.round(r.pesoInicial * decay);

        relationsHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:3px; font-size:11px;">
            <span>
              ${isOrig ? "➡️ Conecta a" : "⬅️ Conectado por"} 
              <a href="#" class="node-link" data-id="${targetId}" style="color:var(--accent-primary); text-decoration:none; font-weight:600;">${escapeHTML(targetNode.nombre)}</a> 
              (${escapeHTML(r.tipo)})
            </span>
            <div style="display:flex; gap:0.25rem; align-items:center;">
              <span class="badge badge-default" title="Peso Activo / Inicial" style="font-size:9px;">W: ${currentWeight}/${r.pesoInicial}</span>
              <button class="overlay-btn btn-delete-rel" data-id="${r.id}" style="padding:0.1rem 0.2rem; font-size:8px; color:var(--accent-red);" title="Eliminar Relación">🗑️</button>
            </div>
          </div>
        `;
      });
      relationsHtml += "</div>";
    }

    // Populate attributes list
    let attribsHtml = "";
    if (n.atributos && Object.keys(n.atributos).length > 0) {
      for (const [k, v] of Object.entries(n.atributos)) {
        attribsHtml += `
          <div class="attrib-row">
            <span class="attrib-key">${escapeHTML(k)}:</span>
            <span class="attrib-val">${escapeHTML(v)}</span>
          </div>
        `;
      }
    } else {
      attribsHtml = '<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Sin atributos adicionales.</div>';
    }

    const badgeClass = `badge ${getTypeBadgeClass(n.tipo)}`;

    // Render HTML in Sidebar Tab 1
    selectedNodeContainer.innerHTML = `
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <h3 class="detail-title">${escapeHTML(n.nombre)}</h3>
            <span class="${badgeClass}">${escapeHTML(n.tipo)}</span>
            <span class="badge level-pill ${stats.levelInfo.class}" style="border:1px solid ${stats.levelInfo.color}44;">Nivel ${stats.levelInfo.level}</span>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-default" style="display:block; margin-bottom:4px;">${escapeHTML(n.estado)}</span>
          </div>
        </div>

        <p class="detail-desc">${n.descripcion ? escapeHTML(n.descripcion) : "<i>Sin descripción.</i>"}</p>

        <!-- Influence Index Meter -->
        <div class="influence-meter-container">
          <div class="influence-meter-label">
            <span style="font-weight:600; color:#fff;">Índice de Influencia</span>
            <strong style="color:${stats.levelInfo.color}">${stats.index} / 1000 (${stats.levelInfo.name})</strong>
          </div>
          <div class="influence-bar-bg">
            <div class="influence-bar-fill" style="width: ${stats.index / 10}%; background: linear-gradient(to right, var(--accent-primary), ${stats.levelInfo.color});"></div>
          </div>
        </div>

        <details class="detail-accordion" open>
          <summary class="influence-breakdown-title">Desglose de factores</summary>
          <div class="influence-breakdown detail-block">
            <div class="breakdown-item"><span class="breakdown-label">Enlaces (25%):</span> <span class="breakdown-val">${stats.breakdown.degree}</span></div>
            <div class="breakdown-item"><span class="breakdown-label">Diversidad (20%):</span> <span class="breakdown-val">${stats.breakdown.diversity}</span></div>
            <div class="breakdown-item"><span class="breakdown-label">Calidad (15%):</span> <span class="breakdown-val">${stats.breakdown.quality}</span></div>
            <div class="breakdown-item"><span class="breakdown-label">Vecindario (15%):</span> <span class="breakdown-val">${stats.breakdown.neighbors}</span></div>
            <div class="breakdown-item"><span class="breakdown-label">Antigüedad (10%):</span> <span class="breakdown-val">${stats.breakdown.age}</span></div>
            <div class="breakdown-item"><span class="breakdown-label">Actividad (10%):</span> <span class="breakdown-val">${stats.breakdown.activity}</span></div>
            <div class="breakdown-item" style="grid-column: span 2;"><span class="breakdown-label">Centralidad (5%):</span> <span class="breakdown-val">${stats.breakdown.centrality}</span></div>
          </div>
        </details>

        <details class="detail-accordion">
          <summary class="influence-breakdown-title">Atributos de entidad</summary>
          <div class="attribs-list detail-block" style="margin-bottom: 1rem;">
            ${attribsHtml}
            <div class="attrib-row" style="margin-top: 0.4rem; border-top:1px dashed rgba(255,255,255,0.05); padding-top:0.3rem;">
              <span class="attrib-key">Creado:</span>
              <span class="attrib-val" style="font-size:0.75rem;">${cDate}</span>
            </div>
          </div>
        </details>

        <details class="detail-accordion">
          <summary class="influence-breakdown-title">Conexiones en red</summary>
          <div class="detail-block" style="margin-bottom:1rem;">
            ${relationsHtml}
          </div>
        </details>

        <!-- Node Actions -->
        <div style="display:flex; gap:0.5rem; border-top: 1px solid var(--border-color); padding-top:0.75rem;">
          <button class="btn btn-secondary" id="btn-edit-selected" style="flex: 1; font-size:0.75rem;">✏️ Editar</button>
          <button class="btn btn-danger" id="btn-delete-selected" style="flex: 1; font-size:0.75rem;">🗑️ Eliminar</button>
        </div>
      </div>
    `;

    // Connect node selection interactions
    document.getElementById("btn-edit-selected").onclick = () => openNodeModal(n.id);
    document.getElementById("btn-delete-selected").onclick = () => {
      if (confirm(`¿Estás seguro de eliminar a ${n.nombre}? Se borrarán también todas sus relaciones.`)) {
        deleteNode(n.id);
        clearNodeSelection();
      }
    };

    // Edge deletion inside details pane
    selectedNodeContainer.querySelectorAll(".btn-delete-rel").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const relId = btn.getAttribute("data-id");
        if (confirm("¿Seguro de eliminar esta relación?")) {
          deleteRelation(relId);
          selectNode(selectedNodeId); // Refresh details pane
        }
      };
    });

    // Links inside details pane
    selectedNodeContainer.querySelectorAll(".node-link").forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("data-id");
        selectNode(targetId);
        if (network) {
          network.selectNodes([targetId]);
          network.focus(targetId, { scale: 1.1, animation: { duration: 400 } });
        }
      };
    });

    // Setup Quick Relation Form
    quickRelationSection.style.display = "block";
    relOrigName.value = n.nombre;
    relOrigId.value = n.id;
    populateDropdowns(); // Re-populate destination options

    // Highlight the selected node visually in the graph
    if (network) {
      network.selectNodes([nodeId]);
    }
    updateVisDatasets();
  }

  function clearNodeSelection() {
    selectedNodeId = null;
    selectedNodeContainer.innerHTML = `
      <div class="empty-state">
        Haz clic en cualquier nodo de la red para visualizar sus métricas, relaciones y atributos detallados.
      </div>
    `;
    quickRelationSection.style.display = "none";
    
    // Clear path highlights
    activeHighlightNodes = null;
    activeHighlightEdges = null;

    if (network) {
      network.unselectNodes();
    }
    updateVisDatasets();
  }

  // --- CRUD Operations ---
  
  // Save Node (Insert or Update)
  nodeForm.onsubmit = (e) => {
    e.preventDefault();
  };

  btnSaveNode.onclick = async () => {
    const id = editNodeId.value;
    const nombre = nodeNameInput.value.trim();
    const tipo = nodeTypeSelect.value;
    const estado = nodeStatusSelect.value;
    const descripcion = nodeDescInput.value.trim();
    const creationDate = nodeCreationDateInput.value;
    const atributos = readAttributesFromEditor();

    if (!nombre) {
      showToast("Ingresa un nombre para la entidad", true);
      return;
    }

    setBusyState(true, id ? "Actualizando nodo..." : "Guardando nodo...");
    await nextFrame();

    try {
      if (id) {
        // Update
        const nIdx = nodes.findIndex(x => x.id === id);
        if (nIdx !== -1) {
          nodes[nIdx] = {
            ...nodes[nIdx],
            nombre,
            tipo,
            estado,
            descripcion,
            atributos,
            fechaCreacion: new Date(creationDate).toISOString()
          };
          showToast(`Nodo '${nombre}' actualizado`);
        }
      } else {
        // Insert
        const newId = createEntityId("node");
        nodes.push({
          id: newId,
          nombre,
          tipo,
          estado,
          descripcion,
          atributos,
          fechaCreacion: new Date(creationDate).toISOString()
        });
        showToast(`Nodo '${nombre}' creado`);
      }

      window.SIRDatabase.save(nodes, relations);
      computeSystemState();
      updateVisDatasets();
      updateUI();
      closeNodeModal();

      if (id && selectedNodeId === id) {
        selectNode(id);
      }
    } finally {
      setBusyState(false);
    }
  };

  function deleteNode(nodeId) {
    const nodeName = nodes.find(n => n.id === nodeId)?.nombre || "Nodo";
    nodes = nodes.filter(n => n.id !== nodeId);
    // Delete relations touching node
    relations = relations.filter(r => r.origen !== nodeId && r.destino !== nodeId);
    
    window.SIRDatabase.save(nodes, relations);
    computeSystemState();
    updateVisDatasets();
    updateUI();
    showToast(`Nodo '${nodeName}' y sus relaciones eliminados`);
  }

  // Quick Relationship Submit Form
  quickRelationForm.onsubmit = async (e) => {
    e.preventDefault();
    const origId = relOrigId.value;
    const destId = relDestSelect.value;
    const type = document.getElementById("rel-type").value;
    const weight = parseInt(document.getElementById("rel-weight").value);
    const confidence = parseInt(document.getElementById("rel-confidence").value);
    const date = document.getElementById("rel-date").value;
    const notes = document.getElementById("rel-notes").value.trim();

    if (!destId) {
      showToast("Selecciona un nodo destino", true);
      return;
    }

    const destNode = nodes.find(n => n.id === destId);
    if (destNode && destNode.estado !== "Activo") {
      showToast("La entidad destino está inactiva y no puede usarse para crear relaciones", true);
      return;
    }

    // Check if relation already exists in any direction
    const duplicate = relations.find(r => {
      if (r.estado !== "Activo" || r.tipo !== type) return false;
      return (r.origen === origId && r.destino === destId) || (r.origen === destId && r.destino === origId);
    });
    if (duplicate) {
      showToast("Ya existe esta relación idéntica activa", true);
      return;
    }

    const newRel = {
      id: createEntityId("rel"),
      origen: origId,
      destino: destId,
      tipo: type,
      pesoInicial: weight,
      confianza: confidence,
      estado: "Activo",
      observaciones: notes,
      ultimaInteraccion: new Date(date).toISOString()
    };

    setBusyState(true, "Creando relación...");
    await nextFrame();

    try {
      relations.push(newRel);
      window.SIRDatabase.save(nodes, relations);
      computeSystemState();
      updateVisDatasets();
      updateUI();
      selectNode(origId); // Refresh selected node details
      showToast("Relación creada con éxito");

      // Reset form fields except notes/types
      relDestSelect.selectedIndex = 0;
      document.getElementById("rel-notes").value = "";
    } finally {
      setBusyState(false);
    }
  };

  function deleteRelation(relId) {
    relations = relations.filter(r => r.id !== relId);
    window.SIRDatabase.save(nodes, relations);
    computeSystemState();
    updateVisDatasets();
    updateUI();
    showToast("Relación eliminada");
  }

  // --- Intelligence Tab pathfinding & Queries ---

  // Pathfinder trigger
  btnFindPath.onclick = () => {
    const startId = pathStartSelect.value;
    const endId = pathEndSelect.value;

    if (!startId || !endId) {
      showToast("Selecciona dos nodos para trazar la ruta", true);
      return;
    }

    if (startId === endId) {
      showToast("El origen y destino deben ser diferentes", true);
      return;
    }

    const path = window.SIRAlgorithms.findShortestRoute(nodes, relations, startId, endId);
    if (!path) {
      pathfinderResultsBox.style.display = "block";
      pathStepsEl.innerHTML = '<div style="font-size:0.75rem; color:var(--accent-red); font-style:italic;">No existe ninguna trayectoria de conexión directa o indirecta entre estos nodos.</div>';
      activeHighlightNodes = null;
      activeHighlightEdges = null;
      updateVisDatasets();
      return;
    }

    // Route trace details
    pathfinderResultsBox.style.display = "block";
    pathStepsEl.innerHTML = "";

    // Nodes and edges list in path
    const pathNodeIds = new Set(path);
    const pathEdgeIds = new Set();

    // Map path steps
    for (let i = 0; i < path.length; i++) {
      const nodeId = path[i];
      const node = nodes.find(n => n.id === nodeId);
      
      const stepDiv = document.createElement("div");
      stepDiv.className = "path-node";
      stepDiv.textContent = node.nombre;
      stepDiv.onclick = () => {
        selectNode(nodeId);
        network.focus(nodeId, { scale: 1.2, animation: { duration: 400 } });
      };

      pathStepsEl.appendChild(stepDiv);

      if (i < path.length - 1) {
        const nextId = path[i+1];
        // Find relation that connects path[i] -> path[i+1]
        const rel = relations.find(r => 
          r.estado === "Activo" && 
          ((r.origen === nodeId && r.destino === nextId) || (r.origen === nextId && r.destino === nodeId))
        );
        
        if (rel) {
          pathEdgeIds.add(rel.id);
          const connDiv = document.createElement("div");
          connDiv.className = "path-connector";
          connDiv.textContent = rel.tipo;
          pathStepsEl.appendChild(connDiv);
        }
      }
    }

    // Set highlights on the graph
    activeHighlightNodes = pathNodeIds;
    activeHighlightEdges = pathEdgeIds;
    updateVisDatasets(pathNodeIds, pathEdgeIds);
    showToast("Camino óptimo calculado y resaltado");
  };

  // --- Modals controls ---
  function openNodeModal(nodeIdToEdit = null) {
    nodeForm.reset();
    setAttributeEditor();
    
    const today = getTodayDateValue();
    nodeCreationDateInput.value = today;

    if (nodeIdToEdit) {
      const n = nodes.find(x => x.id === nodeIdToEdit);
      if (n) {
        editNodeId.value = n.id;
        nodeNameInput.value = n.nombre;
        nodeTypeSelect.value = n.tipo;
        nodeStatusSelect.value = n.estado;
        nodeDescInput.value = n.descripcion || "";
        nodeCreationDateInput.value = toDateInputValue(n.fechaCreacion);
        setAttributeEditor(n.atributos || {});
        document.getElementById("node-modal-title").textContent = "Editar Entidad";
      }
    } else {
      editNodeId.value = "";
      document.getElementById("node-modal-title").textContent = "Crear Nuevo Nodo";
    }
    
    openDialog(nodeModal, nodeNameInput);
  }

  function closeNodeModal() {
    closeDialog(nodeModal);
  }

  // --- Graph Controls overlay logic ---
  ctrlZoomIn.onclick = () => {
    if (network) {
      const scale = network.getScale();
      network.moveTo({ scale: scale * 1.25 });
    }
  };

  ctrlZoomOut.onclick = () => {
    if (network) {
      const scale = network.getScale();
      network.moveTo({ scale: scale * 0.8 });
    }
  };

  ctrlFit.onclick = () => {
    if (network) {
      network.fit({ animation: { duration: 500 } });
    }
  };

  ctrlPhysics.onclick = () => {
    physicsEnabled = !physicsEnabled;
    if (network) {
      network.setOptions({ physics: { enabled: physicsEnabled } });
    }
    ctrlPhysics.textContent = physicsEnabled ? "🔄" : "⏸️";
    showToast(physicsEnabled ? "Físicas reactivadas" : "Físicas pausadas");
  };

  // Search button triggers
  searchBtn.onclick = performSearch;
  searchInput.onkeydown = (e) => {
    if (e.key === "Enter") performSearch();
  };

  // Dialog triggers
  btnAddNode.onclick = () => openNodeModal(null);
  btnCloseNodeModal.onclick = closeNodeModal;
  btnCancelNodeModal.onclick = closeNodeModal;

  // Click outside modal
  window.onclick = (e) => {
    if (e.target === nodeModal) closeNodeModal();
  };

  // --- Tab Navigation ---
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    };
  });

  // --- Toast ---
  function showToast(message, isError = false) {
    toastText.textContent = message;
    if (isError) {
      toastBanner.classList.add("error");
    } else {
      toastBanner.classList.remove("error");
    }
    toastBanner.classList.add("show");
    
    setTimeout(() => {
      toastBanner.classList.remove("show");
    }, 3000);
  }

  // --- Accessibility, responsiveness and richer interactions ---
  mobileSidebarQuery.addEventListener("change", syncResponsiveLayout);
  sidebarToggleBtn?.addEventListener("click", () => {
    if (sidebarPanel.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
  sidebarBackdrop?.addEventListener("click", () => closeSidebar());

  btnAddAttribute?.addEventListener("click", () => {
    nodeAttributesEditor.appendChild(createAttributeRow());
  });

  searchInput?.addEventListener("input", (e) => renderSearchSuggestions(e.target.value));
  searchInput?.addEventListener("focus", () => renderSearchSuggestions(searchInput.value));
  searchInput?.addEventListener("blur", () => {
    setTimeout(() => {
      if (!searchSuggestionsEl) return;
      if (searchSuggestionsEl.contains(document.activeElement)) return;
      searchSuggestionsEl.style.display = "none";
    }, 150);
  });
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
    if (e.key === "Escape" && searchSuggestionsEl) {
      searchSuggestionsEl.style.display = "none";
    }
  });
  searchBtn.onclick = performSearch;

  window.addEventListener("keydown", handleModalKeydown);
  nodeModal?.addEventListener("click", (e) => {
    if (e.target === nodeModal) closeNodeModal();
  });
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) resolveConfirm(false);
  });

  btnCloseConfirmModal?.addEventListener("click", () => resolveConfirm(false));
  btnCancelConfirmModal?.addEventListener("click", () => resolveConfirm(false));
  btnAcceptConfirmModal?.addEventListener("click", () => resolveConfirm(true));

  btnFindPath.onclick = async () => {
    const startId = pathStartSelect.value;
    const endId = pathEndSelect.value;

    if (!startId || !endId) {
      showToast("Selecciona dos nodos para trazar la ruta", true);
      return;
    }

    if (startId === endId) {
      showToast("El origen y destino deben ser diferentes", true);
      return;
    }

    setBusyState(true, "Calculando camino óptimo...");
    await nextFrame();

    try {
      const path = window.SIRAlgorithms.findShortestRoute(nodes, relations, startId, endId);
      if (!path) {
        pathfinderResultsBox.style.display = "block";
        pathStepsEl.innerHTML = '<div style="font-size:0.75rem; color:var(--accent-red); font-style:italic;">No existe ninguna trayectoria de conexión directa o indirecta entre estos nodos.</div>';
        activeHighlightNodes = null;
        activeHighlightEdges = null;
        updateVisDatasets();
        return;
      }

      pathfinderResultsBox.style.display = "block";
      pathStepsEl.innerHTML = "";

      const pathNodeIds = new Set(path);
      const pathEdgeIds = new Set();

      for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = nodes.find(n => n.id === nodeId);

        const stepDiv = document.createElement("div");
        stepDiv.className = "path-node";
        stepDiv.textContent = node.nombre;
        stepDiv.onclick = () => {
          selectNode(nodeId);
          network.focus(nodeId, { scale: 1.2, animation: { duration: 400 } });
        };

        pathStepsEl.appendChild(stepDiv);

        if (i < path.length - 1) {
          const nextId = path[i + 1];
          const rel = relations.find(r =>
            r.estado === "Activo" &&
            ((r.origen === nodeId && r.destino === nextId) || (r.origen === nextId && r.destino === nodeId))
          );

          if (rel) {
            pathEdgeIds.add(rel.id);
            const connDiv = document.createElement("div");
            connDiv.className = "path-connector";
            connDiv.textContent = rel.tipo;
            pathStepsEl.appendChild(connDiv);
          }
        }
      }

      activeHighlightNodes = pathNodeIds;
      activeHighlightEdges = pathEdgeIds;
      updateVisDatasets(pathNodeIds, pathEdgeIds);
      showToast("Camino óptimo calculado y resaltado");
    } finally {
      setBusyState(false);
    }
  };

  btnImportTrigger.onclick = () => btnImport.click();
  btnImport.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed.nodes || !parsed.relations) {
          throw new Error("Formato inválido: debe contener arreglos de 'nodes' y 'relations'.");
        }

        setBusyState(true, "Importando grafo...");
        await nextFrame();

        nodes = parsed.nodes;
        relations = parsed.relations;
        window.SIRDatabase.save(nodes, relations);
        computeSystemState();
        setupGraph();
        updateUI();
        clearNodeSelection();
        showToast("Grafo importado exitosamente");
      } catch (err) {
        showToast(`Error al importar: ${err.message}`, true);
      } finally {
        setBusyState(false);
      }
    };
    reader.readAsText(file);
    btnImport.value = "";
  };

  btnReset.onclick = async () => {
    const confirmed = await showConfirmDialog({
      title: "Reiniciar red",
      message: "Esto vaciar� la red actual y la dejar� sin datos iniciales. Esta acci�n no se puede deshacer.",
      confirmLabel: "Reiniciar",
      danger: true
    });
    if (!confirmed) return;

    setBusyState(true, "Reiniciando red...");
    await nextFrame();
    try {
      const data = window.SIRDatabase.reset();
      nodes = data.nodes;
    deletedNodes = data.deletedNodes || [];
      relations = data.relations;
      computeSystemState();
      setupGraph();
      updateUI();
      clearNodeSelection();
      showToast("Red reiniciada sin datos iniciales");
    } finally {
      setBusyState(false);
    }
  };

  btnClearAll.onclick = async () => {
    const confirmed = await showConfirmDialog({
      title: "Borrar grafo completo",
      message: "Vas a eliminar por completo todos los nodos y relaciones. Para continuar escribe <strong>BORRAR GRAFO</strong>.",
      confirmLabel: "Borrar todo",
      requireText: "BORRAR GRAFO",
      danger: true
    });
    if (!confirmed) return;

    setBusyState(true, "Vaciando red...");
    await nextFrame();
    try {
      nodes = [];
      relations = [];
      window.SIRDatabase.save(nodes, relations);
      computeSystemState();
      setupGraph();
      updateUI();
      clearNodeSelection();
      showToast("Grafo completamente vaciado", true);
    } finally {
      setBusyState(false);
    }
  };

  selectedNodeContainer?.addEventListener("click", async (e) => {
    const deleteSelectedBtn = e.target.closest("#btn-delete-selected");
    if (deleteSelectedBtn) {
      e.preventDefault();
      e.stopPropagation();
      const node = nodes.find(n => n.id === selectedNodeId);
      if (!node) return;
      const confirmed = await showConfirmDialog({
        title: "Eliminar entidad",
        message: `¿Estás seguro de eliminar a <strong>${escapeHTML(node.nombre)}</strong>? Se borrarán también todas sus relaciones.`,
        confirmLabel: "Eliminar",
        danger: true
      });
      if (confirmed) {
        deleteNode(node.id);
        clearNodeSelection();
      }
      return;
    }

    const relBtn = e.target.closest(".btn-delete-rel");
    if (relBtn) {
      e.preventDefault();
      e.stopPropagation();
      const relId = relBtn.getAttribute("data-id");
      const confirmed = await showConfirmDialog({
        title: "Eliminar relación",
        message: "¿Seguro de eliminar esta relación?",
        confirmLabel: "Eliminar",
        danger: true
      });
      if (confirmed) {
        deleteRelation(relId);
        selectNode(selectedNodeId);
      }
    }
  }, true);

  allEntitiesListEl?.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest("button[data-id]");
    if (!deleteBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const nodeId = deleteBtn.getAttribute("data-id");
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const confirmed = await showConfirmDialog({
      title: "Eliminar entidad",
      message: `¿Estás seguro de eliminar a <strong>${escapeHTML(node.nombre)}</strong>? Se borrarán también todas sus relaciones.`,
      confirmLabel: "Eliminar",
      danger: true
    });
    if (confirmed) {
      deleteNode(nodeId);
    }
  }, true);

  // Keep the search suggestions useful when the user clicks the button.
  searchBtn.onclick = () => {
    renderSearchSuggestions(searchInput.value);
    performSearch();
  };

  // Run initial loading
  init();
});






