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

const DEFAULT_SETTINGS = { wageNormal: 5.0, wageSuite: 6.5 };

const STATUS_CONFIG = {
  blue:   { label: "Abreise – neu vermietet", short: "Blau", cssClass: "status-blue" },
  red:    { label: "Abreise – nicht vermietet", short: "Rot", cssClass: "status-red" },
  yellow: { label: "Bleibt (Aufenthalt)", short: "Gelb", cssClass: "status-yellow" }
};
const STATUS_ORDER = ["blue", "red", "yellow"];

let state = { currentDate: todayStr(), activeTab: "rooms", editingRoomId: null, timerInterval: null };

function loadAll(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function saveAll(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function getRooms() { return loadAll(STORE_KEYS.rooms, []); }
function setRooms(rooms) { saveAll(STORE_KEYS.rooms, rooms); }
function getShifts() { return loadAll(STORE_KEYS.shifts, []); }
function setShifts(shifts) { saveAll(STORE_KEYS.shifts, shifts); }
function getLocks() { return loadAll(STORE_KEYS.locks, []); }
function setLocks(locks) { saveAll(STORE_KEYS.locks, locks); }
function getSettings() { return loadAll(STORE_KEYS.settings, { ...DEFAULT_SETTINGS }); }
function setSettings(s) { saveAll(STORE_KEYS.settings, s); }

function todayStr() { const d = new Date(); return formatDateKey(d); }
function formatDateKey(d) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDateKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function shiftDate(key, days) { const d = parseDateKey(key); d.setDate(d.getDate() + days); return formatDateKey(d); }
function formatDateLabel(key) {
  const d = parseDateKey(key);
  const opts = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  let label = d.toLocaleDateString("de-DE", opts);
  if (key === todayStr()) label = "Heute · " + label;
  return label;
}
function formatTime(ts) { if (!ts) return "–"; const d = new Date(ts); return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
function formatDuration(ms) {
  if (ms == null || ms < 0) return "–";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60;
  if (h > 0) return `${h} Std ${m} Min`;
  return `${m} Min`;
}
function uuid() { return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9); }
function timeInputValue(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}
function timeInputToTimestamp(dateKey, timeStr) {
  const parts = timeStr.split(":").map(Number);
  const [h, m, s] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  const d = parseDateKey(dateKey);
  d.setHours(h, m, s, 0);
  return d.getTime();
}

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

let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2500);
}

/* ============================================================
   Google Drive Integration via zentralem Apps-Script-Webhook
   + Versand an beliebige E-Mail-Adresse(n)
   ============================================================ */
const GDRIVE_STORE_KEY = "cleaning_planner_gdrive_v3";
function getGDriveSettings() { return loadAll(GDRIVE_STORE_KEY, { enabled: false, webhookUrl: "", employeeName: "", recipientEmail: "" }); }
function setGDriveSettings(s) { saveAll(GDRIVE_STORE_KEY, s); }
function updateGDriveStatusUI(text) { const el = document.getElementById("gdriveStatus"); if (el) el.textContent = text; }

function buildRoomReportPayload(room) {
  const settings = getSettings();
  const gs = getGDriveSettings();
  const wage = room.isSuite ? settings.wageSuite : settings.wageNormal;
  const durationMs = (room.startTime && room.endTime) ? (room.endTime - room.startTime) : null;

  const textLines = [
    `Reinigungsplaner – Zimmerbericht`,
    `Mitarbeiter: ${gs.employeeName || "-"}`,
    `Datum: ${room.date}`,
    `Zimmernummer: ${room.number}`,
    `Status: ${STATUS_CONFIG[room.status] ? STATUS_CONFIG[room.status].short : room.status}`,
    `WW (Wäschewechsel): ${room.ww ? "Ja" : "Nein"}`,
    `Suite: ${room.isSuite ? "Ja" : "Nein"}`,
    `Startzeit: ${room.startTime ? formatTime(room.startTime) : "-"}`,
    `Endzeit: ${room.endTime ? formatTime(room.endTime) : "-"}`,
    `Dauer: ${durationMs != null ? formatDuration(durationMs) : "-"}`,
    `Lohn: ${wage.toFixed(2)} €`,
    `Erstellt am: ${new Date().toLocaleString("de-DE")}`
  ];

  return {
    employeeName: gs.employeeName || "Unbekannt",
    recipientEmail: gs.recipientEmail || "",
    date: room.date, roomNumber: room.number, status: room.status, ww: room.ww, isSuite: room.isSuite,
    startTime: room.startTime, endTime: room.endTime, durationMs: durationMs, wage: wage,
    reportText: textLines.join("\n"),
    fileName: `Zimmer_${room.number}_${room.date}_${(gs.employeeName || "Mitarbeiter").replace(/\s+/g, "_")}_${Date.now()}.txt`
  };
}

function uploadRoomReportToGDrive(room) {
  const settings = getGDriveSettings();
  if (!settings.enabled) return;
  if (!settings.webhookUrl) { showToast("Bitte zuerst die Webhook-URL in den Einstellungen eintragen."); return; }
  const payload = buildRoomReportPayload(room);
  fetch(settings.webhookUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
    .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); return res.text().catch(() => ""); })
    .then(() => { showToast(`Zimmer ${room.number}: Bericht wurde gesendet.`); updateGDriveStatusUI("Zuletzt gesendet: " + new Date().toLocaleTimeString("de-DE")); })
    .catch((err) => { showToast("Senden fehlgeschlagen: " + err.message); updateGDriveStatusUI("Fehler beim letzten Senden."); });
}

function testGDriveConnection() {
  const settings = getGDriveSettings();
  if (!settings.webhookUrl) { showToast("Bitte zuerst die Webhook-URL eingeben."); return; }
  const testPayload = {
    employeeName: settings.employeeName || "Test", recipientEmail: settings.recipientEmail || "",
    date: todayStr(), roomNumber: "TEST", status: "blue", ww: false, isSuite: false,
    startTime: Date.now() - 60000, endTime: Date.now(), durationMs: 60000, wage: 0,
    reportText: `Testverbindung vom Reinigungsplaner\nMitarbeiter: ${settings.employeeName || "-"}\nGesendet am: ${new Date().toLocaleString("de-DE")}`,
    fileName: `Test_${Date.now()}.txt`
  };
  updateGDriveStatusUI("Sende Test…");
  fetch(settings.webhookUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(testPayload) })
    .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); updateGDriveStatusUI("Test erfolgreich gesendet ✓ (" + new Date().toLocaleTimeString("de-DE") + ")"); showToast("Testverbindung erfolgreich."); })
    .catch(err => { updateGDriveStatusUI("Test fehlgeschlagen: " + err.message); showToast("Testverbindung fehlgeschlagen."); });
}

function renderHeader() {
  document.getElementById("currentDateLabel").textContent = formatDateLabel(state.currentDate);
  const locked = isDayLocked(state.currentDate);
  document.getElementById("btnLock").textContent = locked ? "🔒" : "🔓";
  const banner = document.getElementById("lockBanner");
  banner.classList.toggle("hidden", !locked);
  document.getElementById("btnAddRoom").classList.toggle("hidden", locked || state.activeTab !== "rooms");
}

function getShiftForDate(dateKey) { const shifts = getShifts(); return shifts.find(s => s.date === dateKey) || null; }
function saveShift(dateKey, patch) {
  const shifts = getShifts();
  let entry = shifts.find(s => s.date === dateKey);
  if (!entry) { entry = { date: dateKey, kommen: null, gehen: null }; shifts.push(entry); }
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
  if (!kommen) info.textContent = "Noch nicht eingestempelt.";
  else if (kommen && !gehen) info.textContent = `Kommen: ${formatTime(kommen)} · Schicht läuft…`;
  else info.textContent = `Kommen: ${formatTime(kommen)} · Gehen: ${formatTime(gehen)} · Dauer: ${formatDuration(gehen - kommen)}`;
}
function openShiftModal() {
  const shift = getShiftForDate(state.currentDate);
  document.getElementById("inputKommenTime").value = timeInputValue(shift?.kommen);
  document.getElementById("inputGehenTime").value = timeInputValue(shift?.gehen);
  document.getElementById("shiftModal").classList.remove("hidden");
}
function closeShiftModal() { document.getElementById("shiftModal").classList.add("hidden"); }
function saveShiftFromModal() {
  const kommenVal = document.getElementById("inputKommenTime").value.trim();
  const gehenVal = document.getElementById("inputGehenTime").value.trim();
  const kommenTs = kommenVal ? timeInputToTimestamp(state.currentDate, kommenVal) : null;
  const gehenTs = gehenVal ? timeInputToTimestamp(state.currentDate, gehenVal) : null;
  if (kommenTs && gehenTs && gehenTs < kommenTs) { showToast("Gehen darf nicht vor Kommen liegen."); return; }
  saveShift(state.currentDate, { kommen: kommenTs, gehen: gehenTs });
  closeShiftModal(); renderAll(); showToast("Arbeitszeit gespeichert.");
}

function getRoomsForDate(dateKey) { return getRooms().filter(r => r.date === dateKey); }
function roomNumberExistsOnDate(number, dateKey, excludeId) {
  return getRooms().some(r => r.date === dateKey && r.number === number && r.id !== excludeId);
}
function sortRooms(rooms) {
  return [...rooms].sort((a, b) => {
    const oa = STATUS_ORDER.indexOf(a.status); const ob = STATUS_ORDER.indexOf(b.status);
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
  if (rooms.length === 0) empty.classList.remove("hidden"); else empty.classList.add("hidden");

  rooms.forEach(room => {
    const card = document.createElement("div");
    card.className = `room-card ${STATUS_CONFIG[room.status].cssClass}`;
    card.dataset.id = room.id;

    const badges = [];
    if (room.isSuite) badges.push("Suite");
    if (room.ww) badges.push("WW");
    badges.push(STATUS_CONFIG[room.status].short);

    let actionHtml = "";
    if (!room.startTime) actionHtml = `<button class="action-btn action-start" data-action="start">Start</button>`;
    else if (room.startTime && !room.endTime) actionHtml = `<button class="action-btn action-end" data-action="end">Ende</button>`;
    else actionHtml = `<span class="badge">Fertig</span>`;

    let timerHtml = "";
    if (room.startTime && !room.endTime) timerHtml = "läuft…";
    else if (room.startTime && room.endTime) timerHtml = formatDuration(room.endTime - room.startTime);
    else timerHtml = "–";

    card.innerHTML = `
      <div>
        <div class="room-number">${room.number}</div>
        <div class="room-badges">${badges.map(b => `<span class="badge">${b}</span>`).join("")}</div>
        <div class="room-timer">${timerHtml}</div>
      </div>
      <div class="room-actions">
        <button class="edit-icon" data-action="edit">✏️</button>
        ${locked ? "" : actionHtml}
      </div>
    `;
    list.appendChild(card);
  });
}

function handleRoomAction(id, action) {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  if (action === "edit") { openRoomModal(id); return; }
  if (isDayLocked(state.currentDate)) return;
  if (action === "start") room.startTime = Date.now();
  else if (action === "end") room.endTime = Date.now();
  setRooms(rooms);
  renderRoomList();
  if (action === "end") uploadRoomReportToGDrive(room);
}

function openRoomModal(id) {
  state.editingRoomId = id || null;
  const title = document.getElementById("roomModalTitle");
  const delBtn = document.getElementById("btnDeleteRoom");
  if (id) {
    const room = getRooms().find(r => r.id === id);
    if (!room) return;
    title.textContent = `Zimmer ${room.number} bearbeiten`;
    document.getElementById("inputRoomNumber").value = room.number;
    document.getElementById("inputStatus").value = room.status;
    document.getElementById("inputWW").checked = room.ww;
    document.getElementById("inputIsSuite").checked = room.isSuite;
    document.getElementById("inputStartTime").value = timeInputValue(room.startTime);
    document.getElementById("inputEndTime").value = timeInputValue(room.endTime);
    delBtn.classList.remove("hidden");
  } else {
    title.textContent = "Zimmer hinzufügen";
    document.getElementById("inputRoomNumber").value = "";
    document.getElementById("inputStatus").value = "blue";
    document.getElementById("inputWW").checked = false;
    document.getElementById("inputIsSuite").checked = false;
    document.getElementById("inputStartTime").value = "";
    document.getElementById("inputEndTime").value = "";
    delBtn.classList.add("hidden");
  }
  document.getElementById("roomModal").classList.remove("hidden");
}
function closeRoomModal() { document.getElementById("roomModal").classList.add("hidden"); state.editingRoomId = null; }
function saveRoomFromModal() {
  const number = document.getElementById("inputRoomNumber").value.trim();
  const status = document.getElementById("inputStatus").value;
  const ww = document.getElementById("inputWW").checked;
  const isSuite = document.getElementById("inputIsSuite").checked;
  const startVal = document.getElementById("inputStartTime").value.trim();
  const endVal = document.getElementById("inputEndTime").value.trim();

  if (!number) { showToast("Bitte eine Zimmernummer eingeben."); return; }
  if (roomNumberExistsOnDate(number, state.currentDate, state.editingRoomId)) { showToast(`Zimmer ${number} ist für diesen Tag bereits eingetragen.`); return; }

  const rooms = getRooms();
  const newStartTime = startVal ? timeInputToTimestamp(state.currentDate, startVal) : null;
  const newEndTime = endVal ? timeInputToTimestamp(state.currentDate, endVal) : null;
  if (newStartTime && newEndTime && newEndTime < newStartTime) { showToast("Endzeit darf nicht vor der Startzeit liegen."); return; }

  let savedRoom = null;
  const wasFinishedBefore = state.editingRoomId ? (() => { const r = rooms.find(r => r.id === state.editingRoomId); return r && r.startTime && r.endTime; })() : false;

  if (state.editingRoomId) {
    const room = rooms.find(r => r.id === state.editingRoomId);
    room.number = number; room.status = status; room.ww = ww; room.isSuite = isSuite;
    room.startTime = newStartTime; room.endTime = newEndTime;
    savedRoom = room;
  } else {
    savedRoom = { id: uuid(), number, date: state.currentDate, status, ww, isSuite, startTime: newStartTime, endTime: newEndTime, createdAt: Date.now() };
    rooms.push(savedRoom);
  }

  setRooms(rooms);
  closeRoomModal();
  renderRoomList();
  showToast("Zimmer gespeichert.");

  const isFinishedNow = savedRoom.startTime && savedRoom.endTime;
  if (isFinishedNow && !wasFinishedBefore) uploadRoomReportToGDrive(savedRoom);
}
function deleteRoomFromModal() {
  if (!state.editingRoomId) return;
  const rooms = getRooms().filter(r => r.id !== state.editingRoomId);
  setRooms(rooms);
  closeRoomModal();
  renderRoomList();
  showToast("Zimmer gelöscht.");
}

function svgDonutChart(segments, opts = {}) {
  const size = opts.size || 160; const stroke = opts.stroke || 22;
  const r = (size - stroke) / 2; const cx = size / 2; const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  const arcs = segments.map(seg => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dash = fraction * circumference; const gap = circumference - dash;
    const rotation = (offset / total) * 360 - 90;
    offset += seg.value;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}" transform="rotate(${rotation} ${cx} ${cy})" />`;
  }).join("");
  const centerLabel = opts.centerLabel || ""; const centerSub = opts.centerSub || "";
  const legend = segments.map(seg => {
    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
    return `<div class="legend-item"><span class="legend-dot" style="background:${seg.color}"></span>${seg.label}: ${seg.value} (${pct}%)</div>`;
  }).join("");
  return `<div class="chart-row"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${stroke}" />
    ${arcs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="700" fill="#111827">${centerLabel}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="#6b7280">${centerSub}</text>
  </svg><div class="chart-legend">${legend}</div></div>`;
}
function svgStackedBar(segments, opts = {}) {
  const width = opts.width || 320; const height = opts.height || 34;
  const total = segments.reduce((s, seg) => s + Math.max(seg.value, 0), 0) || 1;
  let x = 0;
  const bars = segments.map(seg => {
    const w = (Math.max(seg.value, 0) / total) * width;
    const rect = `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${seg.color}"></rect>`;
    x += w; return rect;
  }).join("");
  const legend = segments.map(seg => `<div class="legend-item"><span class="legend-dot" style="background:${seg.color}"></span>${seg.label}: ${seg.display}</div>`).join("");
  return `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="border-radius:8px;overflow:hidden;">${bars}</svg><div class="chart-legend" style="margin-top:8px;">${legend}</div>`;
}
function svgLineChart(series, labels, opts = {}) {
  const width = opts.width || 600; const height = opts.height || 180;
  const padding = { top: 16, right: 16, bottom: 26, left: 40 };
  const innerW = width - padding.left - padding.right; const innerH = height - padding.top - padding.bottom;
  const allValues = series.flatMap(s => s.values);
  const maxVal = Math.max(...allValues, 1); const minVal = 0; const n = labels.length;
  const xFor = i => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yFor = v => padding.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padding.top + innerH - f * innerH; const val = Math.round(maxVal * f);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/><text x="${padding.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9ca3af">${val}</text>`;
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
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${gridLines}${paths}${xLabels}</svg><div class="chart-legend">${legend}</div>`;
}

function computeStatsForRooms(rooms) {
  const settings = getSettings();
  const completed = rooms.filter(r => r.startTime && r.endTime);
  const categories = { blue: { count: 0, ms: 0, completedCount: 0 }, red: { count: 0, ms: 0, completedCount: 0 }, yellow: { count: 0, ms: 0, completedCount: 0 } };
  rooms.forEach(r => {
    const cat = categories[r.status]; if (!cat) return;
    cat.count += 1;
    if (r.startTime && r.endTime) { cat.ms += (r.endTime - r.startTime); cat.completedCount += 1; }
  });
  const normalCount = rooms.filter(r => !r.isSuite).length;
  const suiteCount = rooms.filter(r => r.isSuite).length;
  const income = normalCount * settings.wageNormal + suiteCount * settings.wageSuite;
  const totalMs = completed.reduce((sum, r) => sum + (r.endTime - r.startTime), 0);
  return { totalRooms: rooms.length, totalCleaned: completed.length, totalMs, categories, normalCount, suiteCount, income };
}
function statBoxes(stats) {
  return `<div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${stats.totalCleaned}/${stats.totalRooms}</div><div class="stat-label">Zimmer erledigt</div></div>
    <div class="stat-box"><div class="stat-value">${formatDuration(stats.totalMs)}</div><div class="stat-label">Reinigungszeit</div></div>
    <div class="stat-box"><div class="stat-value">${stats.income.toFixed(2)} €</div><div class="stat-label">Verdienst</div></div>
  </div>`;
}
function renderCategoryTable(categories) {
  const rows = STATUS_ORDER.map(key => {
    const cat = categories[key]; const avgMs = cat.completedCount > 0 ? cat.ms / cat.completedCount : null;
    return `<tr><td>${STATUS_CONFIG[key].short}</td><td>${cat.count}</td><td>${cat.completedCount}</td><td>${avgMs != null ? formatDuration(avgMs) : "–"}</td></tr>`;
  }).join("");
  return `<table class="report-table"><thead><tr><th>Kategorie</th><th>Anzahl</th><th>Erledigt</th><th>Ø Zeit</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderWageTable(stats) {
  const settings = getSettings();
  const normalTotal = stats.normalCount * settings.wageNormal;
  const suiteTotal = stats.suiteCount * settings.wageSuite;
  return `<table class="report-table"><thead><tr><th>Verdienst-Kategorie</th><th>Anzahl</th><th>Lohn/Stück</th><th>Gesamt</th></tr></thead><tbody>
    <tr><td>Normale Zimmer</td><td>${stats.normalCount}</td><td>${settings.wageNormal.toFixed(2)} €</td><td>${normalTotal.toFixed(2)} €</td></tr>
    <tr><td>Suiten (2 Zimmer)</td><td>${stats.suiteCount}</td><td>${settings.wageSuite.toFixed(2)} €</td><td>${suiteTotal.toFixed(2)} €</td></tr>
    <tr><td><strong>Gesamtverdienst</strong></td><td></td><td></td><td><strong>${stats.income.toFixed(2)} €</strong></td></tr>
  </tbody></table>`;
}

function renderDayReport() {
  const rooms = getRoomsForDate(state.currentDate);
  const stats = computeStatsForRooms(rooms);
  const shift = getShiftForDate(state.currentDate);
  const kommen = shift?.kommen || null; const gehen = shift?.gehen || null;
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

  return `<div class="report-card">
      <h3>Tagesbericht – ${formatDateLabel(state.currentDate)}</h3>
      ${statBoxes(stats)}
      <h4>Reinigungszeit nach Farbe</h4>${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4>Verdienst nach Zimmertyp</h4>${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Anwesenheit vs. Reinigungszeit</h3>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-value">${attendanceMs != null ? formatDuration(attendanceMs) : "–"}</div><div class="stat-label">Anwesenheit im Hotel</div></div>
        <div class="stat-box"><div class="stat-value">${formatDuration(cleaningMs)}</div><div class="stat-label">Reine Reinigungszeit</div></div>
        <div class="stat-box"><div class="stat-value">${idleMs != null ? formatDuration(idleMs) : "–"}</div><div class="stat-label">Leerlauf-/Pausenzeit</div></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin:6px 0 12px;">Kommen: ${formatTime(kommen)} · Gehen: ${formatTime(gehen)}</div>
      <div class="chart-block">${timeBarHtml}</div>
    </div>`;
}

function renderMonthReport() {
  const d = parseDateKey(state.currentDate); const year = d.getFullYear(); const month = d.getMonth();
  const monthLabel = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const allRooms = getRooms().filter(r => { const rd = parseDateKey(r.date); return rd.getFullYear() === year && rd.getMonth() === month; });
  const stats = computeStatsForRooms(allRooms);
  const byDate = {};
  allRooms.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });
  const dateKeys = Object.keys(byDate).sort();
  const dailyRows = dateKeys.map(dk => {
    const s = computeStatsForRooms(byDate[dk]);
    return `<tr class="clickable-row" data-navigate-date="${dk}"><td>${parseDateKey(dk).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</td><td>${s.totalCleaned}/${s.totalRooms}</td><td>${formatDuration(s.totalMs)}</td><td>${s.income.toFixed(2)} €</td><td>✏️</td></tr>`;
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

  return `<div class="report-card">
      <h3>Monatsbericht – ${monthLabel}</h3>
      ${statBoxes(stats)}
      <h4>Reinigungszeit nach Farbe</h4>${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4>Verdienst nach Zimmertyp</h4>${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Verlauf im Monat</h3>
      <h4>Täglicher Verdienst</h4><div class="chart-block">${dailyIncomeChart}</div>
      <h4>Gereinigte Zimmer pro Tag</h4><div class="chart-block">${dailyRoomsChart}</div>
    </div>
    <div class="report-card">
      <h3>Tägliche Übersicht</h3>
      <p style="font-size:12px;color:var(--muted);margin-top:-6px;margin-bottom:10px;">Auf einen Tag tippen, um die Zimmer dieses Tages zu bearbeiten.</p>
      ${dateKeys.length === 0 ? '<p style="color:var(--muted);font-size:14px;">Keine Daten in diesem Monat.</p>' : `<table class="report-table"><thead><tr><th>Datum</th><th>Zimmer</th><th>Zeit</th><th>Verdienst</th><th></th></tr></thead><tbody>${dailyRows}</tbody></table>`}
    </div>`;
}

function renderYearReport() {
  const d = parseDateKey(state.currentDate); const year = d.getFullYear();
  const allRooms = getRooms().filter(r => parseDateKey(r.date).getFullYear() === year);
  const stats = computeStatsForRooms(allRooms);
  const byMonth = {};
  allRooms.forEach(r => { const m = parseDateKey(r.date).getMonth(); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(r); });
  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const monthKeysSorted = Object.keys(byMonth).sort((a, b) => a - b);
  const monthRows = monthKeysSorted.map(m => {
    const s = computeStatsForRooms(byMonth[m]);
    const monthKey = `${year}-${String(Number(m) + 1).padStart(2, "0")}`;
    return `<tr class="clickable-row" data-navigate-month="${monthKey}"><td>${monthNames[m]}</td><td>${s.totalCleaned}/${s.totalRooms}</td><td>${formatDuration(s.totalMs)}</td><td>${s.income.toFixed(2)} €</td><td>✏️</td></tr>`;
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

  return `<div class="report-card">
      <h3>Jahresbericht – ${year}</h3>
      ${statBoxes(stats)}
      <h4>Reinigungszeit nach Farbe</h4>${renderCategoryTable(stats.categories)}
      <div class="chart-block">${colorDonut}</div>
      <h4>Verdienst nach Zimmertyp</h4>${renderWageTable(stats)}
      <div class="chart-block">${wageDonut}</div>
    </div>
    <div class="report-card">
      <h3>Verlauf im Jahr</h3>
      <h4>Monatlicher Verdienst</h4><div class="chart-block">${monthlyIncomeChart}</div>
      <h4>Gereinigte Zimmer pro Monat</h4><div class="chart-block">${monthlyRoomsChart}</div>
    </div>
    <div class="report-card">
      <h3>Monatliche Übersicht</h3>
      <p style="font-size:12px;color:var(--muted);margin-top:-6px;margin-bottom:10px;">Auf einen Monat tippen, um dessen Tage einzeln zu sehen und zu bearbeiten.</p>
      ${monthRows === "" ? '<p style="color:var(--muted);font-size:14px;">Keine Daten in diesem Jahr.</p>' : `<table class="report-table"><thead><tr><th>Monat</th><th>Zimmer</th><th>Zeit</th><th>Verdienst</th><th></th></tr></thead><tbody>${monthRows}</tbody></table>`}
    </div>`;
}

function renderTab() {
  const roomsCards = document.querySelectorAll(".card");
  const tabContent = document.getElementById("tabContent");
  document.querySelectorAll(".tab-btn").forEach(btn => { btn.classList.toggle("active", btn.dataset.tab === state.activeTab); });

  if (state.activeTab === "rooms") {
    roomsCards.forEach(c => c.classList.remove("hidden"));
    tabContent.classList.add("hidden");
    tabContent.innerHTML = "";
  } else {
    roomsCards.forEach(c => c.classList.add("hidden"));
    tabContent.classList.remove("hidden");
    if (state.activeTab === "day") tabContent.innerHTML = renderDayReport();
    else if (state.activeTab === "month") tabContent.innerHTML = renderMonthReport();
    else if (state.activeTab === "year") tabContent.innerHTML = renderYearReport();

    tabContent.querySelectorAll("[data-navigate-date]").forEach(row => {
      row.addEventListener("click", () => { state.currentDate = row.dataset.navigateDate; state.activeTab = "rooms"; renderAll(); });
    });
    tabContent.querySelectorAll("[data-navigate-month]").forEach(row => {
      row.addEventListener("click", () => {
        const [y, m] = row.dataset.navigateMonth.split("-").map(Number);
        state.currentDate = formatDateKey(new Date(y, m - 1, 1));
        state.activeTab = "month"; renderAll();
      });
    });
  }
  renderHeader();
}

function openSettingsModal() {
  const s = getSettings();
  document.getElementById("inputWageNormal").value = s.wageNormal;
  document.getElementById("inputWageSuite").value = s.wageSuite;
  const gs = getGDriveSettings();
  document.getElementById("inputGDriveEnabled").checked = gs.enabled;
  document.getElementById("inputGDriveWebhook").value = gs.webhookUrl || "";
  document.getElementById("inputEmployeeName").value = gs.employeeName || "";
  document.getElementById("inputRecipientEmail").value = gs.recipientEmail || "";
  updateGDriveStatusUI(gs.webhookUrl ? "Konfiguriert. Testen Sie die Verbindung." : "Nicht konfiguriert.");
  document.getElementById("settingsModal").classList.remove("hidden");
}
function closeSettingsModal() { document.getElementById("settingsModal").classList.add("hidden"); }
function saveSettingsFromModal() {
  const wageNormal = parseFloat(document.getElementById("inputWageNormal").value) || 0;
  const wageSuite = parseFloat(document.getElementById("inputWageSuite").value) || 0;
  setSettings({ wageNormal, wageSuite });
  const gdriveEnabled = document.getElementById("inputGDriveEnabled").checked;
  const webhookUrl = document.getElementById("inputGDriveWebhook").value.trim();
  const employeeName = document.getElementById("inputEmployeeName").value.trim();
  const recipientEmail = document.getElementById("inputRecipientEmail").value.trim();
  setGDriveSettings({ enabled: gdriveEnabled, webhookUrl, employeeName, recipientEmail });
  closeSettingsModal(); renderTab(); showToast("Einstellungen gespeichert.");
}

function exportData() {
  const data = { rooms: getRooms(), shifts: getShifts(), locks: getLocks(), settings: getSettings(), exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `reinigungsplaner_backup_${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url); showToast("Daten exportiert.");
}
function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.rooms) setRooms(data.rooms);
      if (data.shifts) setShifts(data.shifts);
      if (data.locks) setLocks(data.locks);
      if (data.settings) setSettings(data.settings);
      renderAll(); showToast("Daten importiert.");
    } catch (err) { showToast("Import fehlgeschlagen: ungültige Datei."); }
  };
  reader.readAsText(file);
}

function renderAll() { renderHeader(); renderShift(); renderRoomList(); renderTab(); }

function bindEvents() {
  document.getElementById("btnPrevDay").addEventListener("click", () => { state.currentDate = shiftDate(state.currentDate, -1); renderAll(); });
  document.getElementById("btnNextDay").addEventListener("click", () => { state.currentDate = shiftDate(state.currentDate, 1); renderAll(); });
  document.getElementById("btnToday").addEventListener("click", () => { state.currentDate = todayStr(); renderAll(); });

  document.getElementById("btnLock").addEventListener("click", () => {
    const locked = isDayLocked(state.currentDate);
    setDayLocked(state.currentDate, !locked);
    renderAll();
    showToast(!locked ? "Tag gesperrt." : "Tag entsperrt.");
  });
  document.getElementById("btnUnlockInline").addEventListener("click", () => { setDayLocked(state.currentDate, false); renderAll(); showToast("Tag entsperrt."); });

  document.getElementById("btnKommen").addEventListener("click", () => { saveShift(state.currentDate, { kommen: Date.now() }); renderShift(); });
  document.getElementById("btnGehen").addEventListener("click", () => { saveShift(state.currentDate, { gehen: Date.now() }); renderShift(); });
  document.getElementById("btnEditShift").addEventListener("click", (e) => { e.preventDefault(); openShiftModal(); });
  document.getElementById("btnCancelShift").addEventListener("click", closeShiftModal);
  document.getElementById("btnSaveShift").addEventListener("click", saveShiftFromModal);

  document.getElementById("btnAddRoom").addEventListener("click", () => openRoomModal(null));
  document.getElementById("roomList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const card = e.target.closest(".room-card"); if (!card) return;
    handleRoomAction(card.dataset.id, btn.dataset.action);
  });
  document.getElementById("btnCancelRoom").addEventListener("click", closeRoomModal);
  document.getElementById("btnSaveRoom").addEventListener("click", saveRoomFromModal);
  document.getElementById("btnDeleteRoom").addEventListener("click", deleteRoomFromModal);

  document.getElementById("btnSettings").addEventListener("click", openSettingsModal);
  document.getElementById("btnCloseSettings").addEventListener("click", closeSettingsModal);
  document.getElementById("btnSaveSettings").addEventListener("click", saveSettingsFromModal);
  document.getElementById("btnGDriveConnect").addEventListener("click", testGDriveConnection);
  document.getElementById("btnExportData").addEventListener("click", exportData);
  document.getElementById("inputImportFile").addEventListener("change", (e) => { if (e.target.files[0]) importDataFromFile(e.target.files[0]); });

  document.querySelectorAll(".tab-btn").forEach(btn => { btn.addEventListener("click", () => { state.activeTab = btn.dataset.tab; renderTab(); }); });
}

function init() {
  bindEvents();
  renderAll();
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(() => {}); }
}

document.addEventListener("DOMContentLoaded", init);
