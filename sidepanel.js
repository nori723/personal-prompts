const state = {
  items: [],
  categories: [],
  settings: { lastCategory: "全部" },
  query: "",
  category: "全部",
  storageError: null,
  editorSnapshot: null,
  selectedId: null
};

const elements = {
  mainView: document.getElementById("mainView"),
  settingsPage: document.getElementById("settingsPage"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  backToMainButton: document.getElementById("backToMainButton"),
  searchInput: document.getElementById("searchInput"),
  newItemButton: document.getElementById("newItemButton"),
  errorBanner: document.getElementById("errorBanner"),
  errorBannerText: document.getElementById("errorBannerText"),
  categoryChips: document.getElementById("categoryChips"),
  manageCategoriesButton: document.getElementById("manageCategoriesButton"),
  promptList: document.getElementById("promptList"),
  editorDialog: document.getElementById("editorDialog"),
  editorForm: document.getElementById("editorForm"),
  editorTitle: document.getElementById("editorTitle"),
  editorCopyButton: document.getElementById("editorCopyButton"),
  itemId: document.getElementById("itemId"),
  titleInput: document.getElementById("titleInput"),
  categorySelect: document.getElementById("categorySelect"),
  pinToggle: document.getElementById("pinToggle"),
  contentInput: document.getElementById("contentInput"),
  editorTimestamps: document.getElementById("editorTimestamps"),
  deleteButton: document.getElementById("deleteButton"),
  cancelButton: document.getElementById("cancelButton"),
  saveButton: document.getElementById("saveButton"),
  statusLine: document.getElementById("statusLine"),
  categoryDialog: document.getElementById("categoryDialog"),
  categoryForm: document.getElementById("categoryForm"),
  closeCategoryDialogButton: document.getElementById("closeCategoryDialogButton"),
  newCategoryInput: document.getElementById("newCategoryInput"),
  categoryManageList: document.getElementById("categoryManageList"),
  confirmDialog: document.getElementById("confirmDialog"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmOkButton: document.getElementById("confirmOkButton"),
  confirmCancelButton: document.getElementById("confirmCancelButton"),
  exportButton: document.getElementById("exportButton"),
  importInput: document.getElementById("importInput"),
  dataStats: document.getElementById("dataStats"),
  purgeSeedsButton: document.getElementById("purgeSeedsButton"),
  deleteAllButton: document.getElementById("deleteAllButton"),
  toast: document.getElementById("toast")
};

const PIN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1Z"></path></svg>';
const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1600);
}

function setStatus(message) {
  elements.statusLine.textContent = message;
  if (message) {
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      elements.statusLine.textContent = "";
    }, 2400);
  }
}

// 确认对话框：返回 Promise<boolean>，危险操作用 danger 样式。
let confirmResolve = null;

function showConfirm(options) {
  const { title, message, okText = "确定", danger = false } = options;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmOkButton.textContent = okText;
  elements.confirmOkButton.classList.toggle("danger-button", danger);
  if (!elements.confirmDialog.open) {
    elements.confirmDialog.showModal();
  }
  elements.confirmCancelButton.focus();
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function settleConfirm(result) {
  if (!confirmResolve) {
    return;
  }
  const resolve = confirmResolve;
  confirmResolve = null;
  if (elements.confirmDialog.open) {
    elements.confirmDialog.close();
  }
  resolve(result);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatRelativeTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }
  if (diff < 2 * day) {
    return "昨天";
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} 天前`;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function legacyCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      if (document.execCommand("copy")) {
        resolve();
      } else {
        reject(new Error("copy failed"));
      }
    } catch (error) {
      reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return legacyCopy(text);
}

function displayCategory(item) {
  return item.category || "未分类";
}

function getCategoryCounts() {
  const counts = new Map();
  state.categories.forEach((name) => counts.set(name, 0));
  let uncategorized = 0;

  state.items.forEach((item) => {
    if (item.category && counts.has(item.category)) {
      counts.set(item.category, counts.get(item.category) + 1);
    } else if (item.category) {
      // 历史数据里存在但未登记的分类，补进列表保证可见。
      counts.set(item.category, 1);
    } else {
      uncategorized += 1;
    }
  });

  return { counts, uncategorized };
}

function getAllCategories() {
  const { counts } = getCategoryCounts();
  const known = new Set(state.categories);
  const extra = Array.from(counts.keys())
    .filter((name) => !known.has(name))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  return state.categories.concat(extra);
}

// 排序规则：置顶优先；同组内按手动排序（order），旧数据按最近修改时间兜底。
function compareItems(a, b) {
  if (a.favorite !== b.favorite) {
    return a.favorite ? -1 : 1;
  }
  if (a.order != null && b.order != null && a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.order != null && b.order == null) {
    return -1;
  }
  if (a.order == null && b.order != null) {
    return 1;
  }
  return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
}

// 旧数据没有 order 字段：按当前排序补一次手动顺序，此后卡片可拖动排序。
async function ensureManualOrder() {
  if (!state.items.some((item) => item.order == null)) {
    return;
  }
  const sorted = [...state.items].sort(compareItems);
  sorted.forEach((item, index) => {
    item.order = index;
  });
  try {
    state.items = await window.QuickPromptStore.saveItems(sorted);
  } catch (error) {
    // 迁移失败不影响展示，下次启动重试。
  }
}

function matchesQuery(item) {
  if (!state.query) {
    return true;
  }
  const query = state.query.toLowerCase();
  return item.title.toLowerCase().includes(query)
    || item.content.toLowerCase().includes(query);
}

function getVisibleItems() {
  return state.items
    .filter((item) => {
      if (state.category === "全部") {
        return true;
      }
      if (state.category === "未分类") {
        return !item.category;
      }
      return item.category === state.category;
    })
    .filter(matchesQuery)
    .sort(compareItems);
}

function renderCategories() {
  const { counts, uncategorized } = getCategoryCounts();
  const all = getAllCategories();
  const chips = [{ name: "全部", count: state.items.length }];

  all.forEach((name) => {
    chips.push({ name, count: counts.get(name) || 0 });
  });
  chips.push({ name: "未分类", count: uncategorized });

  elements.categoryChips.innerHTML = chips.map((chip) => `
    <button class="chip ${chip.name === state.category ? "is-active" : ""}"
      data-category="${escapeHtml(chip.name)}" type="button">
      ${escapeHtml(chip.name)}<span class="chip-count">${chip.count}</span>
    </button>
  `).join("");
}

function renderList() {
  if (state.storageError) {
    elements.promptList.innerHTML = `
      <div class="empty-state is-error">
        <strong>数据读取失败</strong>
        <span>${escapeHtml(state.storageError)}</span>
        <span>为保护数据，写入操作已暂停。请重新打开侧边栏重试。</span>
      </div>
    `;
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    elements.promptList.innerHTML = `
      <div class="empty-state">
        <strong>提示词库还是空的</strong>
        <span>把常用的提示词存进来，随用随复制。</span>
        <button class="primary-button" id="emptyNewButton" type="button">新建提示词</button>
      </div>
    `;
    const emptyNewButton = document.getElementById("emptyNewButton");
    if (emptyNewButton) {
      emptyNewButton.addEventListener("click", openNewEditor);
    }
    return;
  }

  if (!visibleItems.length) {
    elements.promptList.innerHTML = `
      <div class="empty-state">
        <strong>没有匹配的提示词</strong>
        <span>换个关键词，或切换到其他分类看看。</span>
      </div>
    `;
    return;
  }

  elements.promptList.innerHTML = visibleItems.map((item) => `
    <article class="prompt-card ${item.id === state.selectedId ? "is-selected" : ""}" data-id="${escapeHtml(item.id)}" tabindex="0" role="button"
      aria-label="编辑「${escapeHtml(item.title)}」">
      <div class="prompt-main">
        <div class="prompt-title-row">
          ${item.favorite ? `<span class="pin-mark" title="已置顶">${PIN_ICON}</span>` : ""}
          <h2>${escapeHtml(item.title)}</h2>
        </div>
        <p class="prompt-preview">${escapeHtml(item.content)}</p>
        <div class="meta-row">
          <span class="meta-category">${escapeHtml(displayCategory(item))}</span>
          <span class="meta-dot" aria-hidden="true">·</span>
          <span>修改于 ${escapeHtml(formatRelativeTime(item.updatedAt))}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="icon-button card-action ${item.favorite ? "is-pinned" : ""}"
          data-pin-id="${escapeHtml(item.id)}" type="button"
          title="${item.favorite ? "取消置顶" : "置顶"}" aria-label="${item.favorite ? "取消置顶" : "置顶"}">
          ${PIN_ICON}
        </button>
        <button class="icon-button card-action" data-copy-id="${escapeHtml(item.id)}" type="button"
          title="复制全文" aria-label="复制「${escapeHtml(item.title)}」">
          ${COPY_ICON}
        </button>
      </div>
      <span class="drag-handle card-drag-handle" data-card-drag-handle="${escapeHtml(item.id)}"
        title="按住可上下拖动排序" aria-hidden="true">
        <svg viewBox="0 0 8 14">
          <circle cx="2" cy="2" r="1.3"></circle>
          <circle cx="6" cy="2" r="1.3"></circle>
          <circle cx="2" cy="7" r="1.3"></circle>
          <circle cx="6" cy="7" r="1.3"></circle>
          <circle cx="2" cy="12" r="1.3"></circle>
          <circle cx="6" cy="12" r="1.3"></circle>
        </svg>
      </span>
    </article>
  `).join("");
}

function renderDataStats() {
  elements.dataStats.textContent = `共 ${state.items.length} 条提示词，${state.categories.length} 个分类。`;

  const seedCount = window.QuickPromptStore.countSeedItems(state.items);
  elements.purgeSeedsButton.hidden = seedCount === 0;
  elements.purgeSeedsButton.textContent = `清理内置公共提示词（${seedCount}）`;
}

function renderAll() {
  renderCategories();
  renderList();
  renderDataStats();
}

function showSettings() {
  elements.mainView.hidden = true;
  elements.settingsPage.hidden = false;
}

function showMainView() {
  elements.settingsPage.hidden = true;
  elements.mainView.hidden = false;
}

function guardStorage() {
  if (state.storageError) {
    showToast("存储不可用，已暂停写入以保护数据");
    return false;
  }
  return true;
}

/* ---------- 编辑器 ---------- */

function isEditorDirty() {
  if (!state.editorSnapshot) {
    return false;
  }
  const snapshot = state.editorSnapshot;
  return elements.titleInput.value !== snapshot.title
    || elements.categorySelect.value !== snapshot.category
    || elements.pinToggle.getAttribute("aria-checked") !== String(snapshot.pinned)
    || elements.contentInput.value !== snapshot.content;
}

function setPinnedToggle(value) {
  elements.pinToggle.setAttribute("aria-checked", String(Boolean(value)));
}

function isPinnedToggleOn() {
  return elements.pinToggle.getAttribute("aria-checked") === "true";
}

function fillCategoryOptions(selected) {
  const options = getAllCategories();
  const values = ["", ...options];
  if (selected && !values.includes(selected)) {
    values.push(selected);
  }

  elements.categorySelect.innerHTML = values.map((value) => `
    <option value="${escapeHtml(value)}">${escapeHtml(value || "未分类")}</option>
  `).join("");
  elements.categorySelect.value = selected || "";
}

function openEditor(item) {
  const isNew = !item;
  state.selectedId = isNew ? null : item.id;
  renderList();
  state.editorSnapshot = {
    title: isNew ? "" : item.title,
    category: isNew ? (state.category !== "全部" && state.category !== "未分类" ? state.category : "") : (item.category || ""),
    pinned: isNew ? false : Boolean(item.favorite),
    content: isNew ? "" : item.content
  };

  elements.editorTitle.textContent = isNew ? "新建提示词" : "编辑提示词";
  elements.itemId.value = isNew ? "" : item.id;
  elements.titleInput.value = state.editorSnapshot.title;
  fillCategoryOptions(state.editorSnapshot.category);
  setPinnedToggle(state.editorSnapshot.pinned);
  elements.contentInput.value = state.editorSnapshot.content;
  elements.deleteButton.hidden = isNew;
  elements.statusLine.textContent = "";

  if (isNew) {
    elements.editorTimestamps.textContent = "";
    elements.editorTimestamps.hidden = true;
  } else {
    const created = formatDateTime(item.createdAt);
    const updated = formatDateTime(item.updatedAt);
    elements.editorTimestamps.textContent = created === updated
      ? `创建于 ${created}`
      : `创建于 ${created} · 修改于 ${updated}`;
    elements.editorTimestamps.hidden = false;
  }

  if (!elements.editorDialog.open) {
    elements.editorDialog.showModal();
  }
  elements.titleInput.focus();
}

function openNewEditor() {
  if (!guardStorage()) {
    return;
  }
  openEditor(null);
}

function attemptCloseEditor() {
  if (!elements.editorDialog.open) {
    return;
  }
  if (!isEditorDirty()) {
    elements.editorDialog.close();
    return;
  }

  showConfirm({
    title: "放弃未保存的修改？",
    message: "当前提示词的修改还没有保存。",
    okText: "放弃修改",
    danger: true
  }).then((confirmed) => {
    if (confirmed) {
      state.editorSnapshot = null;
      elements.editorDialog.close();
    }
  });
}

async function saveCurrentItem(event) {
  event.preventDefault();
  if (!guardStorage()) {
    return;
  }

  const title = elements.titleInput.value.trim();
  const content = elements.contentInput.value;

  if (!title) {
    elements.titleInput.focus();
    setStatus("请填写标题。");
    return;
  }
  if (!content.trim()) {
    elements.contentInput.focus();
    setStatus("请填写正文。");
    return;
  }

  const id = elements.itemId.value;
  const savedId = id || window.QuickPromptStore.newId();
  const existing = id ? state.items.find((item) => item.id === id) : null;
  // 新建条目排在最前；已有条目保留原手动顺序。
  const minOrder = state.items.reduce((min, item) => {
    return item.order != null && item.order < min ? item.order : min;
  }, 0);

  try {
    state.items = await window.QuickPromptStore.upsertItem({
      id: savedId,
      title,
      content,
      category: elements.categorySelect.value,
      favorite: isPinnedToggleOn(),
      order: existing ? existing.order : minOrder - 1,
      createdAt: existing ? existing.createdAt : undefined,
      updatedAt: undefined
    });
    state.selectedId = savedId;
    state.editorSnapshot = null;
    elements.editorDialog.close();
    renderAll();
    showToast("已保存");
  } catch (error) {
    setStatus(`保存失败：${error.message}`);
    showToast("保存失败");
  }
}

async function deleteCurrentItem() {
  const id = elements.itemId.value;
  const item = id ? state.items.find((candidate) => candidate.id === id) : null;
  if (!item) {
    return;
  }
  if (!guardStorage()) {
    return;
  }

  const confirmed = await showConfirm({
    title: `删除「${item.title}」？`,
    message: "删除后无法恢复。",
    okText: "删除",
    danger: true
  });
  if (!confirmed) {
    return;
  }

  try {
    state.items = await window.QuickPromptStore.deleteItem(item.id);
    state.selectedId = null;
    state.editorSnapshot = null;
    elements.editorDialog.close();
    renderAll();
    showToast("已删除");
  } catch (error) {
    setStatus(`删除失败：${error.message}`);
    showToast("删除失败");
  }
}

async function copyItemById(id, button) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) {
    return;
  }

  try {
    await copyText(item.content);
    showToast(`已复制：${item.title}`);
    if (button) {
      button.classList.add("is-copied");
      window.clearTimeout(button.copyTimer);
      button.copyTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
      }, 1200);
    }
  } catch (error) {
    showToast("复制失败");
  }
}

async function togglePin(id) {
  if (!guardStorage()) {
    return;
  }
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) {
    return;
  }

  try {
    state.items = await window.QuickPromptStore.setPinned(id, !item.favorite);
    renderAll();
    showToast(item.favorite ? "已取消置顶" : "已置顶");
  } catch (error) {
    showToast("操作失败");
  }
}

/* ---------- 分类管理 ---------- */

function renderCategoryManager() {
  const { counts, uncategorized } = getCategoryCounts();
  const all = getAllCategories();

  const rows = all.map((name) => `
    <li class="category-manage-item" data-name="${escapeHtml(name)}">
      <span class="drag-handle item-drag-handle" data-cat-drag-handle="${escapeHtml(name)}"
        title="按住可上下拖动排序" aria-hidden="true">
        <svg viewBox="0 0 8 14">
          <circle cx="2" cy="2" r="1.3"></circle>
          <circle cx="6" cy="2" r="1.3"></circle>
          <circle cx="2" cy="7" r="1.3"></circle>
          <circle cx="6" cy="7" r="1.3"></circle>
          <circle cx="2" cy="12" r="1.3"></circle>
          <circle cx="6" cy="12" r="1.3"></circle>
        </svg>
      </span>
      <span class="category-manage-name">${escapeHtml(name)}</span>
      <span class="category-manage-count">${counts.get(name) || 0} 条</span>
      <button class="text-button" data-rename-category="${escapeHtml(name)}" type="button">重命名</button>
      <button class="text-button danger-text" data-delete-category="${escapeHtml(name)}" type="button">删除</button>
    </li>
  `).join("");

  const uncategorizedRow = `
    <li class="category-manage-item is-muted">
      <span class="category-manage-name">未分类</span>
      <span class="category-manage-count">${uncategorized} 条</span>
      <span class="category-manage-placeholder"></span>
    </li>
  `;

  elements.categoryManageList.innerHTML = rows + uncategorizedRow;

  if (!all.length) {
    elements.categoryManageList.innerHTML = `
      <li class="category-manage-empty">还没有分类，在上方输入名称添加一个。</li>
    ` + uncategorizedRow;
  }
}

function openCategoryManager() {
  elements.newCategoryInput.value = "";
  renderCategoryManager();
  if (!elements.categoryDialog.open) {
    elements.categoryDialog.showModal();
  }
}

async function addCategoryFromInput() {
  const name = elements.newCategoryInput.value.trim();
  if (!name) {
    showToast("请输入分类名称");
    return;
  }
  if (!guardStorage()) {
    return;
  }

  try {
    state.categories = await window.QuickPromptStore.addCategory(name);
    elements.newCategoryInput.value = "";
    elements.newCategoryInput.focus();
    renderCategoryManager();
    renderAll();
    showToast("已添加分类");
  } catch (error) {
    showToast(error.message);
  }
}

async function renameCategoryFlow(name) {
  const item = elements.categoryManageList.querySelector(`[data-name="${window.CSS.escape(name)}"]`);
  if (!item) {
    return;
  }

  const nameSpan = item.querySelector(".category-manage-name");
  const originalName = nameSpan.textContent;
  nameSpan.innerHTML = `
    <input class="rename-input" type="text" maxlength="20" value="${escapeHtml(originalName)}">
  `;
  const input = nameSpan.querySelector("input");
  input.focus();
  input.select();

  const actions = item.querySelectorAll("button");
  actions.forEach((button) => { button.hidden = true; });
  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "text-button";
  confirmButton.textContent = "确定";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "text-button";
  cancelButton.textContent = "取消";
  item.appendChild(confirmButton);
  item.appendChild(cancelButton);

  const finish = () => {
    renderCategoryManager();
  };

  const submit = async () => {
    const newName = input.value.trim();
    if (!newName || newName === originalName) {
      finish();
      return;
    }
    if (!guardStorage()) {
      finish();
      return;
    }

    try {
      const result = await window.QuickPromptStore.renameCategory(originalName, newName);
      state.categories = result.categories;
      state.items = result.items;
      if (state.category === originalName) {
        state.category = newName;
        persistLastCategory();
      }
      renderAll();
      showToast("已重命名");
    } catch (error) {
      showToast(error.message);
    }
    finish();
  };

  confirmButton.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  cancelButton.addEventListener("click", finish);
}

async function deleteCategoryFlow(name) {
  const { counts } = getCategoryCounts();
  const count = counts.get(name) || 0;
  const message = count > 0
    ? `该分类下有 ${count} 条提示词，删除后将移入「未分类」。`
    : "该分类下没有提示词。";

  const confirmed = await showConfirm({
    title: `删除分类「${name}」？`,
    message,
    okText: "删除分类",
    danger: true
  });
  if (!confirmed) {
    return;
  }
  if (!guardStorage()) {
    return;
  }

  try {
    const result = await window.QuickPromptStore.deleteCategory(name);
    state.categories = result.categories;
    state.items = result.items;
    if (state.category === name) {
      state.category = "全部";
      persistLastCategory();
    }
    renderCategoryManager();
    renderAll();
    showToast(result.movedCount > 0 ? `已删除分类，${result.movedCount} 条提示词移入未分类` : "已删除分类");
  } catch (error) {
    showToast(error.message);
  }
}

/* ---------- 分类管理（含左侧把手拖动排序） ---------- */

let dragCategory = null;

function clearCategoryDragMarks() {
  elements.categoryManageList.querySelectorAll(".is-dragging, .is-drop-target")
    .forEach((el) => el.classList.remove("is-dragging", "is-drop-target"));
}

// 管理列表内上下拖动：把被拖分类移动到目标分类前/后并保存完整顺序。
async function reorderCategories(dragName, targetName, insertBefore) {
  if (!guardStorage()) {
    return;
  }
  const all = getAllCategories();
  const from = all.indexOf(dragName);
  const to = all.indexOf(targetName);
  if (from < 0 || to < 0 || from === to) {
    return;
  }

  all.splice(from, 1);
  let index = all.indexOf(targetName);
  if (!insertBefore) {
    index += 1;
  }
  all.splice(index, 0, dragName);

  try {
    state.categories = await window.QuickPromptStore.saveCategories(all);
    renderCategoryManager();
    renderAll();
  } catch (error) {
    showToast("排序保存失败");
  }
}

/* ---------- 提示词卡片拖动排序 ---------- */

let dragItemId = null;

function clearCardDragMarks() {
  elements.promptList.querySelectorAll(".is-dragging, .is-drop-target")
    .forEach((el) => el.classList.remove("is-dragging", "is-drop-target"));
}

// 把被拖卡片移动到目标卡片前/后，并重排全局手动顺序。
async function reorderItems(dragId, targetId, insertBefore) {
  if (!guardStorage()) {
    return;
  }
  const sorted = [...state.items].sort(compareItems);
  const from = sorted.findIndex((item) => item.id === dragId);
  const to = sorted.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) {
    return;
  }

  const [moved] = sorted.splice(from, 1);
  let index = sorted.findIndex((item) => item.id === targetId);
  if (!insertBefore) {
    index += 1;
  }
  sorted.splice(index, 0, moved);
  sorted.forEach((item, i) => {
    item.order = i;
  });

  try {
    state.items = await window.QuickPromptStore.saveItems(sorted);
    renderAll();
  } catch (error) {
    showToast("排序保存失败");
  }
}

/* ---------- 备份导入导出 ---------- */

function exportData() {
  if (state.storageError) {
    showToast("存储不可用，无法导出");
    return;
  }

  const payload = {
    app: "提示词",
    version: 2,
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    items: state.items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `prompts-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("已导出备份文件");
}

function validateImportPayload(parsed) {
  const source = Array.isArray(parsed) ? { items: parsed } : parsed;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("文件不是有效的 JSON 对象。");
  }
  if (!Array.isArray(source.items)) {
    throw new Error("文件中没有 items 数组。");
  }

  source.items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`第 ${index + 1} 条不是有效的提示词对象。`);
    }
    if (typeof item.content !== "string" || !item.content.trim()) {
      const label = typeof item.title === "string" && item.title ? `「${item.title}」` : `第 ${index + 1} 条`;
      throw new Error(`${label}缺少正文内容。`);
    }
    if (typeof item.title !== "string") {
      throw new Error(`第 ${index + 1} 条的标题格式不正确。`);
    }
  });

  if (source.categories !== undefined && !Array.isArray(source.categories)) {
    throw new Error("categories 字段格式不正确，应为数组。");
  }

  return source;
}

async function importData(file) {
  if (!file) {
    return;
  }
  if (!guardStorage()) {
    elements.importInput.value = "";
    return;
  }

  let source;
  try {
    const text = await file.text();
    source = validateImportPayload(JSON.parse(text));
  } catch (error) {
    showToast("导入失败");
    await showConfirm({
      title: "导入失败",
      message: `文件格式无效：${error.message} 原有数据未做任何改动。`,
      okText: "知道了"
    });
    elements.importInput.value = "";
    return;
  }

  const incomingItems = source.items.map(window.QuickPromptStore.normalizeItem);
  const incomingCategories = Array.isArray(source.categories)
    ? source.categories.map((name) => String(name).trim()).filter(Boolean)
    : [];

  const existingIds = new Set(state.items.map((item) => item.id));
  let updateCount = 0;
  let addCount = 0;
  incomingItems.forEach((item) => {
    if (existingIds.has(item.id)) {
      updateCount += 1;
    } else {
      addCount += 1;
    }
  });

  const existingCategorySet = new Set(state.categories);
  const newCategoryCount = incomingCategories.filter((name) => !existingCategorySet.has(name)).length;

  const summaryParts = [`新增 ${addCount} 条`];
  if (updateCount > 0) {
    summaryParts.push(`更新 ${updateCount} 条（相同 ID 会被备份版本覆盖）`);
  }
  if (newCategoryCount > 0) {
    summaryParts.push(`新增分类 ${newCategoryCount} 个`);
  }

  const confirmed = await showConfirm({
    title: "确认导入？",
    message: `文件中共 ${incomingItems.length} 条提示词：${summaryParts.join("，")}。除上述内容外，现有数据保持不变。`,
    okText: "导入"
  });
  if (!confirmed) {
    elements.importInput.value = "";
    return;
  }

  try {
    const existingById = new Map(state.items.map((item) => [item.id, item]));
    incomingItems.forEach((item) => {
      existingById.set(item.id, item);
    });
    state.items = await window.QuickPromptStore.saveItems(Array.from(existingById.values()));

    const mergedCategories = state.categories.slice();
    incomingCategories.forEach((name) => {
      if (!mergedCategories.includes(name)) {
        mergedCategories.push(name);
      }
    });
    state.categories = await window.QuickPromptStore.saveCategories(mergedCategories);

    await ensureManualOrder();
    renderAll();
    showToast(`导入完成：新增 ${addCount} 条${updateCount ? `，更新 ${updateCount} 条` : ""}`);
  } catch (error) {
    showToast("导入失败");
    await showConfirm({
      title: "导入失败",
      message: `写入存储时出错：${error.message}`,
      okText: "知道了"
    });
  } finally {
    elements.importInput.value = "";
  }
}

async function purgeSeeds() {
  const seedCount = window.QuickPromptStore.countSeedItems(state.items);
  if (!seedCount) {
    return;
  }

  const confirmed = await showConfirm({
    title: "清理内置公共提示词？",
    message: `将移除 ${seedCount} 条随旧版本预置的公共提示词。你自己创建或编辑过的提示词不受影响，删除后无法恢复。`,
    okText: "清理",
    danger: true
  });
  if (!confirmed) {
    return;
  }

  try {
    const removed = await window.QuickPromptStore.purgeSeedItems();
    state.items = await window.QuickPromptStore.getItems();
    renderAll();
    showToast(`已清理 ${removed} 条内置提示词`);
  } catch (error) {
    showToast("清理失败");
  }
}

async function deleteAllData() {
  const confirmed = await showConfirm({
    title: "清空全部提示词？",
    message: `将删除全部 ${state.items.length} 条提示词，且无法恢复。建议先导出备份。`,
    okText: "全部删除",
    danger: true
  });
  if (!confirmed) {
    return;
  }

  try {
    state.items = await window.QuickPromptStore.deleteAllItems();
    state.category = "全部";
    renderAll();
    showToast("已清空全部提示词");
  } catch (error) {
    showToast("操作失败");
  }
}

/* ---------- 其他 ---------- */

async function persistLastCategory() {
  try {
    state.settings = await window.QuickPromptStore.saveSettings({ lastCategory: state.category });
  } catch (error) {
    // 记忆筛选分类失败不影响主流程。
  }
}

function selectCategory(name) {
  state.category = name;
  persistLastCategory();
  renderAll();
}

function handleListClick(event) {
  const pinButton = event.target.closest("[data-pin-id]");
  if (pinButton) {
    togglePin(pinButton.dataset.pinId);
    return;
  }

  const copyButton = event.target.closest("[data-copy-id]");
  if (copyButton) {
    copyItemById(copyButton.dataset.copyId, copyButton);
    return;
  }

  const card = event.target.closest(".prompt-card");
  if (card) {
    const item = state.items.find((candidate) => candidate.id === card.dataset.id);
    if (item) {
      openEditor(item);
    }
  }
}

function handleListKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  const card = event.target.closest(".prompt-card");
  if (card && event.target === card) {
    event.preventDefault();
    const item = state.items.find((candidate) => candidate.id === card.dataset.id);
    if (item) {
      openEditor(item);
    }
  }
}

async function init() {
  try {
    const [items, categories, settings] = await Promise.all([
      window.QuickPromptStore.getItems(),
      window.QuickPromptStore.getCategories(),
      window.QuickPromptStore.getSettings()
    ]);
    state.items = items;
    state.categories = categories;
    state.settings = settings;
  } catch (error) {
    state.storageError = error && error.message ? error.message : "无法访问本地存储。";
    state.items = [];
    state.categories = [];
  }

  if (!state.storageError) {
    await ensureManualOrder();
  }

  const savedCategory = state.settings.lastCategory;
  if (!state.storageError && savedCategory
    && (savedCategory === "全部" || savedCategory === "未分类"
      || state.categories.includes(savedCategory))) {
    state.category = savedCategory;
  }

  renderAll();
}

/* ---------- 编辑窗口上下拖动 ---------- */

function initEditorDrag() {
  const dialog = elements.editorDialog;
  const heading = document.getElementById("editorHeading");
  let dragging = false;
  let startY = 0;
  let startTop = 0;

  heading.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, textarea, select")) {
      return;
    }
    dragging = true;
    const rect = dialog.getBoundingClientRect();
    // 固定定位后仅调整 top，实现上下拖动。
    dialog.style.margin = "0";
    dialog.style.left = `${rect.left}px`;
    dialog.style.top = `${rect.top}px`;
    startY = event.clientY;
    startTop = rect.top;
    heading.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  heading.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }
    const maxTop = Math.max(window.innerHeight - dialog.offsetHeight - 8, 8);
    const nextTop = Math.min(Math.max(startTop + (event.clientY - startY), 8), maxTop);
    dialog.style.top = `${nextTop}px`;
  });

  const stopDrag = (event) => {
    dragging = false;
    if (heading.hasPointerCapture && heading.hasPointerCapture(event.pointerId)) {
      heading.releasePointerCapture(event.pointerId);
    }
  };
  heading.addEventListener("pointerup", stopDrag);
  heading.addEventListener("pointercancel", stopDrag);

  // 关闭后还原位置，下次打开仍居中。
  dialog.addEventListener("close", () => {
    dialog.style.margin = "";
    dialog.style.left = "";
    dialog.style.top = "";
  });
}

initEditorDrag();

/* ---------- 事件绑定 ---------- */

elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim();
  renderList();
});

elements.categoryChips.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]");
  if (chip) {
    selectCategory(chip.dataset.category);
  }
});

/* 卡片拖动：从右下角把手按下才允许拖动 */
elements.promptList.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-card-drag-handle]");
  if (!handle) {
    return;
  }
  const card = handle.closest(".prompt-card");
  if (card) {
    card.draggable = true;
  }
});

elements.promptList.addEventListener("click", (event) => {
  // 点按把手不打开编辑器
  if (event.target.closest("[data-card-drag-handle]")) {
    event.stopPropagation();
  }
}, true);

elements.promptList.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".prompt-card[draggable=\"true\"]");
  if (!card) {
    return;
  }
  dragItemId = card.dataset.id;
  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  try {
    event.dataTransfer.setData("text/plain", dragItemId);
  } catch (error) {
    // setData 失败不影响排序逻辑。
  }
});

elements.promptList.addEventListener("dragend", () => {
  dragItemId = null;
  clearCardDragMarks();
  elements.promptList.querySelectorAll(".prompt-card[draggable=\"true\"]")
    .forEach((card) => { card.draggable = false; });
});

elements.promptList.addEventListener("dragover", (event) => {
  if (!dragItemId) {
    return;
  }
  const card = event.target.closest(".prompt-card");
  if (!card || card.dataset.id === dragItemId) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  elements.promptList.querySelectorAll(".is-drop-target").forEach((el) => {
    if (el !== card) {
      el.classList.remove("is-drop-target");
    }
  });
  card.classList.add("is-drop-target");
});

elements.promptList.addEventListener("drop", (event) => {
  if (!dragItemId) {
    return;
  }
  const card = event.target.closest(".prompt-card");
  if (card && card.dataset.id !== dragItemId) {
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    reorderItems(dragItemId, card.dataset.id, event.clientY < rect.top + rect.height / 2);
  }
  dragItemId = null;
  clearCardDragMarks();
  elements.promptList.querySelectorAll(".prompt-card[draggable=\"true\"]")
    .forEach((item) => { item.draggable = false; });
});

elements.manageCategoriesButton.addEventListener("click", openCategoryManager);
elements.promptList.addEventListener("click", handleListClick);
elements.promptList.addEventListener("keydown", handleListKeydown);

elements.newItemButton.addEventListener("click", openNewEditor);
elements.openSettingsButton.addEventListener("click", showSettings);
elements.backToMainButton.addEventListener("click", showMainView);

elements.editorForm.addEventListener("submit", saveCurrentItem);
elements.cancelButton.addEventListener("click", attemptCloseEditor);
elements.deleteButton.addEventListener("click", deleteCurrentItem);
elements.editorCopyButton.addEventListener("click", () => {
  const content = elements.contentInput.value;
  if (!content) {
    setStatus("没有可复制的内容。");
    return;
  }
  copyText(content).then(() => {
    showToast("已复制全文");
  }).catch(() => {
    showToast("复制失败");
  });
});
elements.pinToggle.addEventListener("click", () => {
  setPinnedToggle(!isPinnedToggleOn());
});

elements.editorDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  attemptCloseEditor();
});
elements.editorDialog.addEventListener("click", (event) => {
  if (event.target === elements.editorDialog) {
    attemptCloseEditor();
  }
});

elements.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addCategoryFromInput();
});
elements.closeCategoryDialogButton.addEventListener("click", () => {
  elements.categoryDialog.close();
});
/* 管理列表拖动：从左侧把手按下才允许拖动 */
elements.categoryManageList.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-cat-drag-handle]");
  if (!handle) {
    return;
  }
  const item = handle.closest(".category-manage-item");
  if (item) {
    item.draggable = true;
  }
});

elements.categoryManageList.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".category-manage-item[draggable=\"true\"]");
  if (!item || !item.querySelector("[data-cat-drag-handle]")) {
    return;
  }
  dragCategory = item.dataset.name;
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  try {
    event.dataTransfer.setData("text/plain", dragCategory);
  } catch (error) {
    // setData 失败不影响排序逻辑。
  }
});

elements.categoryManageList.addEventListener("dragend", () => {
  dragCategory = null;
  clearCategoryDragMarks();
  elements.categoryManageList.querySelectorAll("[draggable=\"true\"]")
    .forEach((item) => { item.draggable = false; });
});

elements.categoryManageList.addEventListener("dragover", (event) => {
  if (!dragCategory) {
    return;
  }
  const item = event.target.closest(".category-manage-item");
  if (!item || !item.querySelector("[data-cat-drag-handle]") || item.dataset.name === dragCategory) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  elements.categoryManageList.querySelectorAll(".is-drop-target").forEach((el) => {
    if (el !== item) {
      el.classList.remove("is-drop-target");
    }
  });
  item.classList.add("is-drop-target");
});

elements.categoryManageList.addEventListener("drop", (event) => {
  if (!dragCategory) {
    return;
  }
  const item = event.target.closest(".category-manage-item");
  if (item && item.querySelector("[data-cat-drag-handle]") && item.dataset.name !== dragCategory) {
    event.preventDefault();
    const rect = item.getBoundingClientRect();
    reorderCategories(dragCategory, item.dataset.name, event.clientY < rect.top + rect.height / 2);
  }
  dragCategory = null;
  clearCategoryDragMarks();
  elements.categoryManageList.querySelectorAll("[draggable=\"true\"]")
    .forEach((entry) => { entry.draggable = false; });
});

elements.categoryManageList.addEventListener("click", (event) => {
  const renameButton = event.target.closest("[data-rename-category]");
  if (renameButton) {
    renameCategoryFlow(renameButton.dataset.renameCategory);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-category]");
  if (deleteButton) {
    deleteCategoryFlow(deleteButton.dataset.deleteCategory);
  }
});

elements.confirmOkButton.addEventListener("click", () => settleConfirm(true));
elements.confirmCancelButton.addEventListener("click", () => settleConfirm(false));
elements.confirmDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  settleConfirm(false);
});
elements.confirmDialog.addEventListener("click", (event) => {
  if (event.target === elements.confirmDialog) {
    settleConfirm(false);
  }
});

elements.exportButton.addEventListener("click", exportData);
elements.importInput.addEventListener("change", () => importData(elements.importInput.files[0]));
elements.purgeSeedsButton.addEventListener("click", purgeSeeds);
elements.deleteAllButton.addEventListener("click", deleteAllData);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const target = event.target;
    const isTypingTarget = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement;
    if (!isTypingTarget) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  }
});

init();
