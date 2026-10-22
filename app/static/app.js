"use strict";

let jobs = [];
let selectedPriority = "all";
let loaded = false;
const RANK = { critical: 0, high: 1, normal: 2 };
const byId = (id) => document.getElementById(id);
const jobCode = (job) => `JOB-${String(job.id).padStart(4, "0")}`;
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function initials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function ago(iso) {
  const minutes = Math.round((new Date(iso) - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

function sortJobs(list) {
  return [...list].sort((a, b) => (RANK[a.priority] - RANK[b.priority]) || (a.id - b.id));
}

function showSkeleton() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 4; i += 1) {
    const card = document.createElement("div");
    card.className = "job skeleton";
    card.setAttribute("aria-hidden", "true");
    fragment.appendChild(card);
  }
  byId("jobs").replaceChildren(fragment);
}

function renderCounts() {
  const open = jobs.filter((job) => job.status === "open");
  byId("open-count").textContent = open.length;
  byId("priority-count").textContent = open.filter((job) => job.priority !== "normal").length;
  byId("technician-count").textContent = new Set(open.map((job) => job.technician).filter((name) => name !== "Unassigned")).size;
  byId("lines-count").textContent = new Set(open.map((job) => job.customer_name)).size;
  byId("total-count").textContent = jobs.length;
  document.querySelectorAll("[data-count]").forEach((pill) => {
    const key = pill.dataset.count;
    pill.textContent = key === "all" ? jobs.length : jobs.filter((job) => job.priority === key).length;
  });
}

function render() {
  renderCounts();
  const query = byId("search").value.trim().toLowerCase();
  const visible = sortJobs(jobs.filter((job) =>
    (selectedPriority === "all" || job.priority === selectedPriority) &&
    [jobCode(job), job.customer_name, job.description, job.location, job.technician]
      .some((value) => value.toLowerCase().includes(query))
  ));
  const fragment = document.createDocumentFragment();
  visible.forEach((job, index) => {
    const card = byId("job-template").content.cloneNode(true);
    const set = (selector, value) => { card.querySelector(selector).textContent = value; };
    card.querySelector(".job").dataset.priority = job.priority;
    card.querySelector(".job").style.setProperty("--i", Math.min(index, 8));
    set(".job-id", jobCode(job));
    set(".customer", job.customer_name);
    set(".description", job.description);
    set(".location", job.location);
    set(".technician", job.technician);
    set(".avatar-sm", initials(job.technician));
    set(".priority", cap(job.priority));
    card.querySelector(".priority").classList.add(job.priority);
    const time = card.querySelector("time");
    time.dateTime = job.created_at;
    time.title = dateFormat.format(new Date(job.created_at));
    time.textContent = `Opened ${ago(job.created_at)}`;
    fragment.appendChild(card);
  });
  byId("jobs").replaceChildren(fragment);
  byId("jobs").setAttribute("aria-busy", "false");
  byId("results").textContent = `Showing ${visible.length} of ${jobs.length} jobs`;
  byId("notice").hidden = visible.length > 0;
  byId("notice").textContent = jobs.length ? "No jobs match your filters. Try another search or priority." : "No service jobs yet.";
}

async function loadJobs() {
  byId("refresh").disabled = true;
  byId("refresh").classList.add("spinning");
  byId("live").classList.remove("offline");
  byId("connection").textContent = "Connecting";
  if (!loaded) showSkeleton();
  try {
    const response = await fetch("/jobs", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load jobs");
    jobs = await response.json();
    loaded = true;
    render();
    byId("connection").textContent = "Operations Live";
    byId("updated").textContent = `Last updated ${timeFormat.format(new Date())}`;
  } catch (error) {
    byId("live").classList.add("offline");
    byId("connection").textContent = "Connection unavailable";
    byId("jobs").setAttribute("aria-busy", "false");
    if (loaded) render(); else byId("jobs").replaceChildren();
    byId("notice").hidden = false;
    byId("notice").textContent = "Unable to refresh service jobs. Check your connection and try Refresh.";
    byId("results").textContent = jobs.length ? "Showing previously loaded jobs" : "Jobs unavailable";
  } finally {
    byId("refresh").disabled = false;
    byId("refresh").classList.remove("spinning");
  }
}

document.querySelectorAll("[data-priority]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPriority = button.dataset.priority;
    document.querySelectorAll("[data-priority]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    render();
  });
});

byId("search").addEventListener("input", render);
byId("search").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && event.target.value) { event.target.value = ""; render(); }
});
document.addEventListener("keydown", (event) => {
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    byId("search").focus();
  }
});
byId("refresh").addEventListener("click", loadJobs);
loadJobs();
