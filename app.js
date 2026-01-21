// Coachboard v1 - local single-page app (no build tools)
// Features: YouTube URL load, timestamp notes, roster CRUD + CSV import/export, athlete tagging, telestration per timestamp.
// Limitations: YouTube cannot do true reverse playback (we implement step-back seek).

/* global YT */
const $ = (id) => document.getElementById(id);

const LS_KEY = "coachboard_v1_state";
const DEFAULT_STEP = 5; // seconds

// -------------------------
// Helpers
// -------------------------
function uidNumeric() {
  // Unique numeric-ish ID (local). Not cryptographic; good enough for v1 local roster IDs.
  // Format: YYMMDDHHMMSS + 3 random digits
  const d = new Date();
  const pad = (n, w=2) => String(n).padStart(w, "0");
  const base = pad(d.getFullYear()%100)+pad(d.getMonth()+1)+pad(d.getDate())+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
  const rand = String(Math.floor(Math.random()*1000)).padStart(3,"0");
  return Number(base + rand);
}

function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function parseYouTubeId(url){
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx+1]) return parts[embedIdx+1];
  } catch {}
  return "";
}

function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function norm(s){ return (s||"").toString().trim().toLowerCase(); }

// Basic CSV (no quoted commas support beyond MVP). For v1 local it's OK.
// If you expect commas in names, we can upgrade to a real CSV parser.
function toCSV(rows, headers){
  const esc = (v) => {
    const s = (v ?? "").toString();
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
    return s;
  };
  const out = [];
  out.push(headers.join(","));
  for (const r of rows){
    out.push(headers.map(h => esc(r[h])).join(","));
  }
  return out.join("\n");
}

function fromCSV(text){
  // Handles quotes minimally (double-quote escaping), still not perfect for edge-cases but ok for v1.
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length);
  if (!lines.length) return {headers:[], rows:[]};

  const parseLine = (line) => {
    const cells = [];
    let cur = "";
    let inQ = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (ch === '"'){
        if (inQ && line[i+1] === '"'){ cur += '"'; i++; continue; }
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ){
        cells.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i=1;i<lines.length;i++){
    const cells = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => row[h] = cells[idx] ?? "");
    rows.push(row);
  }
  return {headers, rows};
}

// -------------------------
// State
// -------------------------
let state = {
  projectId: uidNumeric(),
  youtubeUrl: "",
  youtubeId: "",
  roster: [], // {id, first, last, position, jersey, team}
  timestamps: [] // {id,time,title,description,taggedAthleteIds:[],drawings:[]}
};

let player = null;
let playerReady = false;
let defaultMuted = true;
let pendingVideoId = null;
let selectedTsId = null;

// telestration state
let drawEnabled = false;
let drawings = [];
let activeStroke = null;

// -------------------------
// Persistence
// -------------------------
function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object"){
      state = {...state, ...obj};
      // defensive: ensure arrays
      state.roster = Array.isArray(state.roster) ? state.roster : [];
      state.timestamps = Array.isArray(state.timestamps) ? state.timestamps : [];
    }
  } catch {}
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// -------------------------
// Tabs
// -------------------------
function setTab(tab){
  const filmBtn = $("tab-film");
  const rosterBtn = $("tab-roster");
  const filmPanel = $("panel-film");
  const rosterPanel = $("panel-roster");

  const isFilm = tab === "film";
  filmBtn.classList.toggle("is-active", isFilm);
  rosterBtn.classList.toggle("is-active", !isFilm);
  filmBtn.setAttribute("aria-selected", String(isFilm));
  rosterBtn.setAttribute("aria-selected", String(!isFilm));
  filmPanel.classList.toggle("is-active", isFilm);
  rosterPanel.classList.toggle("is-active", !isFilm);

  // Resize overlay when switching back to film
  if (isFilm) setTimeout(resizeCanvas, 60);
}

// -------------------------
// Roster
// -------------------------
function rosterLabel(a){
  return `#${a.jersey || "?"} ${a.position || ""} — ${a.first || ""} ${a.last || ""}`.trim();
}

function rosterSearchIndex(a){
  return [
    a.id, a.first, a.last, a.position, a.jersey, a.team
  ].map(norm).join(" ");
}

function renderRosterTable(){
  const q = norm($("rosterSearch").value);
  const tbody = $("rosterTbody");
  tbody.innerHTML = "";

  const rows = state.roster
    .slice()
    .sort((a,b) => String(a.team||"").localeCompare(String(b.team||"")) || String(a.last||"").localeCompare(String(b.last||"")) )
    .filter(a => !q || rosterSearchIndex(a).includes(q));

  for (const a of rows){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="muted">${a.id}</td>
      <td>${escapeHtml(a.first||"")}</td>
      <td>${escapeHtml(a.last||"")}</td>
      <td>${escapeHtml(a.position||"")}</td>
      <td>${escapeHtml(a.jersey||"")}</td>
      <td>${escapeHtml(a.team||"")}</td>
      <td style="text-align:right">
        <button class="btn btn--danger" data-del="${a.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // bind deletes
  tbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.getAttribute("data-del"));
      // remove athlete from roster
      state.roster = state.roster.filter(x => Number(x.id) !== id);
      // also remove tags from timestamps
      for (const ts of state.timestamps){
        ts.taggedAthleteIds = (ts.taggedAthleteIds||[]).filter(aid => Number(aid) !== id);
      }
      saveState();
      renderRosterTable();
      renderTimestampList();
      renderAthleteSearchResults(); // refresh search result
    };
  });
}

function addAthlete(){
  const first = $("r-first").value.trim();
  const last = $("r-last").value.trim();
  const position = $("r-pos").value.trim();
  const jersey = $("r-jersey").value.trim();
  const team = $("r-team").value.trim();

  if (!first || !last){
    $("rosterStatus").textContent = "First and last name are required.";
    return;
  }

  const id = uidNumeric();
  state.roster.push({ id, first, last, position, jersey, team });
  saveState();

  $("r-first").value = "";
  $("r-last").value = "";
  $("r-pos").value = "";
  $("r-jersey").value = "";
  $("r-team").value = "";

  $("rosterStatus").textContent = `Added athlete ID ${id}.`;
  renderRosterTable();
}

function exportRosterCSV(){
  const headers = ["id","first","last","position","jersey","team"];
  const csv = toCSV(state.roster, headers);
  downloadText("roster.csv", csv, "text/csv");
}

async function importRosterCSV(){
  const file = await pickFile(".csv,text/csv");
  if (!file) return;
  const text = await file.text();
  const {rows} = fromCSV(text);

  // Accept both your requested columns and common variants.
  // Required-ish: first/last (or name/lastname).
  const mapped = [];
  for (const r of rows){
    const first = (r.first ?? r.firstname ?? r.name ?? "").toString().trim();
    const last  = (r.last ?? r.lastname ?? r.surname ?? "").toString().trim();
    const position = (r.position ?? r.pos ?? "").toString().trim();
    const jersey = (r.jersey ?? r.number ?? r.jerseyNumber ?? "").toString().trim();
    const team = (r.team ?? r.squad ?? "").toString().trim();
    const idRaw = (r.id ?? "").toString().trim();
    const id = idRaw ? Number(idRaw) : uidNumeric();

    if (!first && !last) continue;
    mapped.push({id, first, last, position, jersey, team});
  }

  // Merge strategy: keep existing IDs, add new; if same ID exists, overwrite with imported row.
  const byId = new Map(state.roster.map(a => [Number(a.id), a]));
  for (const a of mapped){
    byId.set(Number(a.id), a);
  }
  state.roster = Array.from(byId.values());
  saveState();
  $("rosterStatus").textContent = `Imported ${mapped.length} rows (merged by ID).`;
  // Force a full UI re-sync so tags/search reflect imported roster immediately.
  renderRosterTable();
  renderTimestampList();
  renderTaggedAthletes();
  renderAthleteSearchResults();
  setStatus("Roster imported and UI refreshed.");
  // If a timestamp is selected, re-select it to refresh tag panels immediately.
  if (selectedTsId) selectTimestamp(selectedTsId);
}

function clearRoster(){
  state.roster = [];
  // also clear tags
  for (const ts of state.timestamps){
    ts.taggedAthleteIds = [];
  }
  saveState();
  renderRosterTable();
  renderTimestampList();
  renderAthleteSearchResults();
  $("rosterStatus").textContent = "Roster cleared.";
}

// -------------------------
// Timestamps
// -------------------------
function escapeHtml(s){
  return (s||"").toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function tsSearchIndex(ts){
  const tagLabels = (ts.taggedAthleteIds||[])
    .map(id => state.roster.find(a => Number(a.id)===Number(id)))
    .filter(Boolean)
    .map(a => rosterLabel(a))
    .join(" ");
  return [ts.title, ts.description, tagLabels].map(norm).join(" ");
}

function renderTimestampList(){
  const list = $("tsList");
  const q = norm($("tsFilter").value);
  list.innerHTML = "";

  const sorted = state.timestamps.slice().sort((a,b)=>a.time-b.time)
    .filter(ts => !q || tsSearchIndex(ts).includes(q));

  for (const ts of sorted){
    const div = document.createElement("div");
    div.className = "ts" + (ts.id === selectedTsId ? " is-selected" : "");
    const athleteCount = (ts.taggedAthleteIds||[]).length;
    const tags = (ts.taggedAthleteIds||[])
      .map(id => state.roster.find(a => Number(a.id)===Number(id)))
      .filter(Boolean)
      .slice(0,3)
      .map(a => `<span class="pill">${escapeHtml(rosterLabel(a))}</span>`)
      .join("");

    div.innerHTML = `
      <div class="ts__top">
        <div class="ts__title">${fmtTime(ts.time)} — ${escapeHtml(ts.title || "Untitled")}</div>
        <div class="pill">${athleteCount} athletes</div>
      </div>
      <div class="muted">${escapeHtml((ts.description||"").slice(0,110))}${(ts.description||"").length>110 ? "…" : ""}</div>
      <div class="ts__meta">${tags}${athleteCount>3 ? `<span class="pill">+${athleteCount-3}</span>` : ""}</div>
    `;

    div.onclick = () => {
      selectTimestamp(ts.id);
      if (player){
        player.seekTo(ts.time, true);
        player.pauseVideo();
      }
    };

    list.appendChild(div);
  }
}

function addTimestampAtCurrent(){
  if (!player) return;
  const time = Math.floor(player.getCurrentTime());
  const ts = {
    id: uidNumeric(),
    time,
    title: "New coaching point",
    description: "",
    taggedAthleteIds: [],
    drawings: []
  };
  state.timestamps.push(ts);
  saveState();
  setStatus(`Added timestamp @ ${fmtTime(time)}`);
  renderTimestampList();
  selectTimestamp(ts.id);
}

function selectTimestamp(id){
  selectedTsId = id;
  const ts = state.timestamps.find(t => t.id === id);
  if (!ts) return;

  $("tsTitle").value = ts.title || "";
  $("tsDesc").value = ts.description || "";
  $("tsTimePill").textContent = fmtTime(ts.time);

  // drawings
  drawings = ts.drawings || [];
  redrawAll();

  // tags
  renderTaggedAthletes();

  // refresh list selection highlight
  renderTimestampList();
  renderAthleteSearchResults();
}

function saveTimestampEdits(){
  if (!selectedTsId) return;
  const ts = state.timestamps.find(t => t.id === selectedTsId);
  if (!ts) return;
  ts.title = $("tsTitle").value.trim();
  ts.description = $("tsDesc").value.trim();
  saveState();
  renderTimestampList();
  setStatus("Saved timestamp.");
}

function deleteTimestamp(){
  if (!selectedTsId) return;
  state.timestamps = state.timestamps.filter(t => t.id !== selectedTsId);
  selectedTsId = null;
  $("tsTitle").value = "";
  $("tsDesc").value = "";
  $("tsTimePill").textContent = "—";
  $("athleteTagList").innerHTML = "";
  drawings = [];
  redrawAll();
  saveState();
  renderTimestampList();
  setStatus("Deleted timestamp.");
}

function jumpToSelected(){
  if (!selectedTsId || !player) return;
  const ts = state.timestamps.find(t => t.id === selectedTsId);
  if (!ts) return;
  player.seekTo(ts.time, true);
  player.pauseVideo();
}

// -------------------------
// Athlete tagging on timestamp
// -------------------------
function renderTaggedAthletes(){
  const wrap = $("athleteTagList");
  wrap.innerHTML = "";
  const ts = state.timestamps.find(t => t.id === selectedTsId);
  if (!ts) return;

  for (const id of (ts.taggedAthleteIds||[])){
    const a = state.roster.find(x => Number(x.id) === Number(id));
    const label = a ? rosterLabel(a) : `ID ${id}`;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = label;
    pill.title = "Click to remove";
    pill.style.cursor = "pointer";
    pill.onclick = () => {
      ts.taggedAthleteIds = (ts.taggedAthleteIds||[]).filter(x => Number(x) !== Number(id));
      saveState();
      renderTaggedAthletes();
      renderTimestampList();
      renderAthleteSearchResults();
    };
    wrap.appendChild(pill);
  }
}

function renderAthleteSearchResults(){
  const q = norm($("athSearch").value);
  const box = $("athResults");
  box.innerHTML = "";

  if (!state.roster.length){
    box.innerHTML = `<div class="athRow"><div class="athLabel"><div class="athMain">Roster is empty</div><div class="athSub">Go to Roster tab and add athletes first.</div></div></div>`;
    return;
  }

  const ts = selectedTsId ? state.timestamps.find(t => t.id === selectedTsId) : null;
  const tagged = new Set(((ts?.taggedAthleteIds)||[]).map(Number));

  const rows = state.roster
    .slice()
    .sort((a,b)=>String(a.team||"").localeCompare(String(b.team||"")) || String(a.jersey||"").localeCompare(String(b.jersey||"")))
    .filter(a => !q || rosterSearchIndex(a).includes(q))
    .slice(0, 30); // keep snappy

  for (const a of rows){
    const isTagged = tagged.has(Number(a.id));
    const row = document.createElement("div");
    row.className = "athRow";
    row.innerHTML = `
      <div class="athLabel">
        <div class="athMain">${escapeHtml(rosterLabel(a))}</div>
        <div class="athSub">ID ${a.id}</div>
      </div>
      <button class="btn ${isTagged ? "" : "btn--primary"}" data-id="${a.id}">${ts ? (isTagged ? "Tagged" : "Tag") : "Select timestamp"}</button>
    `;
    row.querySelector("button").onclick = () => {
      if (!ts.taggedAthleteIds) ts.taggedAthleteIds = [];
      if (!ts.taggedAthleteIds.includes(a.id)) ts.taggedAthleteIds.push(a.id);
      saveState();
      renderTaggedAthletes();
      renderTimestampList();
      renderAthleteSearchResults();
    };
    box.appendChild(row);
  }

  if (!rows.length){
    box.innerHTML = `<div class="athRow"><div class="athLabel"><div class="athMain">No matches</div><div class="athSub">Try jersey number, position, team, or last name.</div></div></div>`;
  }
}

// -------------------------
// Telestration (Canvas overlay)
// -------------------------
const canvas = $("overlay");
const wrap = $("playerWrap");
const ctx = canvas.getContext("2d");

function resizeCanvas(){
  const r = wrap.getBoundingClientRect();
  canvas.width = Math.floor(r.width);
  canvas.height = Math.floor(r.height);
  redrawAll();
}

window.addEventListener("resize", () => setTimeout(resizeCanvas, 50));

function relPoint(clientX, clientY){
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) / r.width;
  const y = (clientY - r.top) / r.height;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

function drawStroke(stroke){
  const pts = stroke.points || [];
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = (stroke.tool === "erase") ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color || "#00E5FF";
  ctx.lineWidth = Number(stroke.size || 4);
  ctx.beginPath();
  ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
  for (let i=1;i<pts.length;i++){
    ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
  }
  ctx.stroke();
  ctx.restore();
}

function redrawAll(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const d of drawings) drawStroke(d);
  if (activeStroke) drawStroke(activeStroke);
}

function pointerDown(e){
  if (!drawEnabled) return;
  if (!selectedTsId){ setStatus("Select a timestamp before drawing."); return; }
  canvas.setPointerCapture(e.pointerId);
  activeStroke = {
    id: uidNumeric(),
    tool: "pen",
    color: $("colorSel").value,
    size: Number($("sizeSel").value),
    points: [relPoint(e.clientX, e.clientY)],
    createdAt: Date.now()
  };
  redrawAll();
}
function pointerMove(e){
  if (!drawEnabled || !activeStroke) return;
  activeStroke.points.push(relPoint(e.clientX, e.clientY));
  redrawAll();
}
function pointerUp(e){
  if (!drawEnabled || !activeStroke) return;
  const ts = state.timestamps.find(t => t.id === selectedTsId);
  if (!ts) return;
  ts.drawings = ts.drawings || [];
  ts.drawings.push(activeStroke);
  drawings = ts.drawings;
  activeStroke = null;
  saveState();
  redrawAll();
}
canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);

// -------------------------
// YouTube IFrame API
// -------------------------
function injectYouTubeApi(){
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: state.youtubeId || undefined,
    playerVars: { playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, controls: 0, disablekb: 1, origin: window.location.origin },
    events: {
      onReady: () => {
        playerReady = true;
        setStatus("Player ready.");
        if (defaultMuted && player.mute) player.mute();
        updateMuteUI();
        // If user clicked Load before the player finished initializing, honor it now.
        if (pendingVideoId) {
          player.cueVideoById(pendingVideoId);
          pendingVideoId = null;
        } else if (state.youtubeId) {
          player.cueVideoById(state.youtubeId);
        }
        setTimeout(resizeCanvas, 60);
      },
      onError: (e) => {
        const code = e?.data;
        const map = {
          2: "Invalid video ID or parameter.",
          5: "HTML5 player error.",
          100: "Video not found (removed/private).",
          101: "Embed not allowed OR origin/restriction issue.",
          150: "Embed not allowed OR origin/restriction issue."
        };
        setStatus(`Player error (${code}). ${map[code] || "Unknown error."}`);
        console.warn("YT error:", e);
      }
    }
  });

  // time pill
  setInterval(() => {
    if (!player || typeof player.getCurrentTime !== "function") return;
    $("curTime").textContent = fmtTime(player.getCurrentTime());
  }, 250);
};

// -------------------------
// New Project (keep roster, clear timestamps)
// -------------------------
function newProject(){
  state.projectId = uidNumeric();
  state.timestamps = [];
  // keep roster and youtube fields
  selectedTsId = null;
  drawings = [];
  activeStroke = null;
  $("tsTitle").value = "";
  $("tsDesc").value = "";
  $("tsTimePill").textContent = "—";
  $("tsFilter").value = "";
  $("athSearch").value = "";
  $("athleteTagList").innerHTML = "";
  saveState();
  renderTimestampList();
  renderAthleteSearchResults();
  redrawAll();
  setStatus("New project started (timestamps cleared, roster kept). ");
}

// -------------------------
// Project import/export
// -------------------------
function exportProject(){
  downloadText("coachboard_project.json", JSON.stringify(state, null, 2), "application/json");
  setStatus("Exported project JSON.");
}

async function importProject(){
  const file = await pickFile("application/json,.json");
  if (!file) return;
  const text = await file.text();
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object") throw new Error("bad");
    if (!Array.isArray(obj.roster) || !Array.isArray(obj.timestamps)) throw new Error("shape");
    state = {
      projectId: obj.projectId ?? uidNumeric(),
      youtubeUrl: obj.youtubeUrl ?? "",
      youtubeId: obj.youtubeId ?? "",
      roster: obj.roster ?? [],
      timestamps: obj.timestamps ?? []
    };
    saveState();
    $("ytUrl").value = state.youtubeUrl || "";
    renderRosterTable();
    renderTimestampList();
    selectedTsId = null;
    drawings = [];
    redrawAll();
    if (state.youtubeId) {
      if (playerReady && player?.cueVideoById) player.cueVideoById(state.youtubeId);
      else pendingVideoId = state.youtubeId;
    }
    setStatus("Imported project JSON.");
  } catch {
    setStatus("Import failed: invalid project JSON.");
  }
}

// -------------------------
// File picker helper
// -------------------------
function pickFile(accept){
  return new Promise((resolve) => {
    const input = $("fileInput");
    input.value = "";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}


// -------------------------
// UI micro-interactions
// -------------------------
function updateFilterX(){
  const has = $("tsFilter").value.trim().length > 0;
  $("clearFilterBtn").style.visibility = has ? "visible" : "hidden";
}


function updateMuteUI(){
  const btn = $("muteBtn");
  if (!btn || !player) return;
  const isMuted = player.isMuted?.() ?? true;
  btn.title = isMuted ? "Unmute" : "Mute";
  btn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
}

// -------------------------
// Status
// -------------------------
function setStatus(msg){
  $("status").textContent = msg;
}


function updateActiveColorUI(){
  const c = $("colorSel").value;
  const dot = $("activeColorDot");
  if (dot) dot.style.background = c;
  const sel = $("colorSel");
  if (sel) sel.style.setProperty("--selColor", c);
}


function syncColorUIFromSelect(){
  const sel = $("colorSel");
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const color = sel.value;
  const name = opt?.textContent?.trim() || "Color";
  $("colorBtnLabel")?.replaceChildren(document.createTextNode(name));
  const dot = $("colorDotLg");
  if (dot) dot.style.background = color;
  const pill = $("activeColorDot");
  if (pill) pill.style.background = color;
}
function closeColorMenu(){ $("colorMenu")?.classList.remove("is-open"); }

// -------------------------
// Wire up UI
// -------------------------
function bindUI(){
  // tabs
  $("tab-film").onclick = () => setTab("film");
  $("tab-roster").onclick = () => setTab("roster");

  $("goRosterBtn").onclick = () => setTab("roster");

  // project import/export
  $("btn-new-project").onclick = newProject;

  $("btn-export-project").onclick = exportProject;
  $("btn-import-project").onclick = importProject;

  // roster actions
  $("btn-add-athlete").onclick = addAthlete;
  $("rosterSearch").addEventListener("input", renderRosterTable);
  $("btn-export-roster").onclick = exportRosterCSV;
  $("btn-import-roster").onclick = importRosterCSV;
  $("btn-clear-roster").onclick = clearRoster;

  // film controls
  $("loadBtn").onclick = () => {
    const url = $("ytUrl").value.trim();
    const id = parseYouTubeId(url);
    if (!id){ setStatus("Could not parse YouTube ID. Paste a normal YouTube URL."); return; }

    state.youtubeUrl = url;
    state.youtubeId = id;
    saveState();

    // If the user loads a video before the YouTube player is ready, queue it.
    if (!playerReady || !player?.cueVideoById){
      pendingVideoId = id;
      setStatus("Loading queued — player is still initializing...");
      return;
    }

    player.cueVideoById(id);
    if (defaultMuted && player.mute) player.mute();
    updateMuteUI();
    setStatus(`Loaded videoId: ${id}`);
    setTimeout(resizeCanvas, 60);
  };

  $("playBtn").onclick = () => player?.playVideo?.();
  $("pauseBtn").onclick = () => player?.pauseVideo?.();

  $("muteBtn").onclick = () => {
    if (!player) return;
    const isMuted = player.isMuted?.() ?? true;
    if (isMuted) player.unMute?.(); else player.mute?.();
    defaultMuted = player.isMuted?.() ?? defaultMuted;
    updateMuteUI();
  };

  $("fwdBtn").onclick = () => {
    if (!player) return;
    player.seekTo(player.getCurrentTime() + DEFAULT_STEP, true);
  };
  $("backBtn").onclick = () => {
    if (!player) return;
    player.seekTo(Math.max(0, player.getCurrentTime() - DEFAULT_STEP), true);
  };

  $("addTsBtn").onclick = addTimestampAtCurrent;

  $("colorSel").addEventListener("change", () => { syncColorUIFromSelect(); });
$("drawToggleBtn").onclick = () => {
    drawEnabled = !drawEnabled;
    const dl = $("drawLabel");
    if (dl) dl.textContent = `Draw: ${drawEnabled ? "On" : "Off"}`;
    canvas.style.pointerEvents = drawEnabled ? "auto" : "none";
    setStatus(drawEnabled ? "Drawing enabled." : "Drawing disabled.");
  };

  $("clearDrawBtn").onclick = () => {
    if (!selectedTsId) return;
    const ts = state.timestamps.find(t => t.id === selectedTsId);
    if (!ts) return;
    ts.drawings = [];
    drawings = [];
    saveState();
    redrawAll();
    setStatus("Cleared drawings for selected timestamp.");
  };

  // timestamp editor
  $("saveTsBtn").onclick = saveTimestampEdits;
  $("deleteTsBtn").onclick = deleteTimestamp;
  $("jumpTsBtn").onclick = jumpToSelected;

  // filters + athlete search
  $("tsFilter").addEventListener("input", () => { renderTimestampList(); updateFilterX(); });
$("clearFilterBtn").onclick = () => { $("tsFilter").value=""; renderTimestampList(); $("tsFilter").focus(); updateFilterX(); };

  $("athSearch").addEventListener("input", renderAthleteSearchResults);

  // keyboard shortcuts (film study-ish)
  window.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
    if (!player) return;

    if (e.key === " "){ // space
      e.preventDefault();
      const st = player.getPlayerState?.();
      if (st === 1) player.pauseVideo(); else player.playVideo();
    }
    if (e.key.toLowerCase() === "j"){ player.seekTo(Math.max(0, player.getCurrentTime()-DEFAULT_STEP), true); }
    if (e.key.toLowerCase() === "l"){ player.seekTo(player.getCurrentTime()+DEFAULT_STEP, true); }
    if (e.key.toLowerCase() === "k"){ player.pauseVideo(); }
  });
}

// -------------------------
// Init
// -------------------------
function init(){
  loadState();
  $("ytUrl").value = state.youtubeUrl || "";

  bindUI();
  renderRosterTable();
  renderTimestampList();
  renderAthleteSearchResults();

  injectYouTubeApi();
  setTimeout(resizeCanvas, 60);

  canvas.style.pointerEvents = "none";
}

init();
