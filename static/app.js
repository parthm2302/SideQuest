const $ = id => document.getElementById(id);
const form = $("planner"), drop = $("drop"), photo = $("photo"), preview = $("preview"),
  btn = $("go"), err = $("error");
let last = null, ctx = { vibe: "Curious", hours: "3" };
const KEY = "sidequest-saved";

// ---- photo upload ----
drop.addEventListener("click", e => { e.preventDefault(); photo.click(); });
drop.addEventListener("keydown", e => { if (e.key === "Enter") photo.click(); });
["dragover", "dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault(); drop.classList.toggle("over", ev === "dragover");
  if (ev === "drop" && e.dataTransfer.files[0]) { photo.files = e.dataTransfer.files; showPreview(); }
}));
photo.addEventListener("change", showPreview);
function showPreview() {
  const f = photo.files[0]; if (!f) return;
  preview.src = URL.createObjectURL(f); preview.hidden = false; $("dropText").hidden = true;
}
function el(tag, text, cls) { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; }

// ---- saved quests (kept in this browser with localStorage) ----
const getSaved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const putSaved = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} };
const idOf = (place, q) => place + "|" + q.title;

function card(q, place, i, inSaved) {
  const c = el("article", "", "q"); c.style.animationDelay = i * 90 + "ms";
  const chips = el("div", "", "chips"); chips.append(el("span", q.time), el("span", q.cost));
  c.append(el("h3", q.title), chips, el("p", q.why), el("div", "Meet someone: " + q.meet, "meet"));
  if (inSaved) c.prepend(el("small", place));
  const b = el("button", "", "save"); b.type = "button";
  const refresh = () => { const on = getSaved().some(s => s.id === idOf(place, q)); b.classList.toggle("on", on); b.textContent = inSaved ? "Remove" : on ? "Saved" : "Save quest"; };
  b.addEventListener("click", () => {
    const id = idOf(place, q); let list = getSaved();
    list = list.some(s => s.id === id) ? list.filter(s => s.id !== id) : [...list, { id, place, quest: q }];
    putSaved(list); renderSaved(); refresh();
  });
  refresh(); c.append(b); return c;
}
function renderSaved() {
  const list = getSaved(), box = $("savedList"); box.replaceChildren();
  list.forEach((s, i) => box.append(card(s.quest, s.place, i, true)));
  $("savedEmpty").hidden = list.length > 0; $("savedCount").textContent = list.length;
}

// ---- results ----
function render(d) {
  last = d;
  $("rPlace").textContent = d.place; $("rSummary").textContent = d.summary;
  $("rTip").textContent = "Local tip: " + d.tip;
  const grid = $("quests"); grid.replaceChildren();
  d.quests.forEach((q, i) => grid.append(card(q, d.place, i, false)));
  const r = $("results"); r.hidden = false; r.scrollIntoView({ behavior: "smooth" });
}
async function post(url, opts, errBox, button, label, busy) {
  errBox.hidden = true; button.disabled = true; button.textContent = busy;
  try {
    const res = await fetch(url, opts); const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    render(data);
  } catch (x) { errBox.textContent = x.message; errBox.hidden = false; }
  button.disabled = false; button.textContent = label;
}
form.addEventListener("submit", e => {
  e.preventDefault(); const fd = new FormData(form);
  ctx = { vibe: fd.get("vibe"), hours: fd.get("hours") };
  post("/api/quest", { method: "POST", body: fd }, err, btn, "Find my sidequests", "Scouting the area...");
});
$("followForm").addEventListener("submit", e => {
  e.preventDefault(); if (!last) return;
  const body = { ...ctx, place: last.place, quests: last.quests, ask: $("ask").value };
  post("/api/followup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    $("followError"), e.target.querySelector("button"), "Update plan", "Updating...");
});
renderSaved();
