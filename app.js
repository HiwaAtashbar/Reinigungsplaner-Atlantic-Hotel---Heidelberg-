/* ============================================================
   Reinigungsplaner – Hotelzimmer-Reinigungs-App (PWA)
   Alle Daten werden lokal im Browser (localStorage) gespeichert.
   ============================================================ */

const STORE_KEYS = {
  rooms: "clean_rooms_v1",
  shifts: "clean_shifts_v1",
  locks: "clean_locks_v1",
  settings: "clean_settings_v1"
};

const DEFAULT_SETTINGS = {
  wageNormal: 5.0,   // Lohn pro normalem Zimmer (€)
  wageSuite: 6.5     // Lohn pro Doppelzimmer-Suite (€)
};

const STATUS_CONFIG = {
  blue:   { label: "Abreise – neu vermietet", short: "Blau", cssClass: "status-blue" },
  red:    { label: "Abreise – nicht vermietet", short: "Rot", cssClass: "status-red" },
  yellow: { label: "Bleibt (Aufenthalt)", short: "Gelb", cssClass: "status-yellow" }
};

const STATUS_ORDER = ["blue", "red", "yellow"];

/* ---------- State ---------- */
let state = {
  currentDate: todayStr(),
  activeTab: "rooms",
  editingRoomId: null,
  timerInterval: null
};

/* ---------- Storage helpers ---------- */
function loadAll(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getRooms() { return loadAll(STORE_KEYS.rooms, []); }
function setRooms(rooms) { saveAll(STORE_KEYS.rooms, rooms); }

function getShifts() { return loadAll(STORE_KEYS.shifts, []); }
function setShifts(shifts) { saveAll(STORE_KEYS.shifts, shifts); }

function getLocks() { return loadAll(STORE_KEYS.locks, []); }
function setLocks(locks) { saveAll(STORE_KEYS.locks, locks); }

function getSettings() { return loadAll(STORE_KEYS.settings, { ...DEFAULT_SETTINGS }); }
function setSettings(s) { saveAll(STORE_KEYS.settings, s); }

/* ---------- Date helpers ---------- */
function todayStr() {
  const d = new Date();
  return formatDateKey(d);
}
function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftDate(key, days) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}
function formatDateLabel(key) {
  const d = parseDateKey(key);
  const opts = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  let label = d.toLocaleDateString("de-DE", opts);
  if (key === todayStr()) label = "Heute · " + label;
  return label;
}
function formatTime(ts) {
  if (!ts) return "–";
  const d = new Date(ts);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function formatDuration(ms) {
  if (ms == null || ms < 0) return "–";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h} Std ${m} Min`;
  return `${m} Min`;
}
function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function uuid() {
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

/* ---------- Lock helpers ---------- */
function isDayLocked(dateKey) {
  const locks = getLocks();
  const entry = locks.find(l => l.date === dateKey);
  return entry ? entry.locked : false;
}
function setDayLocked(dateKey, locked) {
  const locks = getLocks();
  const idx = locks.findIndex(l => l.date === dateKey);
  if (idx >= 0) locks[idx].locked = locked;
  else locks.push({ date: dateKey, locked });
  setLocks(locks);
}

/* ---------- Toast ---------- */
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2500);
}

/* ============================================================
   RENDER: Header / Date navigation / Lock banner
   ============================================================ */
function renderHeader() {
  document.getElementById("currentDateLabel").textContent = formatDateLabel(state.currentDate);
  const locked = isDayLocked(state.currentDate);
  document.getElementById("btnLock").textContent = locked ? "🔒" : "🔓";
  const banner = document.getElementById("lockBanner");
  banner.classList.toggle("hidden", !locked);
  document.getElementById("btnAddRoom").classList.toggle("hidden", locked || state.activeTab !== "rooms");
}

/* ============================================================
   RENDER: Shift / Arbeitszeit card
   ============================================================ */
function getShiftForDate(dateKey) {
  const shifts = getShifts();
  return shifts.find(s => s.date === dateKey) || null;
}
function saveShift(dateKey, patch) {
  const shifts = getShifts();
  let entry = shifts.find(s => s.date === dateKey);
  if (!entry) {
    entry = { date: dateKey, kommen: null, gehen: null };
    shifts.push(entry);
  }
  Object.assign(entry, patch);
  setShifts(shifts);
}

function renderShift() {
  const shift = getShiftForDate(state.currentDate);
  const locked = isDayLocked(state.currentDate);
  const btnKommen = document.getElementById("btnKommen");
  const btnGehen = document.getElementById("btnGehen");
  const info = document.getElementById("shiftInfo");

  const kommen = shift?.kommen || null;
  const gehen = shift?.gehen || null;

  btnKommen.disabled = locked || !!kommen;
  btnGehen.disabled = locked || !kommen || !!gehen;

  if (!kommen) {
    info.textContent = "Noch nicht eingestempelt.";
  } else if (kommen && !gehen) {
    info.textContent = `Kommen: ${formatTime(kommen)} · Schicht läuft…`;
  } else {
    info.textContent = `Kommen: ${formatTime(kommen)}  ·  Gehen: ${formatTime(gehen)}  ·  Dauer: ${formatDuration(gehen - kommen)}`;
  }
}

function openShiftModal() {
  const shift = getShiftForDate(state.currentDate);
  document.getElementById("inputKommenTime").value = timeInputValue(shift?.kommen);
  document.getElementById("inputGehenTime").value = timeInputValue(shift?.gehen);
  document.getElementById("shiftModal").classList.remove("hidden");
}
function closeShiftModal() {
  document.getElementById("shiftModal").classList.add("hidden");
}
function saveShiftFromModal() {
  const kommenVal = document.getElementById("inputKommenTime").value.trim();
  const gehenVal = document.getElementById("inputGehenTime").value.trim();
  const kommenTs = kommenVal ? timeInputToTimestamp(state.currentDate, kommenVal) : null;
  const gehenTs = gehenVal ? timeInputToTimestamp(state.currentDate, gehenVal) : null;

  if (kommenTs && gehenTs && gehenTs < kommenTs) {
    showToast("Gehen darf nicht vor Kommen liegen.");
    return;
  }

  saveShift(state.currentDate, { kommen: kommenTs, gehen: gehenTs });
  closeShiftModal();
  renderAll();
  showToast("Arbeitszeit gespeichert.");
}

/* ============================================================
   RENDER: Room list
   ============================================================ */
function getRoomsForDate(dateKey) {
  return getRooms().filter(r => r.date === dateKey);
}

function sortRooms(rooms) {
  return [...rooms].sort((a, b) => {
    const oa = STATUS_ORDER.indexOf(a.status);
    const ob = STATUS_ORDER.indexOf(b.status);
    if (oa !== ob) return oa - ob;
    if (a.ww !== b.ww) return a.ww ? -1 : 1;
    return a.number.localeCompare(b.number, "de", { numeric: true });
  });
}

function renderRoomList() {
  const rooms = sortRooms(getRoomsForDate(state.currentDate));
  const list = document.getElementById("roomList");
  const empty = document.getElementById("emptyState");
  const locked = isDayLocked(state.currentDate);

  document.getElementById("roomCount").textContent = `${rooms.length} Zimmer`;

  list.innerHTML = "";
  if (rooms.length === 0) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
  }

  rooms.forEach(room => {
    const card = document.createElement("div");
    card.className = `room-card ${STATUS_CONFIG[room.status].cssClass} ${room.ww ? "ww" : ""}`;
    card.dataset.id = room.id;

    const badges = [];
    if (room.isSuite) badges.push(`<span class="badge suite">Suite</span>`);
    if (room.ww) badges.push(`<span class="badge ww">WW</span>`);
    badges.push(`<span class="badge">${STATUS_CONFIG[room.status].short}</span>`);

    let actionHtml = "";
    if (!room.startTime) {
      actionHtml = `<button class="room-action-btn start" data-action="start" ${locked ? "disabled" : ""}>Start</button>`;
    } else if (room.startTime && !room.endTime) {
      actionHtml = `<button class="room-action-btn end" data-action="end" ${locked ? "disabled" : ""}>Ende</button>`;
    } else {
      actionHtml = `<button class="room-action-btn done" disabled>Fertig</button>`;
    }

    let timerHtml = "";
    if (room.startTime && !room.endTime) {
      timerHtml = `<span class="room-timer running" data-timer-start="${room.startTime}">00:00</span>`;
    } else if (room.startTime && room.endTime) {
      timerHtml = `<span class="room-timer">${formatDuration(room.endTime - room.startTime)}</span>`;
    } else {
      timerHtml = `<span class="room-timer">–</span>`;
    }

    card.innerHTML = `
      <div class="room-top">
        <div>
          <div class="room-number">${escapeHtml(room.number)}</div>
          <div class="room-badges">${badges.join("")}</div>
        </div>
        <button class="room-edit-btn" data-action="edit" title="Bearbeiten">✏️</button>
      </div>
      <div class="room-bottom">
        ${timerHtml}
        ${actionHtml}
      </div>
    `;
    list.appendChild(card);
  });

  updateFabVisibility();
}

function updateFabVisibility() {
  const locked = isDayLocked(state.currentDate);
  document.getElementById("btnAddRoom").classList.toggle("hidden", locked || state.activeTab !== "rooms");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Live timer tick ---------- */
function startTimerLoop() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    document.querySelectorAll(".room-timer.running").forEach(el => {
      const start = Number(el.dataset.timerStart);
      el.textContent = formatMMSS(Date.now() - start);
    });
  }, 1000);
}

/* ============================================================
   Room CRUD
   ============================================================ */
function findRoom(id) {
  return getRooms().find(r => r.id === id);
}

function roomNumberExistsOnDate(number, dateKey, excludeId) {
  return getRooms().some(r => r.date === dateKey && r.number === number && r.id !== excludeId);
}

function timeInputValue(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function timeInputToTimestamp(dateKey, timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  const [y, mo, da] = dateKey.split("-").map(Number);
  const d = new Date(y, mo - 1, da, parts[0] || 0, parts[1] || 0, parts[2] || 0);
  return d.getTime();
}

function openRoomModal(roomId = null) {
  state.editingRoomId = roomId;
  const modal = document.getElementById("roomModal");
  const title = document.getElementById("roomModalTitle");
  const numberInput = document.getElementById("inputRoomNumber");
  const statusInput = document.getElementById("inputStatus");
  const wwInput = document.getElementById("inputWW");
  const suiteInput = document.getElementById("inputIsSuite");
  const deleteBtn = document.getElementById("btnDeleteRoom");
  const startInput = document.getElementById("inputStartTime");
  const endInput = document.getElementById("inputEndTime");

  if (roomId) {
    const room = findRoom(roomId);
    title.textContent = "Zimmer bearbeiten";
    numberInput.value = room.number;
    statusInput.value = room.status;
    wwInput.checked = !!room.ww;
    suiteInput.checked = !!room.isSuite;
    if (startInput) startInput.value = timeInputValue(room.startTime);
    if (endInput) endInput.value = timeInputValue(room.endTime);
    deleteBtn.classList.remove("hidden");
  } else {
    title.textContent = "Zimmer hinzufügen";
    numberInput.value = "";
    statusInput.value = "blue";
    wwInput.checked = false;
    suiteInput.checked = false;
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
    deleteBtn.classList.add("hidden");
  }
  modal.classList.remove("hidden");
  numberInput.focus();
}

function closeRoomModal() {
  document.getElementById("roomModal").classList.add("hidden");
  state.editingRoomId = null;
}


function saveRoomFromModal() {
  const number = document.getElementById("inputRoomNumber").value.trim();
  const status = document.getElementById("inputStatus").value;
  const ww = document.getElementById("inputWW").checked;
  const isSuite = document.getElementById("inputIsSuite").checked;
  const startInput = document.getElementById("inputStartTime");
  const endInput = document.getElementById("inputEndTime");
  const startVal = startInput ? startInput.value : "";
  const endVal = endInput ? endInput.value : "";

  if (!number) {
    showToast("Bitte eine Zimmernummer eingeben.");
    return;
  }

  if (roomNumberExistsOnDate(number, state.currentDate, state.editingRoomId)) {
    showToast(`Zimmer ${number} ist für diesen Tag bereits eingetragen.`);
    return;
  }

  const rooms = getRooms();
  const newStartTime = startVal ? timeInputToTimestamp(state.currentDate, startVal) : null;
  const newEndTime = endVal ? timeInputToTimestamp(state.currentDate, endVal) : null;

  if (newStartTime && newEndTime && newEndTime < newStartTime) {
    showToast("Endzeit darf nicht vor der Startzeit liegen.");
    return;
  }

  if (state.editingRoomId) {
    const room = rooms.find(r => r.id === state.editingRoomId);
    room.number = number;
    room.status = status;
    room.ww = ww;
    room.isSuite = isSuite;
    if (isSuite && !room.suiteGroup) room.suiteGroup = uuid();
    if (!isSuite) room.suiteGroup = null;
    room.startTime = newStartTime;
    room.endTime = newEndTime;
  } else {
    rooms.push({
      id: uuid(),
      number,
      date: state.currentDate,
      status,
      ww,
      isSuite,
      suiteGroup: isSuite ? uuid() : null,
      startTime: newStartTime,
      endTime: newEndTime,
      createdAt: Date.now()
    });
  }

  setRooms(rooms);
  closeRoomModal();
  renderRoomList();
  showToast("Gespeichert.");
}

function deleteRoomFromModal() {
  if (!state.editingRoomId) return;
  const rooms = getRooms().filter(r => r.id !== state.editingRoomId);
  setRooms(rooms);
  closeRoomModal();
  renderRoomList();
  showToast("Zimmer gelöscht.");
}

function handleRoomAction(id, action) {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === id);
  if (!room) return;

  if (action === "edit") {
    openRoomModal(id);
    return;
  }

  if (isDayLocked(state.currentDate)) return;

  if (action === "start") {
    room.startTime = Date.now();
  } else if (action === "end") {
    room.endTime = Date.now();
  }
  setRooms(rooms);
  renderRoomList();
}

/* ============================================================
   REPORTS: Statistics engine
   ============================================================ */
function computeStatsForRooms(rooms) {
  const settings = getSettings();
  const completed = rooms.filter(r => r.startTime && r.endTime);

  const totalRooms = rooms.length;
  const totalCleaned = completed.length;
  const totalMs = completed.reduce((sum, r) => sum + (r.endTime - r.startTime), 0);
  const avgMs = totalCleaned > 0 ? totalMs / totalCleaned : 0;

  // Category breakdown
  const categories = {};
  STATUS_ORDER.forEach(key => {
    categories[key] = { count: 0, cleaned: 0, totalMs: 0 };
  });
  categories.ww = { count: 0, cleaned: 0, totalMs: 0 };

  rooms.forEach(r => {
    categories[r.status].count++;
    if (r.startTime && r.endTime) {
      categories[r.status].cleaned++;
      categories[r.status].totalMs += (r.endTime - r.startTime);
    }
    if (r.ww) {
      categories.ww.count++;
      if (r.startTime && r.endTime) {
        categories.ww.cleaned++;
        categories.ww.totalMs += (r.endTime - r.startTime);
      }
    }
  });

  // Income: normal rooms counted individually; suite rooms counted once per suiteGroup
  const seenSuiteGroups = new Set();
  let income = 0;
  let suiteCount = 0;
  let normalCount = 0;
  rooms.forEach(r => {
    if (r.isSuite) {
      const groupKey = r.suiteGroup || r.id;
      if (!seenSuiteGroups.has(groupKey)) {
        seenSuiteGroups.add(groupKey);
        income += settings.wageSuite;
        suiteCount++;
      }
    } else {
      income += settings.wageNormal;
      normalCount++;
    }
  });

  return {
    totalRooms, totalCleaned, totalMs, avgMs,
    categories, income, suiteCount, normalCount
  };
}

/* ============================================================
   Lightweight SVG Chart Helpers (no external library, offline-safe)
   ============================================================ */
function svgDonutChart(segments, opts = {}) {
  const size = opts.size || 160;
  const stroke = opts.stroke || 22;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let offset = 0;
  const arcs = segments.map(seg => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const rotation = (offset / total) * 360 - 90;
    offset += seg.value;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${gap}" transform="rotate(${rotation} ${cx} ${cy})" />`;
  }).join("");

  const centerLabel = opts.centerLabel || "";
  const centerSub = opts.centerSub || "";

  const legend = segments.map(seg => {
    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
    return `<div class="legend-item"><span class="legend-dot" style="background:${seg.color}"></span>${seg.label}: ${seg.value} (${pct}%)</div>`;
  }).join("");

  return `
    <div class="chart-row">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${stroke}" />
        ${arcs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="700" fill="#111827">${centerLabel}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="#6b7280">${centerSub}</text>
      </svg>
      <div class="chart-legend">${legend}</div>
    </div>
  `;
}

function svgStackedBar(segments, opts = {}) {
  const width = opts.width || 320;
  const height = opts.height || 34;
  const total = segments.reduce((s, seg) => s + Math.max(seg.value, 0), 0) || 1;
  let x = 0;
  const bars = segments.map(seg => {
    const w = (Math.max(seg.value, 0) / total) * width;
    const rect = `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${seg.color}"></rect>`;
    x += w;
    return rect;
  }).join("");

  const legend = segments.map(seg => {
    return `<div class="legend-item"><span class="legend-dot" style="background:${seg.color}"></span>${seg.label}: ${seg.display}</div>`;
  }).join("");

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="border-radius:8px;overflow:hidden;">
      ${bars}
    </svg>
    <div class="chart-legend" style="margin-top:8px;">${legend}</div>
  `;
}

function svgLineChart(series, labels, opts = {}) {
  const width = opts.width || 600;
  const height = opts.height || 180;
  const padding = { top: 16, right: 16, bottom: 26, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap(s => s.values);
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const n = labels.length;

  const xFor = i => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yFor = v => padding.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padding.top + innerH - f * innerH;
    const val = Math.round(maxVal * f);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9ca3af">${val}</text>`;
  }).join("");

  const xLabels = labels.map((lab, i) => {
    if (n > 10 && i % Math.ceil(n / 10) !== 0 && i !== n - 1) return "";
    return `<text x="${xFor(i)}" y="${height - 6}" text-anchor="middle" font-size="9" fill="#9ca3af">${lab}</text>`;
  }).join("");

  const paths = series.map(s => {
    const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
    const dots = s.values.map((v, i) => `<circle cx="${xFor(i)}" cy="${yFor(v)}" r="2.5" fill="${s.color}"/>`).join("");
    return `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("");

  const legend = series.map(s => `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label}</div>`).join("");

  return `
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      ${paths}
      ${xLabels}
    </svg>
    <div class="chart-legend">${legend}</div>
  `;
}

function renderCategoryTable(categories) {
  const rows = STATUS_ORDER.map(key => {
    const c = categories[key];
    const avg = c.cleaned > 0 ? c.totalMs / c.cleaned : 0;
    return `<tr>
      <td><span class="dot ${key}"></span>${STATUS_CONFIG[key].short}</td>
      <td>${c.count}</td>
      <td>${c.cleaned}</td>
      <td>${c.cleaned > 0 ? formatDuration(avg) : "–"}</td>
    </tr>`;
  }).join("");

  return `<table class="report-table">
    <thead><tr><th>Kategorie</th><th>Anzahl</th><th>Erledigt</th><th>Ø Zeit</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderWageTable(stats) {
  const settings = getSettings();
  const normalTotal = stats.normalCount * settings.wageNormal;
  const suiteTotal = stats.suiteCount * settings.wageSuite;
  return `<table class="report-table">
    <thead><tr><th>Verdienst-Kategorie</th><th>Anzahl</th><th>Lohn/Stück</th><th>Gesamt</th></tr></thead>
    <tbody>
      <tr>
        <td>Normale Zimmer</td>
        <td>${stats.normalCount}</td>
        <td>${settings.wageNormal.toFixed(2)} €</td>
        <td>${normalTotal.toFixed(2)} €</td>
      </tr>
      <tr>
        <td>Suiten (2 Zimmer)</td>
        <td>${stats.suiteCount}</td>
        <td>${settings.wageSuite.toFixed(2)} €</td>
        <td>${suiteTotal.toFixed(2)} €</td>
      </tr>
      <tr style="font-weight:700;">
        <td colspan="3">Gesamtverdienst</td>
        <td>${stats.income.toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>`;
}

function statBoxes(stats) {
  return `<div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${stats.totalCleaned}/${stats.totalRooms}</div><div class="stat-label">Zimmer erledigt</div></div>
    <div class="stat-box"><div class="stat-value">${formatDuration(stats.totalMs)}</div><div class="stat-label">Gesamtzeit</div></div>
    <div class="stat-box"><div class="stat-value">${stats.totalCleaned > 0 ? formatDuration(stats.avgMs) : "–"}</div><div class="stat-label">Ø Zeit / Zimmer</div></div>
    <div class="stat-box"><div class="stat-value">${stats.income.toFixed(2)} €</div><div class="stat-label">Verdienst</div></div>
  </div>`;
}

/* ---------- Day report ---------- */
function renderDayReport() {
  const rooms = getRoomsForDate(state.currentDate);
  const stats = computeStatsForRooms(rooms);
  const shift = getShiftForDate(state.currentDate);
  const kommen = shift?.kommen || null;
  const gehen = shift?.gehen || null;
  const attendanceMs = (kommen && gehen) ? (gehen - kommen) : null;
  const cleaningMs = stats.totalMs;
  const idleMs = (attendanceMs != null) ? Math.max(attendanceMs - cleaningMs, 0) : null;

  const colorDonut = svgDonutChart([
    { label: "Blau", value: stats.categories.blue.count, color: "#2563eb" },
    { label: "Rot", value: stats.categories.red.count, color: "#dc2626" },
    { label: "Gelb", value: stats.categories.yellow.count, color: "#ca8a04" }
  ], { centerLabel: String(stats.totalRooms), centerSub: "Zimmer" });

  const wageDonut = svgDonutChart([
    { label: "Normal", value: Number((stats.normalCount * getSettings().wageNormal).toFixed(2)), color: "#2563eb" },
    { label: "Suite", value: Number((stats.suiteCount * getSettings().wageSuite).toFixed(2)), color: "#7c3aed" }
  ], { centerLabel: stats.income.toFixed(2) + " €", centerSub: "Verdienst" });

  const timeBarHtml = (attendanceMs != null) ? svgStackedBar([
    { label: "Reinigung", value: cleaningMs, color: "#2563eb", display: formatDuration(cleaningMs) },
    { label: "Leerlauf/Pause", value: idleMs, color: "#f59e0b", display: formatDuration(idleMs) }
  ]) : `<p style="color:var(--muted);font-size:13px;">Kommen/Gehen noch nicht vollständig erfasst.</p>`;

  return `
    <div class="report-card">
      <h3>Tagesbericht – ${formatDateLabel(state.currentDate)}</h3>
      ${statBoxes(stats)}
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Reinigungszeit nach Farbe</h4>
      ${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Verdienst nach Zimmertyp</h4>
      ${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Anwesenheit vs. Reinigungszeit</h3>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-value">${attendanceMs != null ? formatDuration(attendanceMs) : "–"}</div><div class="stat-label">Anwesenheit im Hotel</div></div>
        <div class="stat-box"><div class="stat-value">${formatDuration(cleaningMs)}</div><div class="stat-label">Reine Reinigungszeit</div></div>
        <div class="stat-box"><div class="stat-value">${idleMs != null ? formatDuration(idleMs) : "–"}</div><div class="stat-label">Leerlauf-/Pausenzeit</div></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin:6px 0 12px;">
        Kommen: ${formatTime(kommen)} · Gehen: ${formatTime(gehen)}
      </div>
      <div class="chart-block">${timeBarHtml}</div>
    </div>
  `;
}

/* ---------- Month report ---------- */

function renderMonthReport() {
  const d = parseDateKey(state.currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthLabel = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const allRooms = getRooms().filter(r => {
    const rd = parseDateKey(r.date);
    return rd.getFullYear() === year && rd.getMonth() === month;
  });

  const stats = computeStatsForRooms(allRooms);

  // Daily breakdown
  const byDate = {};
  allRooms.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  const dateKeys = Object.keys(byDate).sort();
  const dailyRows = dateKeys.map(dk => {
    const s = computeStatsForRooms(byDate[dk]);
    return `<tr class="clickable-row" data-navigate-date="${dk}">
      <td>${parseDateKey(dk).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</td>
      <td>${s.totalCleaned}/${s.totalRooms}</td>
      <td>${formatDuration(s.totalMs)}</td>
      <td>${s.income.toFixed(2)} €</td>
      <td>✏️</td>
    </tr>`;
  }).join("");

  const colorDonut = svgDonutChart([
    { label: "Blau", value: stats.categories.blue.count, color: "#2563eb" },
    { label: "Rot", value: stats.categories.red.count, color: "#dc2626" },
    { label: "Gelb", value: stats.categories.yellow.count, color: "#ca8a04" }
  ], { centerLabel: String(stats.totalRooms), centerSub: "Zimmer" });

  const wageDonut = svgDonutChart([
    { label: "Normal", value: Number((stats.normalCount * getSettings().wageNormal).toFixed(2)), color: "#2563eb" },
    { label: "Suite", value: Number((stats.suiteCount * getSettings().wageSuite).toFixed(2)), color: "#7c3aed" }
  ], { centerLabel: stats.income.toFixed(2) + " €", centerSub: "Verdienst" });

  const dailyIncomeChart = dateKeys.length > 0 ? svgLineChart(
    [{ label: "Verdienst (€)", color: "#16a34a", values: dateKeys.map(dk => Number(computeStatsForRooms(byDate[dk]).income.toFixed(2))) }],
    dateKeys.map(dk => parseDateKey(dk).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }))
  ) : `<p style="color:var(--muted);font-size:13px;">Keine Daten für ein Diagramm vorhanden.</p>`;

  const dailyRoomsChart = dateKeys.length > 0 ? svgLineChart(
    [{ label: "Gereinigte Zimmer", color: "#2563eb", values: dateKeys.map(dk => computeStatsForRooms(byDate[dk]).totalCleaned) }],
    dateKeys.map(dk => parseDateKey(dk).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }))
  ) : "";

  return `
    <div class="report-card">
      <h3>Monatsbericht – ${monthLabel}</h3>
      ${statBoxes(stats)}
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Reinigungszeit nach Farbe</h4>
      ${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Verdienst nach Zimmertyp</h4>
      ${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Verlauf im Monat</h3>
      <h4 style="margin:0 0 6px;font-size:14px;color:var(--muted);">Täglicher Verdienst</h4>
      <div class="chart-block">${dailyIncomeChart}</div>
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Gereinigte Zimmer pro Tag</h4>
      <div class="chart-block">${dailyRoomsChart}</div>
    </div>
    <div class="report-card">
      <h3>Tägliche Übersicht</h3>
      <p style="font-size:12px;color:var(--muted);margin-top:-6px;margin-bottom:10px;">Auf einen Tag tippen, um die Zimmer dieses Tages zu bearbeiten.</p>
      ${dateKeys.length === 0 ? '<p style="color:var(--muted);font-size:14px;">Keine Daten in diesem Monat.</p>' : `
      <table class="report-table">
        <thead><tr><th>Datum</th><th>Zimmer</th><th>Zeit</th><th>Verdienst</th><th></th></tr></thead>
        <tbody>${dailyRows}</tbody>
      </table>`}
    </div>
  `;
}

/* ---------- Year report ---------- */

function renderYearReport() {
  const d = parseDateKey(state.currentDate);
  const year = d.getFullYear();

  const allRooms = getRooms().filter(r => parseDateKey(r.date).getFullYear() === year);
  const stats = computeStatsForRooms(allRooms);

  const byMonth = {};
  allRooms.forEach(r => {
    const m = parseDateKey(r.date).getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
  });

  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const monthKeysSorted = Object.keys(byMonth).sort((a, b) => a - b);
  const monthRows = monthKeysSorted.map(m => {
    const s = computeStatsForRooms(byMonth[m]);
    const monthKey = `${year}-${String(Number(m) + 1).padStart(2, "0")}`;
    return `<tr class="clickable-row" data-navigate-month="${monthKey}">
      <td>${monthNames[m]}</td>
      <td>${s.totalCleaned}/${s.totalRooms}</td>
      <td>${formatDuration(s.totalMs)}</td>
      <td>${s.income.toFixed(2)} €</td>
      <td>✏️</td>
    </tr>`;
  }).join("");

  const colorDonut = svgDonutChart([
    { label: "Blau", value: stats.categories.blue.count, color: "#2563eb" },
    { label: "Rot", value: stats.categories.red.count, color: "#dc2626" },
    { label: "Gelb", value: stats.categories.yellow.count, color: "#ca8a04" }
  ], { centerLabel: String(stats.totalRooms), centerSub: "Zimmer" });

  const wageDonut = svgDonutChart([
    { label: "Normal", value: Number((stats.normalCount * getSettings().wageNormal).toFixed(2)), color: "#2563eb" },
    { label: "Suite", value: Number((stats.suiteCount * getSettings().wageSuite).toFixed(2)), color: "#7c3aed" }
  ], { centerLabel: stats.income.toFixed(2) + " €", centerSub: "Verdienst" });

  const monthlyIncomeChart = monthKeysSorted.length > 0 ? svgLineChart(
    [{ label: "Verdienst (€)", color: "#16a34a", values: monthKeysSorted.map(m => Number(computeStatsForRooms(byMonth[m]).income.toFixed(2))) }],
    monthKeysSorted.map(m => monthNames[m])
  ) : `<p style="color:var(--muted);font-size:13px;">Keine Daten für ein Diagramm vorhanden.</p>`;

  const monthlyRoomsChart = monthKeysSorted.length > 0 ? svgLineChart(
    [{ label: "Gereinigte Zimmer", color: "#2563eb", values: monthKeysSorted.map(m => computeStatsForRooms(byMonth[m]).totalCleaned) }],
    monthKeysSorted.map(m => monthNames[m])
  ) : "";

  return `
    <div class="report-card">
      <h3>Jahresbericht – ${year}</h3>
      ${statBoxes(stats)}
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Reinigungszeit nach Farbe</h4>
      ${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Verdienst nach Zimmertyp</h4>
      ${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Verlauf im Jahr</h3>
      <h4 style="margin:0 0 6px;font-size:14px;color:var(--muted);">Monatlicher Verdienst</h4>
      <div class="chart-block">${monthlyIncomeChart}</div>
      <h4 style="margin:14px 0 6px;font-size:14px;color:var(--muted);">Gereinigte Zimmer pro Monat</h4>
      <div class="chart-block">${monthlyRoomsChart}</div>
    </div>
    <div class="report-card">
      <h3>Monatliche Übersicht</h3>
      <p style="font-size:12px;color:var(--muted);margin-top:-6px;margin-bottom:10px;">Auf einen Monat tippen, um dessen Tage einzeln zu sehen und zu bearbeiten.</p>
      ${monthRows === "" ? '<p style="color:var(--muted);font-size:14px;">Keine Daten in diesem Jahr.</p>' : `
      <table class="report-table">
        <thead><tr><th>Monat</th><th>Zimmer</th><th>Zeit</th><th>Verdienst</th><th></th></tr></thead>
        <tbody>${monthRows}</tbody>
      </table>`}
    </div>
  `;
}

/* ============================================================
   Tab switching
   ============================================================ */

function renderTab() {
  const roomsSection = document.querySelector(".rooms-section");
  const shiftCard = document.getElementById("shiftCard");
  const reportView = document.getElementById("reportView");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
  });

  if (state.activeTab === "rooms") {
    roomsSection.classList.remove("hidden");
    shiftCard.classList.remove("hidden");
    reportView.classList.add("hidden");
    renderRoomList();
  } else {
    roomsSection.classList.add("hidden");
    shiftCard.classList.add("hidden");
    reportView.classList.remove("hidden");
    if (state.activeTab === "day") reportView.innerHTML = renderDayReport();
    if (state.activeTab === "month") reportView.innerHTML = renderMonthReport();
    if (state.activeTab === "year") reportView.innerHTML = renderYearReport();
  }
  updateFabVisibility();
}

/* ============================================================
   Settings modal
   ============================================================ */
function openSettingsModal() {
  const s = getSettings();
  document.getElementById("inputWageNormal").value = s.wageNormal;
  document.getElementById("inputWageSuite").value = s.wageSuite;
  document.getElementById("settingsModal").classList.remove("hidden");
}
function closeSettingsModal() {
  document.getElementById("settingsModal").classList.add("hidden");
}
function saveSettingsFromModal() {
  const wageNormal = parseFloat(document.getElementById("inputWageNormal").value) || 0;
  const wageSuite = parseFloat(document.getElementById("inputWageSuite").value) || 0;
  setSettings({ wageNormal, wageSuite });
  closeSettingsModal();
  renderTab();
  showToast("Einstellungen gespeichert.");
}

/* ---------- Export / Import ---------- */
function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    rooms: getRooms(),
    shifts: getShifts(),
    locks: getLocks(),
    settings: getSettings()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reinigungsplaner-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Daten exportiert.");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.rooms) setRooms(data.rooms);
      if (data.shifts) setShifts(data.shifts);
      if (data.locks) setLocks(data.locks);
      if (data.settings) setSettings(data.settings);
      showToast("Daten erfolgreich importiert.");
      renderAll();
    } catch (err) {
      showToast("Fehler beim Importieren der Datei.");
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   Global render
   ============================================================ */
function renderAll() {
  renderHeader();
  renderShift();
  renderTab();
}

/* ============================================================
   Event bindings
   ============================================================ */
function bindEvents() {
  document.getElementById("btnPrevDay").addEventListener("click", () => {
    state.currentDate = shiftDate(state.currentDate, -1);
    renderAll();
  });
  document.getElementById("btnNextDay").addEventListener("click", () => {
    state.currentDate = shiftDate(state.currentDate, 1);
    renderAll();
  });
  document.getElementById("btnToday").addEventListener("click", () => {
    state.currentDate = todayStr();
    renderAll();
  });

  document.getElementById("btnLock").addEventListener("click", () => {
    const locked = isDayLocked(state.currentDate);
    if (locked) {
      setDayLocked(state.currentDate, false);
      showToast("Tag entsperrt.");
    } else {
      if (confirm("Diesen Tag für Bearbeitung sperren?")) {
        setDayLocked(state.currentDate, true);
        showToast("Tag gesperrt.");
      } else {
        return;
      }
    }
    renderAll();
  });

  document.getElementById("btnUnlock").addEventListener("click", () => {
    setDayLocked(state.currentDate, false);
    showToast("Bearbeitung entsperrt.");
    renderAll();
  });

  document.getElementById("btnAddRoom").addEventListener("click", () => openRoomModal());
  document.getElementById("btnCancelRoom").addEventListener("click", closeRoomModal);
  document.getElementById("btnSaveRoom").addEventListener("click", saveRoomFromModal);
  document.getElementById("btnDeleteRoom").addEventListener("click", () => {
    if (confirm("Dieses Zimmer wirklich löschen?")) deleteRoomFromModal();
  });
  document.getElementById("roomList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = e.target.closest(".room-card");
    const id = card.dataset.id;
    handleRoomAction(id, btn.dataset.action);
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  document.getElementById("reportView").addEventListener("click", (e) => {
    const dayRow = e.target.closest("[data-navigate-date]");
    if (dayRow) {
      state.currentDate = dayRow.dataset.navigateDate;
      state.activeTab = "rooms";
      renderAll();
      return;
    }
    const monthRow = e.target.closest("[data-navigate-month]");
    if (monthRow) {
      const [y, m] = monthRow.dataset.navigateMonth.split("-").map(Number);
      state.currentDate = formatDateKey(new Date(y, m - 1, 1));
      state.activeTab = "month";
      renderAll();
      return;
    }
  });

  document.getElementById("btnKommen").addEventListener("click", () => {
    saveShift(state.currentDate, { kommen: Date.now() });
    renderShift();
  });
  document.getElementById("btnGehen").addEventListener("click", () => {
    saveShift(state.currentDate, { gehen: Date.now() });
    renderShift();
  });
  document.getElementById("btnEditShift").addEventListener("click", openShiftModal);
  document.getElementById("btnCancelShift").addEventListener("click", closeShiftModal);
  document.getElementById("btnSaveShift").addEventListener("click", saveShiftFromModal);

  document.getElementById("btnSettings").addEventListener("click", openSettingsModal);
  document.getElementById("btnCloseSettings").addEventListener("click", closeSettingsModal);
  document.getElementById("btnSaveSettings").addEventListener("click", saveSettingsFromModal);
  document.getElementById("btnExportData").addEventListener("click", exportData);
  document.getElementById("inputImportFile").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      if (confirm("Vorhandene Daten werden mit der importierten Datei überschrieben. Fortfahren?")) {
        importData(e.target.files[0]);
      }
      e.target.value = "";
    }
  });

  // Close modals on backdrop click
  [document.getElementById("roomModal"), document.getElementById("settingsModal"), document.getElementById("shiftModal")].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  // Ensure default settings exist on first run
  if (!localStorage.getItem(STORE_KEYS.settings)) {
    setSettings({ ...DEFAULT_SETTINGS });
  }
  bindEvents();
  renderAll();
  startTimerLoop();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
