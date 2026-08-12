"use client";

const DB_NAME = "liveframeworks";
const DB_VERSION = 1;
const RUN_STORE = "frameworkRuns";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Could not open generation storage."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RUN_STORE)) {
        const store = database.createObjectStore(RUN_STORE, { keyPath: "id" });
        store.createIndex("frameworkId", "frameworkId", { unique: false });
        store.createIndex("startedAt", "startedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Generation storage request failed."));
  });
}

export function mergeGenerationRecord(existing, patch) {
  if (!existing || typeof existing !== "object") return null;
  return {
    ...existing,
    ...(patch && typeof patch === "object" ? patch : {}),
    id: existing.id,
  };
}

export async function saveGenerationRecord(record) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RUN_STORE, "readwrite");
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Generation record could not be committed."));
      transaction.onabort = () => reject(transaction.error || new Error("Generation record write was aborted."));
    });
    await requestResult(transaction.objectStore(RUN_STORE).put(record));
    await completed;
    return { ok: true };
  } finally {
    database.close();
  }
}

export async function getGenerationRecord(id) {
  const database = await openDatabase();
  try {
    return await requestResult(database.transaction(RUN_STORE, "readonly").objectStore(RUN_STORE).get(id));
  } finally {
    database.close();
  }
}

export async function getFrameworkGenerationRecords(frameworkId) {
  const database = await openDatabase();
  try {
    return await requestResult(
      database.transaction(RUN_STORE, "readonly").objectStore(RUN_STORE).index("frameworkId").getAll(frameworkId),
    );
  } finally {
    database.close();
  }
}

export async function updateGenerationRecord(id, patch) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RUN_STORE, "readwrite");
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Generation record could not be updated."));
      transaction.onabort = () => reject(transaction.error || new Error("Generation record update was aborted."));
    });
    const store = transaction.objectStore(RUN_STORE);
    const existing = await requestResult(store.get(id));
    const merged = mergeGenerationRecord(existing, patch);
    if (!merged) {
      await completed;
      return { ok: false, missing: true };
    }
    await requestResult(store.put(merged));
    await completed;
    return { ok: true, record: merged };
  } finally {
    database.close();
  }
}

export async function clearGenerationRecords() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RUN_STORE, "readwrite");
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Generation records could not be cleared."));
      transaction.onabort = () => reject(transaction.error || new Error("Generation record reset was aborted."));
    });
    await requestResult(transaction.objectStore(RUN_STORE).clear());
    await completed;
    return { ok: true };
  } finally {
    database.close();
  }
}
