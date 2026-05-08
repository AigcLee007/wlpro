const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

const GENERATION_RECORD_FILE = path.join(__dirname, "generation-records.json");
const GENERATION_RECORD_VERSION = 1;
const RECORD_LIMIT = 10000;
const RECORD_RETENTION_DAYS = Math.max(
  1,
  Number.parseInt(String(process.env.GENERATION_RECORD_SUCCESS_RETENTION_DAYS || "5"), 10) || 5,
);
const STALE_PENDING_MINUTES = Math.max(
  30,
  Number.parseInt(String(process.env.GENERATION_RECORD_PENDING_STALE_MINUTES || "120"), 10) || 120,
);
const STALE_PENDING_MESSAGE =
  "任务长时间未完成，已自动结束。若图片已生成但未进入历史，通常是服务重启或本地后台任务过期导致结果无法恢复，请重新提交。";

const createDefaultStore = () => ({
  version: GENERATION_RECORD_VERSION,
  records: [],
});

const writeStore = (store) => {
  fs.writeFileSync(
    GENERATION_RECORD_FILE,
    JSON.stringify(store, null, 2),
    "utf8",
  );
};

const normalizeStore = (store) => {
  const next =
    store && typeof store === "object" ? store : createDefaultStore();
  if (!Array.isArray(next.records)) next.records = [];
  next.version = GENERATION_RECORD_VERSION;
  return next;
};

const readStore = () => {
  if (!fs.existsSync(GENERATION_RECORD_FILE)) {
    const initial = createDefaultStore();
    writeStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(GENERATION_RECORD_FILE, "utf8").trim();
    if (!raw) {
      const initial = createDefaultStore();
      writeStore(initial);
      return initial;
    }
    return normalizeStore(JSON.parse(raw));
  } catch (_error) {
    const fallback = createDefaultStore();
    writeStore(fallback);
    return fallback;
  }
};

const withStore = (mutator) => {
  const store = readStore();
  const result = mutator(store);
  cleanupStore(store);
  writeStore(store);
  return result;
};

const cleanupStore = (store) => {
  failStalePendingRecordsInStore(store);
  const cutoff = Date.now() - RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  store.records = store.records.filter((record) => {
    const timestamp = new Date(record.createdAt || record.updatedAt || 0).getTime();
    return !Number.isFinite(timestamp) || timestamp >= cutoff;
  });

  store.records.sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );

  if (store.records.length > RECORD_LIMIT) {
    store.records = store.records.slice(0, RECORD_LIMIT);
  }
};

const failStalePendingRecordsInStore = (store) => {
  const cutoff = Date.now() - STALE_PENDING_MINUTES * 60 * 1000;
  const now = new Date().toISOString();
  store.records.forEach((record) => {
    if (normalizeStatus(record.status) !== "PENDING") return;
    const timestamp = new Date(record.createdAt || record.updatedAt || 0).getTime();
    if (!Number.isFinite(timestamp) || timestamp >= cutoff) return;
    if (Array.isArray(record.resultUrls) && record.resultUrls.length > 0) {
      record.status = "SUCCESS";
      record.previewUrl = record.previewUrl || record.resultUrls[0] || null;
    } else {
      record.status = "FAILED";
      record.errorMessage = record.errorMessage || STALE_PENDING_MESSAGE;
    }
    record.updatedAt = now;
    record.completedAt = record.completedAt || now;
  });
};

const normalizeStatus = (value = "PENDING") => {
  const normalized = String(value || "PENDING").trim().toUpperCase();
  if (["PENDING", "SUCCESS", "FAILED"].includes(normalized)) return normalized;
  return "PENDING";
};

const normalizeMediaType = (value = "IMAGE") => {
  const normalized = String(value || "IMAGE").trim().toUpperCase();
  return normalized === "VIDEO" ? "VIDEO" : "IMAGE";
};

const normalizeUiMode = (value = "canvas") => {
  const normalized = String(value || "canvas").trim().toLowerCase();
  return normalized === "classic" ? "classic" : "canvas";
};

const normalizeUiModeFilter = (value = "all") => {
  const normalized = String(value || "all").trim().toLowerCase();
  if (normalized === "canvas" || normalized === "classic") return normalized;
  return "all";
};

const parsePositiveInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 0 ? parsed : fallback;
};

const parseCursorTimestamp = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return null;
  return timestamp;
};

const parseJsonMeta = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch (_error) {
    return null;
  }
};

const normalizeStoredResultUrl = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^data:image\//i.test(text)) return "";
  return text;
};

const uniqueUrls = (urls = []) =>
  Array.from(
    new Set(
      (Array.isArray(urls) ? urls : [])
        .map((item) => normalizeStoredResultUrl(item))
        .filter(Boolean),
    ),
  );

const publicRecord = (record = {}) => ({
  id: String(record.id || "").trim(),
  userId: String(record.userId || "").trim(),
  accountId: String(record.accountId || "").trim() || null,
  ownerEmail: String(record.ownerEmail || "").trim() || null,
  uiMode: normalizeUiMode(record.uiMode),
  mediaType: normalizeMediaType(record.mediaType),
  actionName: String(record.actionName || "").trim() || null,
  prompt: String(record.prompt || "").trim(),
  modelId: String(record.modelId || "").trim() || null,
  modelName: String(record.modelName || "").trim() || null,
  routeId: String(record.routeId || "").trim() || null,
  routeLabel: String(record.routeLabel || "").trim() || null,
  taskId: String(record.taskId || "").trim() || null,
  status: normalizeStatus(record.status),
  quantity: parsePositiveInt(record.quantity, 1),
  aspectRatio: String(record.aspectRatio || "").trim() || null,
  outputSize: String(record.outputSize || "").trim() || null,
  previewUrl: normalizeStoredResultUrl(record.previewUrl) || null,
  resultUrls: uniqueUrls(record.resultUrls),
  errorMessage: String(record.errorMessage || "").trim() || null,
  meta: parseJsonMeta(record.meta),
  createdAt: String(record.createdAt || "").trim() || null,
  updatedAt: String(record.updatedAt || "").trim() || null,
  completedAt: String(record.completedAt || "").trim() || null,
});

const createGenerationRecord = async (payload = {}) =>
  withStore((store) => {
    const now = new Date().toISOString();
    const record = {
      id: `genrec_${randomBytes(8).toString("hex")}`,
      userId: String(payload.userId || "").trim(),
      accountId: String(payload.accountId || "").trim() || null,
      ownerEmail: String(payload.ownerEmail || "").trim().toLowerCase() || null,
      uiMode: normalizeUiMode(payload.uiMode),
      mediaType: normalizeMediaType(payload.mediaType),
      actionName: String(payload.actionName || "").trim() || null,
      prompt: String(payload.prompt || "").trim(),
      modelId: String(payload.modelId || "").trim() || null,
      modelName: String(payload.modelName || "").trim() || null,
      routeId: String(payload.routeId || "").trim() || null,
      routeLabel: String(payload.routeLabel || "").trim() || null,
      taskId: String(payload.taskId || "").trim() || null,
      status: normalizeStatus(payload.status),
      quantity: parsePositiveInt(payload.quantity, 1),
      aspectRatio: String(payload.aspectRatio || "").trim() || null,
      outputSize: String(payload.outputSize || "").trim() || null,
      previewUrl: normalizeStoredResultUrl(payload.previewUrl) || null,
      resultUrls: uniqueUrls(payload.resultUrls),
      errorMessage: String(payload.errorMessage || "").trim() || null,
      meta: payload.meta || null,
      createdAt: now,
      updatedAt: now,
      completedAt:
        normalizeStatus(payload.status) === "PENDING" ? null : now,
    };

    if (!record.previewUrl && record.resultUrls.length > 0) {
      record.previewUrl = record.resultUrls[0];
    }

    store.records.unshift(record);
    return publicRecord(record);
  });

const attachTaskToGenerationRecord = async (recordId, taskId) =>
  withStore((store) => {
    const record = store.records.find((item) => item.id === recordId);
    if (!record) return null;
    record.taskId = String(taskId || "").trim() || null;
    record.updatedAt = new Date().toISOString();
    return publicRecord(record);
  });

const updateRecordCompletion = (record, updates = {}) => {
  const now = new Date().toISOString();
  const resultUrls = uniqueUrls(updates.resultUrls);
  if (updates.status !== undefined) {
    record.status = normalizeStatus(updates.status);
  }
  if (updates.taskId !== undefined) {
    record.taskId = String(updates.taskId || "").trim() || null;
  }
  if (updates.errorMessage !== undefined) {
    record.errorMessage = String(updates.errorMessage || "").trim() || null;
  }
  if (updates.meta !== undefined) {
    record.meta = updates.meta || null;
  }
  if (updates.outputSize !== undefined) {
    record.outputSize = String(updates.outputSize || "").trim() || null;
  }
  if (updates.aspectRatio !== undefined) {
    record.aspectRatio = String(updates.aspectRatio || "").trim() || null;
  }
  if (resultUrls.length > 0) {
    record.resultUrls = resultUrls;
  }
  if (updates.previewUrl !== undefined) {
    record.previewUrl = normalizeStoredResultUrl(updates.previewUrl) || null;
  } else if (resultUrls.length > 0) {
    record.previewUrl = resultUrls[0];
  }
  record.updatedAt = now;
  if (record.status !== "PENDING") {
    record.completedAt = now;
  }
};

const completeGenerationRecord = async (recordId, updates = {}) =>
  withStore((store) => {
    const record = store.records.find((item) => item.id === recordId);
    if (!record) return null;
    updateRecordCompletion(record, updates);
    return publicRecord(record);
  });

const completeGenerationRecordByTaskId = async (taskId, updates = {}) =>
  withStore((store) => {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) return null;
    const record = store.records.find((item) => item.taskId === normalizedTaskId);
    if (!record) return null;
    updateRecordCompletion(record, updates);
    return publicRecord(record);
  });

const getGenerationRecordByTaskId = async (taskId) =>
  withStore((store) => {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) return null;
    const record = store.records.find((item) => item.taskId === normalizedTaskId);
    return record ? publicRecord(record) : null;
  });

const listGenerationRecordsForUser = async (userId, options = {}) => {
  const normalizedUserId = String(userId || "").trim();
  const mediaType = String(options.mediaType || "all").trim().toUpperCase();
  const status = String(options.status || "all").trim().toUpperCase();
  const uiMode = normalizeUiModeFilter(options.uiMode);
  const recentDays = Math.max(1, Math.min(30, parsePositiveInt(options.recentDays, RECORD_RETENTION_DAYS)));
  const recentCutoff = Date.now() - recentDays * 24 * 60 * 60 * 1000;
  const page = parsePositiveInt(options.page, 1);
  const pageSize = Math.min(100, parsePositiveInt(options.pageSize, 20));
  const sinceTimestamp = parseCursorTimestamp(options.sinceCreatedAt);
  const sinceId = String(options.sinceId || "").trim();

  return withStore((store) => {
    const filtered = store.records.filter((record) => {
      if (String(record.userId || "").trim() !== normalizedUserId) return false;
      const createdTimestamp = parseCursorTimestamp(record.createdAt || record.updatedAt);
      if (createdTimestamp !== null && createdTimestamp < recentCutoff) return false;
      if (mediaType !== "ALL" && normalizeMediaType(record.mediaType) !== mediaType) {
        return false;
      }
      if (status !== "ALL" && normalizeStatus(record.status) !== status) {
        return false;
      }
      if (uiMode !== "all" && normalizeUiMode(record.uiMode) !== uiMode) {
        return false;
      }
      if (sinceTimestamp !== null) {
        const recordTimestamp = parseCursorTimestamp(record.createdAt);
        if (recordTimestamp === null) return false;
        if (recordTimestamp < sinceTimestamp) return false;
        if (recordTimestamp === sinceTimestamp && sinceId && String(record.id || "") === sinceId) {
          return false;
        }
      }
      return true;
    });

    const sorted = filtered.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );

    if (sinceTimestamp !== null) {
      const records = sorted
        .slice(0, pageSize)
        .map((record) => publicRecord(record));
      const cursorRecord = records[0] || null;
      return {
        total: records.length,
        page: 1,
        pageSize,
        totalPages: 1,
        records,
        incremental: true,
        cursor: cursorRecord
          ? {
              sinceCreatedAt: cursorRecord.createdAt,
              sinceId: cursorRecord.id,
            }
          : null,
      };
    }

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = sorted
      .slice(start, start + pageSize)
      .map((record) => publicRecord(record));
    const cursorRecord = items[0] || null;

    return {
      total,
      page: safePage,
      pageSize,
      totalPages,
      records: items,
      cursor: cursorRecord
        ? {
            sinceCreatedAt: cursorRecord.createdAt,
            sinceId: cursorRecord.id,
          }
        : null,
    };
  });
};

const clearGenerationRecordsForUser = async (userId, options = {}) => {
  const normalizedUserId = String(userId || "").trim();
  const mediaType = String(options.mediaType || "all").trim().toUpperCase();
  const uiMode = normalizeUiModeFilter(options.uiMode);

  return withStore((store) => {
    const before = store.records.length;
    store.records = store.records.filter((record) => {
      if (String(record.userId || "").trim() !== normalizedUserId) return true;
      if (mediaType !== "ALL" && normalizeMediaType(record.mediaType) !== mediaType) return true;
      if (uiMode !== "all" && normalizeUiMode(record.uiMode) !== uiMode) return true;
      return false;
    });
    return {
      removed: before - store.records.length,
    };
  });
};

const cleanupExpiredGenerationRecords = async () =>
  withStore((store) => {
    const before = store.records.length;
    cleanupStore(store);
    return {
      removed: before - store.records.length,
      successRetentionDays: RECORD_RETENTION_DAYS,
      failedRetentionDays: RECORD_RETENTION_DAYS,
      pendingRetentionDays: RECORD_RETENTION_DAYS,
    };
  });

const startGenerationRecordMaintenance = () => null;

module.exports = {
  attachTaskToGenerationRecord,
  clearGenerationRecordsForUser,
  cleanupExpiredGenerationRecords,
  completeGenerationRecord,
  completeGenerationRecordByTaskId,
  createGenerationRecord,
  getGenerationRecordByTaskId,
  listGenerationRecordsForUser,
  startGenerationRecordMaintenance,
};
