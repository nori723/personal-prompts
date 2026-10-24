(function (root) {
  const STORAGE_KEY = "personalPromptsItems";
  const SETTINGS_KEY = "personalPromptsSettings";
  const CATEGORY_KEY = "personalPromptsCategories";

  // 精简改造前旧版扩展使用的键名；首次启动时把数据迁移到新键，旧键保留不删。
  const LEGACY_STORAGE_KEY = "qiaomuQuickPromptItems";
  const LEGACY_SETTINGS_KEY = "qiaomuQuickPromptSettings";
  const LEGACY_CATEGORY_KEY = "qiaomuQuickPromptCategories";

  const UNCATEGORY = "";

  const defaultSettings = {
    lastCategory: "全部"
  };

  // 原项目内置公共提示词的来源特征，用于「清理内置提示词」。
  const SEED_ID_PREFIXES = ["yao-", "gpt-image2-", "qiaomu-", "ai-boost-", "seed-"];

  function isExtensionStorageAvailable() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  // 开发预览回退：在普通浏览器标签页直接打开 sidepanel.html 时没有
  // chrome.storage，用 localStorage 模拟同一套接口，便于本地调试。
  function localStorageGet(keys) {
    const read = (key) => {
      try {
        const raw = root.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
      } catch (error) {
        return undefined;
      }
    };

    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach((key) => { result[key] = read(key); });
      return Promise.resolve(result);
    }

    if (typeof keys === "object" && keys !== null) {
      const result = {};
      Object.keys(keys).forEach((key) => {
        const value = read(key);
        result[key] = value === undefined ? keys[key] : value;
      });
      return Promise.resolve(result);
    }

    return Promise.resolve({ [keys]: read(keys) });
  }

  function localStorageSet(values) {
    Object.keys(values).forEach((key) => {
      try {
        root.localStorage.setItem(key, JSON.stringify(values[key]));
      } catch (error) {
        // 隐私模式等场景下 localStorage 不可写：写入失败不静默吞掉，
        // 交给上层按存储错误处理。
        return Promise.reject(error);
      }
    });
    return Promise.resolve();
  }

  function getFromStorage(keys) {
    if (isExtensionStorageAvailable()) {
      return chrome.storage.local.get(keys);
    }
    return localStorageGet(keys);
  }

  function setToStorage(values) {
    if (isExtensionStorageAvailable()) {
      return chrome.storage.local.set(values);
    }
    return localStorageSet(values);
  }

  // 所有「读取-修改-写回」操作都进入同一个队列串行执行，
  // 避免快速连续操作时互相覆盖。
  let writeChain = Promise.resolve();

  function enqueue(operation) {
    const run = writeChain.then(operation, operation);
    writeChain = run.catch(() => {});
    return run;
  }

  // 旧键数据一次性迁移到新键：新键尚无 items 时，把旧键内容原样复制过来。
  let migrationPromise = null;

  function migrateLegacyData() {
    if (migrationPromise) {
      return migrationPromise;
    }

    migrationPromise = (async () => {
      try {
        const current = await getFromStorage([STORAGE_KEY]);
        if (current[STORAGE_KEY] !== undefined) {
          return;
        }
        const legacy = await getFromStorage([LEGACY_STORAGE_KEY, LEGACY_SETTINGS_KEY, LEGACY_CATEGORY_KEY]);
        const updates = {};
        if (legacy[LEGACY_STORAGE_KEY] !== undefined) {
          updates[STORAGE_KEY] = legacy[LEGACY_STORAGE_KEY];
        }
        if (legacy[LEGACY_SETTINGS_KEY] !== undefined) {
          updates[SETTINGS_KEY] = legacy[LEGACY_SETTINGS_KEY];
        }
        if (legacy[LEGACY_CATEGORY_KEY] !== undefined) {
          updates[CATEGORY_KEY] = legacy[LEGACY_CATEGORY_KEY];
        }
        if (Object.keys(updates).length > 0) {
          await setToStorage(updates);
        }
      } catch (error) {
        migrationPromise = null;
      }
    })();

    return migrationPromise;
  }

  function newId() {
    return `prompt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function normalizeCategoryName(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function normalizeItem(item) {
    const now = new Date().toISOString();
    // 先展开原字段，保证历史数据里的附加字段（source、previewImage 等）不丢失。
    const normalized = Object.assign({}, item);
    normalized.id = String(item.id || "").trim() || newId();
    normalized.title = String(item.title || "").trim();
    normalized.content = String(item.content || "");
    normalized.category = normalizeCategoryName(item.category);
    // 「置顶」沿用原项目的 favorite 字段，兼容旧数据；同时接受 pinned 写法。
    if (item.favorite === undefined && item.pinned !== undefined) {
      normalized.favorite = Boolean(item.pinned);
    } else {
      normalized.favorite = Boolean(item.favorite);
    }
    normalized.usageCount = Number.isFinite(Number(item.usageCount)) ? Number(item.usageCount) : 0;
    normalized.createdAt = item.createdAt || now;
    normalized.updatedAt = item.updatedAt || normalized.createdAt || now;
    return normalized;
  }

  function readItems() {
    return migrateLegacyData().then(() => getFromStorage(STORAGE_KEY)).then((result) => {
      const value = result[STORAGE_KEY];
      // 首次安装时键不存在，返回空列表，但绝不回写空列表覆盖已有数据。
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(normalizeItem);
    });
  }

  function writeItems(items) {
    const normalized = items.map(normalizeItem);
    return setToStorage({ [STORAGE_KEY]: normalized }).then(() => normalized);
  }

  function getItems() {
    return readItems();
  }

  function saveItems(items) {
    return enqueue(() => writeItems(items));
  }

  function upsertItem(item) {
    return enqueue(async () => {
      const items = await readItems();
      const normalized = normalizeItem(Object.assign({}, item, {
        updatedAt: new Date().toISOString()
      }));
      const existingIndex = items.findIndex((candidate) => candidate.id === normalized.id);

      if (existingIndex >= 0) {
        normalized.createdAt = items[existingIndex].createdAt || normalized.createdAt;
        items[existingIndex] = normalized;
      } else {
        items.unshift(normalized);
      }

      return writeItems(items);
    });
  }

  function deleteItem(id) {
    return enqueue(async () => {
      const items = await readItems();
      return writeItems(items.filter((item) => item.id !== id));
    });
  }

  // 置顶 / 取消置顶：只改标记，不修改正文，因此不更新 updatedAt。
  function setPinned(id, pinned) {
    return enqueue(async () => {
      const items = await readItems();
      const nextItems = items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return Object.assign({}, item, { favorite: Boolean(pinned) });
      });
      return writeItems(nextItems);
    });
  }

  function recordUsage(id) {
    return enqueue(async () => {
      const items = await readItems();
      const now = new Date().toISOString();
      const nextItems = items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return Object.assign({}, item, {
          usageCount: Number(item.usageCount || 0) + 1,
          lastUsedAt: now
        });
      });
      await writeItems(nextItems);
      return nextItems.find((item) => item.id === id) || null;
    });
  }

  function getCategories() {
    return migrateLegacyData().then(() => getFromStorage(CATEGORY_KEY)).then((result) => {
      const value = result[CATEGORY_KEY];
      if (!Array.isArray(value)) {
        return [];
      }
      const seen = new Set();
      return value.map(normalizeCategoryName).filter((name) => {
        if (!name || seen.has(name)) {
          return false;
        }
        seen.add(name);
        return true;
      });
    });
  }

  function saveCategories(categories) {
    return enqueue(async () => {
      const seen = new Set();
      const normalized = (Array.isArray(categories) ? categories : [])
        .map(normalizeCategoryName)
        .filter((name) => {
          if (!name || seen.has(name)) {
            return false;
          }
          seen.add(name);
          return true;
        });
      await setToStorage({ [CATEGORY_KEY]: normalized });
      return normalized;
    });
  }

  function addCategory(name) {
    const cleanName = normalizeCategoryName(name);
    if (!cleanName) {
      return Promise.reject(new Error("分类名不能为空。"));
    }

    return enqueue(async () => {
      const categories = await getCategories();
      if (categories.includes(cleanName)) {
        throw new Error(`分类「${cleanName}」已存在。`);
      }
      const next = categories.concat([cleanName]);
      await setToStorage({ [CATEGORY_KEY]: next });
      return next;
    });
  }

  function renameCategory(oldName, newName) {
    const from = normalizeCategoryName(oldName);
    const to = normalizeCategoryName(newName);
    if (!from) {
      return Promise.reject(new Error("原分类名不能为空。"));
    }
    if (!to) {
      return Promise.reject(new Error("新分类名不能为空。"));
    }
    if (from === to) {
      return getCategories();
    }

    return enqueue(async () => {
      const categories = await getCategories();
      if (!categories.includes(from)) {
        throw new Error(`分类「${from}」不存在。`);
      }
      if (categories.includes(to)) {
        throw new Error(`分类「${to}」已存在。`);
      }

      const nextCategories = categories.map((name) => (name === from ? to : name));
      const items = await readItems();
      const movedItems = items.map((item) => {
        if (item.category !== from) {
          return item;
        }
        return Object.assign({}, item, {
          category: to,
          updatedAt: new Date().toISOString()
        });
      });

      await Promise.all([
        setToStorage({ [CATEGORY_KEY]: nextCategories }),
        writeItems(movedItems)
      ]);
      return { categories: nextCategories, items: movedItems };
    });
  }

  // 删除分类：该分类下的提示词移入「未分类」，不会丢失。
  function deleteCategory(name) {
    const target = normalizeCategoryName(name);
    if (!target) {
      return Promise.reject(new Error("分类名不能为空。"));
    }

    return enqueue(async () => {
      const categories = await getCategories();
      if (!categories.includes(target)) {
        throw new Error(`分类「${target}」不存在。`);
      }

      const nextCategories = categories.filter((name) => name !== target);
      const items = await readItems();
      let movedCount = 0;
      const movedItems = items.map((item) => {
        if (item.category !== target) {
          return item;
        }
        movedCount += 1;
        return Object.assign({}, item, { category: UNCATEGORY });
      });

      await Promise.all([
        setToStorage({ [CATEGORY_KEY]: nextCategories }),
        writeItems(movedItems)
      ]);
      return { categories: nextCategories, items: movedItems, movedCount };
    });
  }

  function getSettings() {
    return migrateLegacyData().then(() => getFromStorage(SETTINGS_KEY)).then((result) => {
      return Object.assign({}, defaultSettings, result[SETTINGS_KEY] || {});
    });
  }

  function saveSettings(settings) {
    return enqueue(async () => {
      const current = await getFromStorage(SETTINGS_KEY).then((result) => result[SETTINGS_KEY] || {});
      const nextSettings = Object.assign({}, current, defaultSettings, settings || {});
      await setToStorage({ [SETTINGS_KEY]: nextSettings });
      return nextSettings;
    });
  }

  function countSeedItems(items) {
    return items.filter(isSeedItem).length;
  }

  function isSeedItem(item) {
    const id = String(item.id || "");
    if (SEED_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) {
      return true;
    }
    return Boolean(item.source && typeof item.source === "object" && item.source.name);
  }

  // 清理原项目预置的公共提示词（需用户在设置里确认后调用）。
  function purgeSeedItems() {
    return enqueue(async () => {
      const items = await readItems();
      const kept = items.filter((item) => !isSeedItem(item));
      const removed = items.length - kept.length;
      if (removed > 0) {
        await writeItems(kept);
      }
      return removed;
    });
  }

  function deleteAllItems() {
    return enqueue(async () => {
      await setToStorage({ [STORAGE_KEY]: [] });
      return [];
    });
  }

  root.QuickPromptStore = {
    STORAGE_KEY,
    SETTINGS_KEY,
    CATEGORY_KEY,
    UNCATEGORY,
    newId,
    normalizeItem,
    normalizeCategoryName,
    isSeedItem,
    countSeedItems,
    getItems,
    saveItems,
    upsertItem,
    deleteItem,
    setPinned,
    recordUsage,
    getCategories,
    saveCategories,
    addCategory,
    renameCategory,
    deleteCategory,
    getSettings,
    saveSettings,
    purgeSeedItems,
    deleteAllItems
  };
})(globalThis);
