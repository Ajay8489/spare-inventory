/**
 * SPARE — Spare Parts & Component Management System
 * Modular Application Logic Engine
 */

// ============================================================================
// 1. INITIAL DEMO DATA & STATE persistence
// ============================================================================

const DEFAULT_SPARES = [
  {
    id: "sp-101",
    name: "Optical Zoom Lens Motor 50mm",
    category: "Optics",
    barcode: "SPR-104928",
    quantity: 24,
    used: 6,
    minStock: 5,
    location: "Bin A-01",
    cost: 45.00
  },
  {
    id: "sp-102",
    name: "CMOS Image Sensor Assembly 24MP",
    category: "Sensors",
    barcode: "SPR-309182",
    quantity: 4,
    used: 3,
    minStock: 5,
    location: "Bin A-04",
    cost: 120.00
  },
  {
    id: "sp-103",
    name: "Mechanical Shutter Blade Module",
    category: "Mechanical",
    barcode: "SPR-552109",
    quantity: 12,
    used: 8,
    minStock: 5,
    location: "Bin B-02",
    cost: 38.50
  },
  {
    id: "sp-104",
    name: "Flexible Main PCB Ribbon Cable",
    category: "Circuitry",
    barcode: "SPR-771203",
    quantity: 45,
    used: 18,
    minStock: 10,
    location: "Bin C-10",
    cost: 8.20
  },
  {
    id: "sp-105",
    name: "Rechargeable Li-Ion Battery 2200mAh",
    category: "Power",
    barcode: "SPR-883412",
    quantity: 15,
    used: 5,
    minStock: 5,
    location: "Bin D-01",
    cost: 25.00
  },
  {
    id: "sp-106",
    name: "Stainless Precision Screws M2x4mm (100pk)",
    category: "Fasteners",
    barcode: "SPR-992301",
    quantity: 50,
    used: 10,
    minStock: 15,
    location: "Bin E-05",
    cost: 12.00
  },
  {
    id: "sp-107",
    name: "Rubber Viewfinder Eyecup Seal",
    category: "Accessories",
    barcode: "SPR-220491",
    quantity: 3,
    used: 7,
    minStock: 5,
    location: "Bin F-03",
    cost: 6.50
  }
];

const DEFAULT_USAGE_LOGS = [
  {
    id: "usg-201",
    spareId: "sp-101",
    spareName: "Optical Zoom Lens Motor 50mm",
    sku: "SPR-104928",
    quantity: 2,
    technician: "Alex (Optics Bench)",
    date: getPastDateString(1),
    timestamp: "10:30 AM",
    notes: "Replaced faulty lens gear motor during standard lens overhaul."
  },
  {
    id: "usg-202",
    spareId: "sp-102",
    spareName: "CMOS Image Sensor Assembly 24MP",
    sku: "SPR-309182",
    quantity: 1,
    technician: "David (Sensor Lab)",
    date: getPastDateString(3),
    timestamp: "02:15 PM",
    notes: "Swapped damaged sensor die after high-voltage surge test."
  },
  {
    id: "usg-203",
    spareId: "sp-104",
    spareName: "Flexible Main PCB Ribbon Cable",
    sku: "SPR-771203",
    quantity: 4,
    technician: "Elena (Circuitry)",
    date: getPastDateString(5),
    timestamp: "11:45 AM",
    notes: "Wiring harness replacement for 4 camera chassis units."
  }
];

function getPastDateString(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// Global Application State
const state = {
  isLoggedIn: localStorage.getItem("spare_auth") === "true",
  username: localStorage.getItem("spare_user") || "admin",
  spares: loadSparesFromStorage(),
  usageLogs: loadUsageFromStorage(),
  activeTab: "inventory",
  filters: {
    search: "",
    category: "ALL",
    status: "ALL"
  },
  usageDateFilter: {
    from: "",
    to: ""
  },
  animInterval: null
};

function loadSparesFromStorage() {
  const raw = localStorage.getItem("spare_items");
  if (!raw) {
    localStorage.setItem("spare_items", JSON.stringify(DEFAULT_SPARES));
    return DEFAULT_SPARES;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_SPARES;
  }
}

function saveSparesToStorage() {
  localStorage.setItem("spare_items", JSON.stringify(state.spares));
}

function loadUsageFromStorage() {
  const raw = localStorage.getItem("spare_usage_logs");
  if (!raw) {
    localStorage.setItem("spare_usage_logs", JSON.stringify(DEFAULT_USAGE_LOGS));
    return DEFAULT_USAGE_LOGS;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_USAGE_LOGS;
  }
}

function saveUsageToStorage() {
  localStorage.setItem("spare_usage_logs", JSON.stringify(state.usageLogs));
}


// ============================================================================
// 2. HELPER UTILITIES (SKU Generator & Barcode Renderer)
// ============================================================================

function generateUniqueSKU() {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  return `SPR-${randNum}`;
}

function renderBarcodeSVG(target, text, customOptions = {}) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) return;

  const validText = (text && text.trim().length > 0) ? text.trim() : "SPR-000000";

  try {
    if (window.JsBarcode) {
      window.JsBarcode(element, validText, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 13,
        font: "JetBrains Mono",
        background: "#ffffff",
        lineColor: "#0f172a",
        margin: 8,
        ...customOptions
      });
    } else {
      element.innerHTML = `<text x="10" y="30" fill="#000" font-family="monospace">${validText}</text>`;
    }
  } catch (err) {
    console.warn("Barcode rendering warning:", err);
  }
}


// ============================================================================
// 3. INTRO ANIMATION CONTROLLER (Teardown & Assembly SVG)
// ============================================================================

function initIntroAnimation() {
  const overlay = document.getElementById("intro-overlay");
  const skipBtn = document.getElementById("skip-intro-btn");
  const progressBar = document.getElementById("intro-progress-bar");
  const percentLabel = document.getElementById("intro-percent");
  const phaseLabel = document.getElementById("intro-phase-text");

  // Check if animation has already played in this session
  const introCompleted = sessionStorage.getItem("spare_intro_completed") === "true";
  
  if (introCompleted || overlay.classList.contains("skip-anim")) {
    overlay.classList.add("hidden");
    return;
  }

  // Animation Groups
  const groupLens = document.getElementById("svg-lens-group");
  const groupAperture = document.getElementById("svg-aperture-group");
  const groupSensor = document.getElementById("svg-sensor-group");
  const groupPcb = document.getElementById("svg-pcb-group");
  const groupBody = document.getElementById("svg-body-group");

  let progress = 0;
  
  // Clear any existing timer
  if (state.animInterval) clearInterval(state.animInterval);

  state.animInterval = setInterval(() => {
    progress += 2;
    if (progress > 100) progress = 100;

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (percentLabel) percentLabel.textContent = `${progress}%`;

    // Phase 1 (0-25%): Initializing
    if (progress <= 25) {
      if (phaseLabel) phaseLabel.textContent = "Phase 1 / 4: Initializing Spare System Telemetry...";
      if (groupLens) groupLens.style.transform = "translate(0px, 0px)";
      if (groupAperture) groupAperture.style.transform = "translate(0px, 0px)";
      if (groupSensor) groupSensor.style.transform = "translate(0px, 0px)";
      if (groupPcb) groupPcb.style.transform = "translate(0px, 0px)";
      if (groupBody) groupBody.style.transform = "translate(0px, 0px)";
    } 
    // Phase 2 (26-55%): Disassembling (Exploded View Animation)
    else if (progress <= 55) {
      if (phaseLabel) phaseLabel.textContent = "Phase 2 / 4: Disassembling Camera Module Components...";
      if (groupLens) groupLens.style.transform = "translate(-110px, -15px)";
      if (groupAperture) groupAperture.style.transform = "translate(-50px, 0px)";
      if (groupSensor) groupSensor.style.transform = "translate(0px, -25px)";
      if (groupPcb) groupPcb.style.transform = "translate(55px, 0px)";
      if (groupBody) groupBody.style.transform = "translate(115px, 15px)";
    } 
    // Phase 3 (56-80%): Verifying Parts & Laser Scan
    else if (progress <= 80) {
      if (phaseLabel) phaseLabel.textContent = "Phase 3 / 4: Verifying Part Telemetry & Laser Barcodes...";
    } 
    // Phase 4 (81-100%): Reassembling
    else {
      if (phaseLabel) phaseLabel.textContent = "Phase 4 / 4: Reassembling Calibrated Camera Unit...";
      if (groupLens) groupLens.style.transform = "translate(0px, 0px)";
      if (groupAperture) groupAperture.style.transform = "translate(0px, 0px)";
      if (groupSensor) groupSensor.style.transform = "translate(0px, 0px)";
      if (groupPcb) groupPcb.style.transform = "translate(0px, 0px)";
      if (groupBody) groupBody.style.transform = "translate(0px, 0px)";
    }

    // Complete Animation
    if (progress >= 100) {
      clearInterval(state.animInterval);
      sessionStorage.setItem("spare_intro_completed", "true");
      setTimeout(() => {
        overlay.classList.add("opacity-0");
        setTimeout(() => overlay.classList.add("hidden"), 500);
      }, 400);
    }
  }, 70);

  // Skip button click handler
  skipBtn?.addEventListener("click", () => {
    if (state.animInterval) clearInterval(state.animInterval);
    sessionStorage.setItem("spare_intro_completed", "true");
    overlay.classList.add("hidden");
  });
}


// ============================================================================
// 4. AUTHENTICATION FLOW
// ============================================================================

function checkAuth() {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const navUserLabel = document.getElementById("nav-user-label");

  if (state.isLoggedIn) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    dashboardView.classList.add("flex");
    if (navUserLabel) navUserLabel.textContent = `Operator: ${state.username}`;
    renderDashboard();
  } else {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    dashboardView.classList.remove("flex");
  }
}

function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("login-username").value.trim();
  const passwordInput = document.getElementById("login-password").value.trim();
  const errorBanner = document.getElementById("login-error");

  if (!usernameInput || !passwordInput) {
    if (errorBanner) {
      errorBanner.classList.remove("hidden");
      document.getElementById("login-error-text").textContent = "Please fill in all credentials.";
    }
    return;
  }

  // Local authentication check
  localStorage.setItem("spare_auth", "true");
  localStorage.setItem("spare_user", usernameInput || "admin");
  state.isLoggedIn = true;
  state.username = usernameInput || "admin";

  if (errorBanner) errorBanner.classList.add("hidden");

  // Trigger camera teardown animation if first time in session
  initIntroAnimation();
  checkAuth();
}

function handleLogout() {
  localStorage.setItem("spare_auth", "false");
  state.isLoggedIn = false;
  checkAuth();
}


// ============================================================================
// 5. DASHBOARD & METRICS ENGINE
// ============================================================================

function renderDashboard() {
  updateMetricCards();
  renderInventoryTable();
  renderUsageLogsTable();
  populateDropdowns();
}

function updateMetricCards() {
  const totalUnique = state.spares.length;
  const totalStock = state.spares.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
  const totalUsed = state.spares.reduce((acc, item) => acc + (parseInt(item.used) || 0), 0);
  const lowStockCount = state.spares.filter(item => (parseInt(item.quantity) || 0) <= (parseInt(item.minStock) || 5)).length;

  document.getElementById("metric-unique-items").textContent = totalUnique;
  document.getElementById("metric-total-stock").textContent = totalStock;
  document.getElementById("metric-total-used").textContent = totalUsed;
  document.getElementById("metric-low-stock").textContent = lowStockCount;
}

function populateDropdowns() {
  // Populate spare dropdowns for Usage Modal and Barcode Studio
  const studioSelect = document.getElementById("studio-spare-select");
  const usageSelect = document.getElementById("usage-select-item");

  let optionsHTML = '<option value="">-- Select a Spare Item --</option>';
  state.spares.forEach(item => {
    optionsHTML += `<option value="${item.id}" data-sku="${item.barcode}" data-name="${item.name}" data-loc="${item.location}">${item.name} (${item.barcode}) - ${item.quantity} in stock</option>`;
  });

  if (studioSelect) studioSelect.innerHTML = optionsHTML;
  if (usageSelect) usageSelect.innerHTML = optionsHTML;
}


// ============================================================================
// 6. INVENTORY DATABASE TABLE & CRUD
// ============================================================================

function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  const emptyState = document.getElementById("inventory-empty-state");
  if (!tbody) return;

  const { search, category, status } = state.filters;

  // Filter items
  const filtered = state.spares.filter(item => {
    // Search match
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      item.name.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.location && item.location.toLowerCase().includes(q));

    // Category match
    const matchesCat = category === "ALL" || item.category === category;

    // Stock status match
    const qty = parseInt(item.quantity) || 0;
    const minS = parseInt(item.minStock) || 5;
    let matchesStatus = true;
    if (status === "IN_STOCK") matchesStatus = qty > minS;
    if (status === "LOW_STOCK") matchesStatus = qty > 0 && qty <= minS;
    if (status === "OUT_OF_STOCK") matchesStatus = qty === 0;

    return matchesSearch && matchesCat && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  tbody.innerHTML = filtered.map(item => {
    const qty = parseInt(item.quantity) || 0;
    const minS = parseInt(item.minStock) || 5;
    
    // Status Badge
    let statusBadge = '';
    if (qty === 0) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">OUT OF STOCK</span>`;
    } else if (qty <= minS) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">LOW STOCK</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">IN STOCK</span>`;
    }

    return `
      <tr class="hover:bg-slate-800/50 transition">
        <td class="py-3.5 px-6">
          <div class="font-bold text-slate-100">${escapeHTML(item.name)}</div>
          <div class="flex items-center space-x-2 mt-0.5">
            <span class="text-[11px] px-2 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">${escapeHTML(item.category)}</span>
            <span class="text-xs text-slate-500">${escapeHTML(item.location || 'Bin Default')}</span>
          </div>
        </td>

        <td class="py-3.5 px-6 font-mono text-xs">
          <div class="bg-white/95 text-slate-900 px-2 py-1 rounded inline-block shadow-sm">
            <svg class="barcode-item-svg text-center" data-barcode="${escapeHTML(item.barcode)}"></svg>
          </div>
        </td>

        <td class="py-3.5 px-6">
          <div class="flex items-center space-x-2">
            <button onclick="window.quickAdjustStock('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">-</button>
            <span class="font-mono font-bold text-base text-slate-100 min-w-[24px] text-center">${qty}</span>
            <button onclick="window.quickAdjustStock('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">+</button>
            <div class="ml-2">${statusBadge}</div>
          </div>
        </td>

        <td class="py-3.5 px-6 font-mono text-slate-300 text-xs">
          ${item.used || 0} units
        </td>

        <td class="py-3.5 px-6 text-xs">
          <div class="font-mono text-emerald-400 font-bold">$${parseFloat(item.cost || 0).toFixed(2)}</div>
          <div class="text-[11px] text-slate-500">${escapeHTML(item.location || "N/A")}</div>
        </td>

        <td class="py-3.5 px-6 text-right">
          <div class="flex items-center justify-end space-x-2">
            <button onclick="window.openLogUsageModal('${item.id}')" title="Log Usage" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button onclick="window.printSingleLabel('${item.id}')" title="Print Barcode Label" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>

            <button onclick="window.editSpareItem('${item.id}')" title="Edit Item" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button onclick="window.deleteSpareItem('${item.id}')" title="Delete Item" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Render inline table barcodes
  document.querySelectorAll(".barcode-item-svg").forEach(svg => {
    const code = svg.getAttribute("data-barcode");
    renderBarcodeSVG(svg, code, { height: 26, fontSize: 10, margin: 2, displayValue: true });
  });
}


// ============================================================================
// 7. SPARE USAGE TRACKER & DATE RANGE AUDITOR
// ============================================================================

function renderUsageLogsTable() {
  const tbody = document.getElementById("usage-table-body");
  const emptyState = document.getElementById("usage-empty-state");
  if (!tbody) return;

  const { from, to } = state.usageDateFilter;

  // Filter usage logs by date range
  const filtered = state.usageLogs.filter(log => {
    if (!from && !to) return true;
    const logDate = log.date; // YYYY-MM-DD
    if (from && logDate < from) return false;
    if (to && logDate > to) return false;
    return true;
  });

  // Calculate summary metrics for filtered logs
  const totalUnitsConsumed = filtered.reduce((acc, log) => acc + (parseInt(log.quantity) || 0), 0);
  
  // Total cost
  let totalCost = 0;
  const categoryFreq = {};

  filtered.forEach(log => {
    const spare = state.spares.find(s => s.id === log.spareId);
    if (spare) {
      totalCost += (parseFloat(spare.cost) || 0) * (parseInt(log.quantity) || 0);
      categoryFreq[spare.category] = (categoryFreq[spare.category] || 0) + (parseInt(log.quantity) || 0);
    }
  });

  // Top category
  let topCat = "N/A";
  let maxFreq = 0;
  Object.keys(categoryFreq).forEach(cat => {
    if (categoryFreq[cat] > maxFreq) {
      maxFreq = categoryFreq[cat];
      topCat = cat;
    }
  });

  document.getElementById("usage-sum-units").textContent = `${totalUnitsConsumed} units`;
  document.getElementById("usage-sum-cost").textContent = `$${totalCost.toFixed(2)}`;
  document.getElementById("usage-top-category").textContent = topCat;

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  tbody.innerHTML = filtered.map(log => {
    return `
      <tr class="hover:bg-slate-800/50 transition">
        <td class="py-3.5 px-6 font-mono text-xs text-slate-300">
          <div class="font-bold text-amber-400">${escapeHTML(log.date)}</div>
          <div class="text-[11px] text-slate-500">${escapeHTML(log.timestamp || "12:00 PM")}</div>
        </td>

        <td class="py-3.5 px-6">
          <div class="font-bold text-slate-100">${escapeHTML(log.spareName)}</div>
          <div class="text-xs font-mono text-slate-400">${escapeHTML(log.sku)}</div>
        </td>

        <td class="py-3.5 px-6 font-mono font-bold text-rose-400 text-sm">
          -${log.quantity} units
        </td>

        <td class="py-3.5 px-6 text-xs">
          <div class="font-semibold text-slate-200">${escapeHTML(log.technician || "General Repair")}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${escapeHTML(log.notes || "Standard component replacement")}</div>
        </td>

        <td class="py-3.5 px-6 text-right">
          <button onclick="window.revertUsageLog('${log.id}')" class="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition" title="Revert / Delete Log Entry">
            Revert
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


// ============================================================================
// 8. GLOBAL ACTION HANDLERS (Modal & CRUD Operations)
// ============================================================================

window.quickAdjustStock = function(id, delta) {
  const item = state.spares.find(s => s.id === id);
  if (!item) return;

  const currentQty = parseInt(item.quantity) || 0;
  const newQty = Math.max(0, currentQty + delta);
  item.quantity = newQty;

  saveSparesToStorage();
  renderDashboard();
};

window.openAddSpareModal = function() {
  document.getElementById("modal-title").textContent = "Add New Spare Part";
  document.getElementById("form-item-id").value = "";
  document.getElementById("form-name").value = "";
  document.getElementById("form-category").value = "Optics";
  document.getElementById("form-location").value = "Bin A-01";
  
  const newSKU = generateUniqueSKU();
  document.getElementById("form-barcode").value = newSKU;
  document.getElementById("form-quantity").value = 10;
  document.getElementById("form-used").value = 0;
  document.getElementById("form-min-stock").value = 5;
  document.getElementById("form-cost").value = 25.00;

  renderBarcodeSVG("#form-barcode-preview", newSKU);
  document.getElementById("spare-modal").classList.remove("hidden");
};

window.editSpareItem = function(id) {
  const item = state.spares.find(s => s.id === id);
  if (!item) return;

  document.getElementById("modal-title").textContent = "Edit Spare Part";
  document.getElementById("form-item-id").value = item.id;
  document.getElementById("form-name").value = item.name;
  document.getElementById("form-category").value = item.category;
  document.getElementById("form-location").value = item.location || "";
  document.getElementById("form-barcode").value = item.barcode;
  document.getElementById("form-quantity").value = item.quantity;
  document.getElementById("form-used").value = item.used || 0;
  document.getElementById("form-min-stock").value = item.minStock || 5;
  document.getElementById("form-cost").value = item.cost || 0;

  renderBarcodeSVG("#form-barcode-preview", item.barcode);
  document.getElementById("spare-modal").classList.remove("hidden");
};

window.deleteSpareItem = function(id) {
  if (!confirm("Are you sure you want to delete this spare item from inventory?")) return;
  state.spares = state.spares.filter(s => s.id !== id);
  saveSparesToStorage();
  renderDashboard();
};

window.openLogUsageModal = function(spareId = null) {
  const usageModal = document.getElementById("usage-modal");
  const selectItem = document.getElementById("usage-select-item");
  const dateInput = document.getElementById("usage-date");

  populateDropdowns();

  if (spareId && selectItem) {
    selectItem.value = spareId;
  }

  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  usageModal.classList.remove("hidden");
};

window.revertUsageLog = function(logId) {
  if (!confirm("Revert this usage entry? The used count will be decremented.")) return;
  
  const log = state.usageLogs.find(l => l.id === logId);
  if (log) {
    const spare = state.spares.find(s => s.id === log.spareId);
    if (spare) {
      spare.quantity = (parseInt(spare.quantity) || 0) + (parseInt(log.quantity) || 0);
      spare.used = Math.max(0, (parseInt(spare.used) || 0) - (parseInt(log.quantity) || 0));
    }
  }

  state.usageLogs = state.usageLogs.filter(l => l.id !== logId);
  saveSparesToStorage();
  saveUsageToStorage();
  renderDashboard();
};


// ============================================================================
// 9. PRINT ENGINE SYSTEM
// ============================================================================

window.printSingleLabel = function(id) {
  const item = state.spares.find(s => s.id === id);
  if (!item) return;

  const printContainer = document.getElementById("printable-area");
  if (!printContainer) return;

  printContainer.innerHTML = `
    <div class="print-label-box">
      <div style="font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span>SPARE PARTS TAG</span>
        <span>${escapeHTML(item.location || 'BIN DEFAULT')}</span>
      </div>
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${escapeHTML(item.name)}</div>
      <div style="display: flex; justify-content: center; margin: 10px 0;">
        <svg id="printable-barcode-svg"></svg>
      </div>
      <div style="font-size: 9px; font-family: monospace; color: #555; display: flex; justify-content: space-between; margin-top: 8px;">
        <span>CATEGORY: ${escapeHTML(item.category)}</span>
        <span>COST: $${parseFloat(item.cost || 0).toFixed(2)}</span>
      </div>
    </div>
  `;

  renderBarcodeSVG("#printable-barcode-svg", item.barcode, { height: 50, fontSize: 12 });
  window.print();
};

window.printDatabase = function() {
  const printContainer = document.getElementById("printable-area");
  if (!printContainer) return;

  const rowsHTML = state.spares.map(item => `
    <tr>
      <td>${escapeHTML(item.name)}</td>
      <td style="font-family: monospace;">${escapeHTML(item.barcode)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td>${item.quantity}</td>
      <td>${item.used || 0}</td>
      <td>${escapeHTML(item.location || 'N/A')}</td>
      <td>$${parseFloat(item.cost || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  printContainer.innerHTML = `
    <div>
      <h2 style="font-size: 18pt; font-weight: bold; margin-bottom: 4px;">SPARE INVENTORY DATABASE REPORT</h2>
      <p style="font-size: 10pt; color: #555; margin-bottom: 16px;">Generated: ${new Date().toLocaleString()}</p>

      <table class="print-table">
        <thead>
          <tr>
            <th>Spare Part Name</th>
            <th>SKU Barcode</th>
            <th>Category</th>
            <th>In Stock</th>
            <th>Used</th>
            <th>Location</th>
            <th>Unit Cost</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </div>
  `;

  window.print();
};


// Safe HTML String Escaper
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================================
// 10. EVENT LISTENERS INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  
  // Auth Listeners
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);
  document.getElementById("logout-btn")?.addEventListener("click", handleLogout);

  document.getElementById("quick-demo-login-btn")?.addEventListener("click", () => {
    localStorage.setItem("spare_auth", "true");
    localStorage.setItem("spare_user", "admin");
    state.isLoggedIn = true;
    checkAuth();
  });

  // Replay Intro SVG
  document.getElementById("replay-anim-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("spare_intro_completed");
    const overlay = document.getElementById("intro-overlay");
    overlay.classList.remove("hidden", "opacity-0", "skip-anim");
    initIntroAnimation();
  });

  // Tab Switcher
  const tabInv = document.getElementById("tab-btn-inventory");
  const tabUsage = document.getElementById("tab-btn-usage");
  const tabBarcode = document.getElementById("tab-btn-barcode");

  const contentInv = document.getElementById("tab-content-inventory");
  const contentUsage = document.getElementById("tab-content-usage");
  const contentBarcode = document.getElementById("tab-content-barcode");

  function switchTab(target) {
    state.activeTab = target;

    [tabInv, tabUsage, tabBarcode].forEach(btn => {
      btn.classList.remove("border-amber-500", "text-amber-400");
      btn.classList.add("border-transparent", "text-slate-400");
    });

    [contentInv, contentUsage, contentBarcode].forEach(c => c.classList.add("hidden"));

    if (target === "inventory") {
      tabInv.classList.add("border-amber-500", "text-amber-400");
      contentInv.classList.remove("hidden");
    } else if (target === "usage") {
      tabUsage.classList.add("border-amber-500", "text-amber-400");
      contentUsage.classList.remove("hidden");
    } else if (target === "barcode") {
      tabBarcode.classList.add("border-amber-500", "text-amber-400");
      contentBarcode.classList.remove("hidden");
      // Render initial studio barcode
      renderBarcodeSVG("#studio-barcode-svg", document.getElementById("studio-sku-input").value || "SPR-900123");
    }
  }

  tabInv?.addEventListener("click", () => switchTab("inventory"));
  tabUsage?.addEventListener("click", () => switchTab("usage"));
  tabBarcode?.addEventListener("click", () => switchTab("barcode"));

  // Inventory Filters
  document.getElementById("search-inventory")?.addEventListener("input", (e) => {
    state.filters.search = e.target.value;
    renderInventoryTable();
  });

  document.getElementById("filter-category")?.addEventListener("change", (e) => {
    state.filters.category = e.target.value;
    renderInventoryTable();
  });

  document.getElementById("filter-status")?.addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    renderInventoryTable();
  });

  document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
    state.filters.search = "";
    state.filters.category = "ALL";
    state.filters.status = "ALL";

    document.getElementById("search-inventory").value = "";
    document.getElementById("filter-category").value = "ALL";
    document.getElementById("filter-status").value = "ALL";

    renderInventoryTable();
  });

  // Action Buttons
  document.getElementById("btn-add-spare")?.addEventListener("click", window.openAddSpareModal);
  document.getElementById("btn-log-usage-quick")?.addEventListener("click", () => window.openLogUsageModal());
  document.getElementById("btn-open-usage-modal")?.addEventListener("click", () => window.openLogUsageModal());
  document.getElementById("btn-print-db")?.addEventListener("click", window.printDatabase);

  // Spare Item Modal Listeners
  document.getElementById("btn-close-spare-modal")?.addEventListener("click", () => {
    document.getElementById("spare-modal").classList.add("hidden");
  });
  document.getElementById("btn-cancel-spare-modal")?.addEventListener("click", () => {
    document.getElementById("spare-modal").classList.add("hidden");
  });

  document.getElementById("form-gen-sku-btn")?.addEventListener("click", () => {
    const sku = generateUniqueSKU();
    document.getElementById("form-barcode").value = sku;
    renderBarcodeSVG("#form-barcode-preview", sku);
  });

  document.getElementById("form-barcode")?.addEventListener("input", (e) => {
    renderBarcodeSVG("#form-barcode-preview", e.target.value);
  });

  document.getElementById("spare-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-item-id").value;
    const name = document.getElementById("form-name").value.trim();
    const category = document.getElementById("form-category").value;
    const location = document.getElementById("form-location").value.trim();
    const barcode = document.getElementById("form-barcode").value.trim();
    const quantity = parseInt(document.getElementById("form-quantity").value) || 0;
    const used = parseInt(document.getElementById("form-used").value) || 0;
    const minStock = parseInt(document.getElementById("form-min-stock").value) || 5;
    const cost = parseFloat(document.getElementById("form-cost").value) || 0;

    if (id) {
      // Edit
      const item = state.spares.find(s => s.id === id);
      if (item) {
        Object.assign(item, { name, category, location, barcode, quantity, used, minStock, cost });
      }
    } else {
      // Add
      const newItem = {
        id: `sp-${Date.now()}`,
        name,
        category,
        location,
        barcode: barcode || generateUniqueSKU(),
        quantity,
        used,
        minStock,
        cost
      };
      state.spares.push(newItem);
    }

    saveSparesToStorage();
    document.getElementById("spare-modal").classList.add("hidden");
    renderDashboard();
  });

  document.getElementById("form-print-label-btn")?.addEventListener("click", () => {
    const barcode = document.getElementById("form-barcode").value;
    const name = document.getElementById("form-name").value || "Spare Component";
    const loc = document.getElementById("form-location").value || "Bin A-01";
    const cat = document.getElementById("form-category").value || "General";
    const cost = parseFloat(document.getElementById("form-cost").value) || 0;

    const printContainer = document.getElementById("printable-area");
    printContainer.innerHTML = `
      <div class="print-label-box">
        <div style="font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>SPARE INVENTORY TAG</span>
          <span>${escapeHTML(loc)}</span>
        </div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${escapeHTML(name)}</div>
        <div style="display: flex; justify-content: center; margin: 10px 0;">
          <svg id="form-printable-barcode-svg"></svg>
        </div>
        <div style="font-size: 9px; font-family: monospace; color: #555; display: flex; justify-content: space-between; margin-top: 8px;">
          <span>CAT: ${escapeHTML(cat)}</span>
          <span>COST: $${cost.toFixed(2)}</span>
        </div>
      </div>
    `;

    renderBarcodeSVG("#form-printable-barcode-svg", barcode, { height: 50, fontSize: 12 });
    window.print();
  });

  // Usage Modal Listeners
  document.getElementById("btn-close-usage-modal")?.addEventListener("click", () => {
    document.getElementById("usage-modal").classList.add("hidden");
  });
  document.getElementById("btn-cancel-usage-modal")?.addEventListener("click", () => {
    document.getElementById("usage-modal").classList.add("hidden");
  });

  document.getElementById("usage-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const spareId = document.getElementById("usage-select-item").value;
    const qty = parseInt(document.getElementById("usage-qty").value) || 1;
    const date = document.getElementById("usage-date").value || getPastDateString(0);
    const tech = document.getElementById("usage-tech").value.trim();
    const notes = document.getElementById("usage-notes").value.trim();

    const spare = state.spares.find(s => s.id === spareId);
    if (!spare) return;

    // Deduct stock
    spare.quantity = Math.max(0, (parseInt(spare.quantity) || 0) - qty);
    spare.used = (parseInt(spare.used) || 0) + qty;

    const newLog = {
      id: `usg-${Date.now()}`,
      spareId: spare.id,
      spareName: spare.name,
      sku: spare.barcode,
      quantity: qty,
      technician: tech || "General Repair",
      date,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes
    };

    state.usageLogs.unshift(newLog);

    saveSparesToStorage();
    saveUsageToStorage();

    document.getElementById("usage-modal").classList.add("hidden");
    renderDashboard();
  });

  // Usage Date Filter Listeners
  document.getElementById("btn-check-usage")?.addEventListener("click", () => {
    state.usageDateFilter.from = document.getElementById("usage-from-date").value;
    state.usageDateFilter.to = document.getElementById("usage-to-date").value;
    renderUsageLogsTable();
  });

  document.getElementById("btn-reset-usage-dates")?.addEventListener("click", () => {
    state.usageDateFilter.from = "";
    state.usageDateFilter.to = "";
    document.getElementById("usage-from-date").value = "";
    document.getElementById("usage-to-date").value = "";
    renderUsageLogsTable();
  });

  // Barcode Studio Controls
  document.getElementById("studio-spare-select")?.addEventListener("change", (e) => {
    const option = e.target.options[e.target.selectedIndex];
    if (option && option.value) {
      const sku = option.getAttribute("data-sku");
      const name = option.getAttribute("data-name");
      const loc = option.getAttribute("data-loc");

      document.getElementById("studio-sku-input").value = sku;
      document.getElementById("studio-part-name").value = name;
      document.getElementById("studio-part-loc").value = loc || "Bin A-01";

      document.getElementById("label-card-title").textContent = name;
      document.getElementById("label-card-loc").textContent = loc || "BIN A-01";

      renderBarcodeSVG("#studio-barcode-svg", sku);
    }
  });

  document.getElementById("studio-sku-input")?.addEventListener("input", (e) => {
    renderBarcodeSVG("#studio-barcode-svg", e.target.value);
  });

  document.getElementById("studio-gen-sku-btn")?.addEventListener("click", () => {
    const sku = generateUniqueSKU();
    document.getElementById("studio-sku-input").value = sku;
    renderBarcodeSVG("#studio-barcode-svg", sku);
  });

  document.getElementById("studio-part-name")?.addEventListener("input", (e) => {
    document.getElementById("label-card-title").textContent = e.target.value || "Optical Camera Spare Part";
  });

  document.getElementById("studio-part-loc")?.addEventListener("input", (e) => {
    document.getElementById("label-card-loc").textContent = (e.target.value || "BIN A-01").toUpperCase();
  });

  document.getElementById("studio-print-btn")?.addEventListener("click", () => {
    const sku = document.getElementById("studio-sku-input").value || "SPR-900123";
    const name = document.getElementById("studio-part-name").value || "Optical Camera Spare Part";
    const loc = document.getElementById("studio-part-loc").value || "BIN A-01";

    const printContainer = document.getElementById("printable-area");
    printContainer.innerHTML = `
      <div class="print-label-box">
        <div style="font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>SPARE INVENTORY TAG</span>
          <span>${escapeHTML(loc.toUpperCase())}</span>
        </div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${escapeHTML(name)}</div>
        <div style="display: flex; justify-content: center; margin: 10px 0;">
          <svg id="studio-printable-barcode-svg"></svg>
        </div>
        <div style="font-size: 9px; font-family: monospace; color: #555; display: flex; justify-content: space-between; margin-top: 8px;">
          <span>SYSTEM: SPARE V2.4</span>
          <span>CONFIDENTIAL PARTS</span>
        </div>
      </div>
    `;

    renderBarcodeSVG("#studio-printable-barcode-svg", sku, { height: 50, fontSize: 12 });
    window.print();
  });

  // Initial Auth Check
  checkAuth();
  if (state.isLoggedIn) {
    initIntroAnimation();
  }
});
