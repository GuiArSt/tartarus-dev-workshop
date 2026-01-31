/**
 * Linear Review MCP App
 *
 * Interactive UI for previewing and approving Linear sync changes.
 * Renders in MCP host clients (Claude, VS Code, ChatGPT, etc.)
 */

import { App } from "@modelcontextprotocol/ext-apps";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SyncChange {
  type: "project" | "issue";
  action: "create" | "update" | "delete";
  id: string;
  identifier?: string;
  name: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
  currentSummary: string | null;
  proposedSummary: string | null;
  summaryNeedsReview: boolean;
}

interface SyncPreview {
  changes: SyncChange[];
  stats: {
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
  generatedAt: string;
}

interface ApprovedChange {
  id: string;
  type: "project" | "issue";
  action: "create" | "update" | "delete";
  summaryOverride?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let preview: SyncPreview | null = null;
const approved = new Set<string>();
const rejected = new Set<string>();
const summaryEdits = new Map<string, string>();
let currentFilter = "all";
let isApplying = false;

// ─────────────────────────────────────────────────────────────────────────────
// App Instance
// ─────────────────────────────────────────────────────────────────────────────

const app = new App({ name: "Linear Review", version: "1.0.0" });

// ─────────────────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────────────────

const loadingEl = document.getElementById("loading")!;
const changesListEl = document.getElementById("changes-list")!;
const footerEl = document.getElementById("footer")!;
const refreshBtn = document.getElementById("refresh-btn")!;
const approveAllBtn = document.getElementById("approve-all-btn")!;
const applyBtn = document.getElementById("apply-btn")!;
const selectedCountEl = document.getElementById("selected-count")!;
const filtersEl = document.getElementById("filters")!;

// Stats elements
const statNew = document.getElementById("stat-new")!;
const statUpdated = document.getElementById("stat-updated")!;
const statDeleted = document.getElementById("stat-deleted")!;
const statUnchanged = document.getElementById("stat-unchanged")!;

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderStats() {
  if (!preview) return;

  statNew.textContent = String(preview.stats.created);
  statUpdated.textContent = String(preview.stats.updated);
  statDeleted.textContent = String(preview.stats.deleted);
  statUnchanged.textContent = String(preview.stats.unchanged);
}

function getFilteredChanges(): SyncChange[] {
  if (!preview) return [];

  return preview.changes.filter((change) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "create") return change.action === "create";
    if (currentFilter === "update") return change.action === "update";
    if (currentFilter === "delete") return change.action === "delete";
    if (currentFilter === "summary") return change.summaryNeedsReview;
    return true;
  });
}

function renderChangeCard(change: SyncChange): string {
  const isApproved = approved.has(change.id);
  const isRejected = rejected.has(change.id);
  const editedSummary = summaryEdits.get(change.id);

  const cardClass = [
    "change-card",
    isApproved ? "approved" : "",
    isRejected ? "rejected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const actionClass = `action-${change.action}`;
  const actionLabel =
    change.action === "create"
      ? "New"
      : change.action === "update"
        ? "Updated"
        : "Deleted";

  // Build diff rows for updates
  let diffHtml = "";
  if (change.action === "update" && change.changedFields.length > 0) {
    const diffRows = change.changedFields
      .map((field) => {
        const before = change.before?.[field];
        const after = change.after?.[field];
        const beforeStr =
          typeof before === "object"
            ? JSON.stringify(before)
            : String(before ?? "—");
        const afterStr =
          typeof after === "object"
            ? JSON.stringify(after)
            : String(after ?? "—");

        // Truncate long values
        const maxLen = 100;
        const truncBefore =
          beforeStr.length > maxLen
            ? beforeStr.slice(0, maxLen) + "..."
            : beforeStr;
        const truncAfter =
          afterStr.length > maxLen
            ? afterStr.slice(0, maxLen) + "..."
            : afterStr;

        return `
          <div class="diff-row">
            <span class="diff-field">${escapeHtml(field)}</span>
            <span class="diff-old">${escapeHtml(truncBefore)}</span>
            <span class="diff-arrow">→</span>
            <span class="diff-new">${escapeHtml(truncAfter)}</span>
          </div>
        `;
      })
      .join("");

    diffHtml = `
      <div class="diff-section">
        <div class="diff-label">Changes</div>
        ${diffRows}
      </div>
    `;
  }

  // Summary section
  const summaryToShow =
    editedSummary ?? change.proposedSummary ?? change.currentSummary;
  const summaryBadge = change.summaryNeedsReview
    ? '<span class="summary-badge">AI Generated</span>'
    : "";

  const summaryHtml = `
    <div class="summary-section">
      <div class="summary-header">
        <span class="summary-label">Summary</span>
        ${summaryBadge}
      </div>
      ${
        change.summaryNeedsReview
          ? `<textarea class="summary-edit" data-id="${change.id}" placeholder="Edit summary...">${escapeHtml(summaryToShow || "")}</textarea>`
          : `<p class="summary-text">${escapeHtml(summaryToShow || "No summary")}</p>`
      }
    </div>
  `;

  return `
    <div class="${cardClass}" data-id="${change.id}">
      <div class="change-header" onclick="toggleCard('${change.id}')">
        <div class="change-title">
          <span class="type-badge">${change.type}</span>
          ${change.identifier ? `<span class="change-identifier">${escapeHtml(change.identifier)}</span>` : ""}
          <span class="change-name">${escapeHtml(change.name)}</span>
        </div>
        <div class="change-actions">
          <span class="action-badge ${actionClass}">${actionLabel}</span>
        </div>
      </div>
      <div class="change-body">
        ${diffHtml}
        ${summaryHtml}
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
          <button class="btn btn-sm ${isApproved ? "btn-success" : "btn-secondary"}" onclick="toggleApprove('${change.id}')">
            ${isApproved ? "✅ Approved" : "✓ Approve"}
          </button>
          <button class="btn btn-sm ${isRejected ? "btn-danger" : "btn-secondary"}" onclick="toggleReject('${change.id}')">
            ${isRejected ? "❌ Rejected" : "✗ Reject"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderChanges() {
  const changes = getFilteredChanges();

  if (changes.length === 0) {
    changesListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p>${preview ? "No changes match the current filter" : "No changes to preview"}</p>
      </div>
    `;
    footerEl.style.display = "none";
    return;
  }

  changesListEl.innerHTML = changes.map(renderChangeCard).join("");
  footerEl.style.display = "flex";
  updateSelectedCount();

  // Re-attach summary edit listeners
  document.querySelectorAll(".summary-edit").forEach((textarea) => {
    textarea.addEventListener("input", (e) => {
      const target = e.target as HTMLTextAreaElement;
      const id = target.dataset.id!;
      summaryEdits.set(id, target.value);
    });
  });
}

function updateSelectedCount() {
  const count = approved.size;
  selectedCountEl.textContent = String(count);
  applyBtn.disabled = count === 0 || isApplying;
}

function showLoading(show: boolean) {
  loadingEl.style.display = show ? "flex" : "none";
  if (show) {
    changesListEl.innerHTML = "";
    changesListEl.appendChild(loadingEl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions (exposed globally for onclick handlers)
// ─────────────────────────────────────────────────────────────────────────────

(window as any).toggleCard = (id: string) => {
  const card = document.querySelector(`.change-card[data-id="${id}"]`);
  card?.classList.toggle("expanded");
};

(window as any).toggleApprove = (id: string) => {
  if (approved.has(id)) {
    approved.delete(id);
  } else {
    approved.add(id);
    rejected.delete(id);
  }
  renderChanges();
};

(window as any).toggleReject = (id: string) => {
  if (rejected.has(id)) {
    rejected.delete(id);
  } else {
    rejected.add(id);
    approved.delete(id);
  }
  renderChanges();
};

// ─────────────────────────────────────────────────────────────────────────────
// API Interactions
// ─────────────────────────────────────────────────────────────────────────────

async function refresh() {
  showLoading(true);

  try {
    const result = await app.callServerTool({
      name: "linear_preview_sync",
      arguments: { includeCompleted: false },
    });

    if (result.structuredContent) {
      preview = result.structuredContent as SyncPreview;
      approved.clear();
      rejected.clear();
      summaryEdits.clear();
      renderStats();
      renderChanges();
    }
  } catch (error) {
    console.error("Failed to refresh:", error);
    changesListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <p>Failed to load preview</p>
        <p style="font-size: 0.875rem; color: var(--text-muted);">${error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    `;
  }

  showLoading(false);
}

async function applyChanges() {
  if (approved.size === 0 || isApplying) return;

  isApplying = true;
  applyBtn.disabled = true;
  applyBtn.textContent = "⏳ Applying...";

  try {
    const approvedChanges: ApprovedChange[] = Array.from(approved).map((id) => {
      const change = preview!.changes.find((c) => c.id === id)!;
      return {
        id,
        type: change.type,
        action: change.action,
        summaryOverride: summaryEdits.get(id),
      };
    });

    const result = await app.callServerTool({
      name: "linear_apply_sync",
      arguments: {
        approved: approvedChanges,
        rejected: Array.from(rejected),
      },
    });

    // Update model context with results
    await app.updateModelContext({
      content: [
        {
          type: "text",
          text: `Applied ${approvedChanges.length} Linear sync changes.`,
        },
      ],
      structuredContent: result.structuredContent,
    });

    // Refresh to show updated state
    await refresh();

    // Log success
    app.sendLog({
      level: "info",
      data: `Applied ${approvedChanges.length} changes`,
      logger: "LinearReview",
    });
  } catch (error) {
    console.error("Failed to apply:", error);
    app.sendLog({
      level: "error",
      data: { message: "Failed to apply changes", error: String(error) },
      logger: "LinearReview",
    });
  }

  isApplying = false;
  applyBtn.disabled = approved.size === 0;
  applyBtn.textContent = "🚀 Apply Selected";
}

function approveAll() {
  if (!preview) return;

  const filteredChanges = getFilteredChanges();
  filteredChanges.forEach((change) => {
    approved.add(change.id);
    rejected.delete(change.id);
  });

  renderChanges();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

// Filters
filtersEl.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains("filter-btn")) {
    // Update active state
    filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    target.classList.add("active");

    // Apply filter
    currentFilter = target.dataset.filter || "all";
    renderChanges();
  }
});

// Refresh button
refreshBtn.addEventListener("click", refresh);

// Approve all button
approveAllBtn.addEventListener("click", approveAll);

// Apply button
applyBtn.addEventListener("click", applyChanges);

// ─────────────────────────────────────────────────────────────────────────────
// MCP App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

// Receive initial tool result
app.ontoolresult = (result) => {
  if (result.structuredContent) {
    preview = result.structuredContent as SyncPreview;
    showLoading(false);
    renderStats();
    renderChanges();
  }
};

// Handle theme changes from host
app.onhostcontextchanged = (ctx) => {
  // Could apply theme here if needed
  console.log("Host context changed:", ctx);
};

// Connect to host
app.connect();

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
