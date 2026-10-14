/* =========================================================
   CAREER HUB — BACKUP OFFLINE
   ---------------------------------------------------------
   Exporta/importa os dados locais sem depender de internet ou nuvem.
   Fotos e escudos em Base64/Data URL ficam dentro do próprio JSON.
========================================================= */
"use strict";
(function () {
  const APP_DB = "careerHubOfflineDB";
  const INTERNAL_KEYS = new Set([
    "careerHubSyncToken_v2",
    "careerHubSyncToken_v3",
    "careerHubSyncMeta_v3",
    "careerHubSyncLastSnapshot_v3"
  ]);
  const BACKUP_DB = "careerHubBackupVault";
  const BACKUP_STORE = "backups";
  const FORMAT = "career-hub-backup";
  const VERSION = 1;

  const $ = (selector) => document.querySelector(selector);

  function safeParse(value) {
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function cloneJSON(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function collectLocalStorage() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || INTERNAL_KEYS.has(key)) continue;
      data[key] = localStorage.getItem(key);
    }
    return data;
  }

  function openDB(name) {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponível neste dispositivo."));
        return;
      }
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local."));
    });
  }

  async function readIndexedDB() {
    if (!window.indexedDB) return { name: APP_DB, version: 0, stores: {} };
    let db;
    try {
      db = await openDB(APP_DB);
      const stores = {};
      const names = Array.from(db.objectStoreNames);
      if (!names.length) return { name: APP_DB, version: db.version, stores };

      await Promise.all(names.map((storeName) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        const keyRequest = store.getAllKeys();
        request.onsuccess = () => {
          keyRequest.onsuccess = () => {
            stores[storeName] = {
              keys: keyRequest.result,
              values: request.result
            };
            resolve();
          };
          keyRequest.onerror = () => reject(keyRequest.error);
        };
        request.onerror = () => reject(request.error);
      })));

      return { name: APP_DB, version: db.version, stores };
    } finally {
      try { db?.close(); } catch (_) {}
    }
  }

  function countEmbeddedImages(value) {
    let count = 0;
    const seen = new WeakSet();
    function walk(item) {
      if (typeof item === "string") {
        if (/^data:image\//i.test(item)) {
          count++;
          return;
        }
        const trimmed = item.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
          try { walk(JSON.parse(trimmed)); } catch (_) {}
        }
        return;
      }
      if (!item || typeof item !== "object") return;
      if (seen.has(item)) return;
      seen.add(item);
      if (Array.isArray(item)) item.forEach(walk);
      else Object.values(item).forEach(walk);
    }
    walk(value);
    return count;
  }

  async function buildSnapshot() {
    const localStorageData = collectLocalStorage();
    const indexedDBData = await readIndexedDB();
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      app: "Career Hub — EAFC",
      media: {
        embedded: true,
        format: "Data URL / Base64",
        imageCount: countEmbeddedImages({ localStorage: localStorageData, indexedDB: indexedDBData })
      },
      localStorage: localStorageData,
      indexedDB: indexedDBData
    };
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") throw new Error("O arquivo não contém um objeto válido.");
    if (snapshot.format !== FORMAT) throw new Error("Este arquivo não é um backup válido do Career Hub.");
    if (!snapshot.localStorage || typeof snapshot.localStorage !== "object") throw new Error("Backup sem dados do aplicativo.");
    if (snapshot.indexedDB && typeof snapshot.indexedDB !== "object") throw new Error("Estrutura IndexedDB inválida.");
    if (snapshot.media && typeof snapshot.media !== "object") throw new Error("Estrutura de mídia do backup inválida.");
    return true;
  }

  async function openBackupDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(BACKUP_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveSafetyBackup(snapshot) {
    if (!window.indexedDB) return;
    const db = await openBackupDB();
    const record = {
      id: "before-import",
      createdAt: new Date().toISOString(),
      snapshot
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE, "readwrite");
      tx.objectStore(BACKUP_STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Não foi possível criar o backup de segurança."));
    });
    db.close();
  }

  async function readSafetyBackup() {
    if (!window.indexedDB) throw new Error("IndexedDB indisponível para restauração.");
    const db = await openBackupDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE, "readonly");
      const req = tx.objectStore(BACKUP_STORE).get("before-import");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record?.snapshot) throw new Error("Nenhum backup de segurança foi encontrado.");
    return record.snapshot;
  }

  async function writeIndexedDB(snapshot) {
    if (!window.indexedDB || !snapshot?.indexedDB) return;
    const source = snapshot.indexedDB;
    let db = await openDB(APP_DB);

    // Stores já existentes são restauradas. Não removemos stores desconhecidas
    // para evitar apagar dados adicionados por versões futuras do aplicativo.
    for (const [storeName, payload] of Object.entries(source.stores || {})) {
      if (!db.objectStoreNames.contains(storeName)) {
        const newVersion = db.version + 1;
        db.close();
        db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(APP_DB, newVersion);
          req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
    }

    const names = Object.keys(source.stores || {}).filter(name => db.objectStoreNames.contains(name));
    if (names.length) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(names, "readwrite");
        for (const name of names) {
          const store = tx.objectStore(name);
          store.clear();
          const payload = source.stores[name] || {};
          const keys = Array.isArray(payload.keys) ? payload.keys : [];
          const values = Array.isArray(payload.values) ? payload.values : [];
          for (let i = 0; i < Math.min(keys.length, values.length); i++) {
            store.put(values[i], keys[i]);
          }
        }
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Não foi possível restaurar o armazenamento offline."));
      });
    }
    db.close();
  }

  async function applySnapshot(snapshot) {
    validateSnapshot(snapshot);
    const current = await buildSnapshot();
    await saveSafetyBackup(current);

    // Valida tudo antes de alterar qualquer dado.
    const localEntries = Object.entries(snapshot.localStorage || {});
    for (const [key, value] of localEntries) {
      if (INTERNAL_KEYS.has(key)) continue;
      if (typeof value !== "string") throw new Error(`Valor inválido para a chave ${key}.`);
    }

    const currentKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !INTERNAL_KEYS.has(key)) currentKeys.push(key);
    }

    for (const key of currentKeys) localStorage.removeItem(key);
    for (const [key, value] of localEntries) {
      if (!INTERNAL_KEYS.has(key)) localStorage.setItem(key, value);
    }
    await writeIndexedDB(snapshot);

    // Faz a aplicação existente recarregar do armazenamento restaurado.
    window.location.reload();
  }

  function downloadSnapshot(snapshot) {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CareerHub_Backup_${date}.json`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportBackup() {
    try {
      const snapshot = await buildSnapshot();
      const localCount = Object.keys(snapshot.localStorage).length;
      const imageCount = Number(snapshot.media?.imageCount || 0);
      const careerRaw = snapshot.localStorage.careerHubFootball_v2;
      const careers = safeParse(careerRaw);
      if (careerRaw && !Array.isArray(careers)) throw new Error("Os dados de carreiras locais estão inválidos; exportação cancelada para proteger seus dados.");
      downloadSnapshot(snapshot);
      window.careerHubBackupLastExport = snapshot;
      if (typeof window.showToast === "function") window.showToast(`Backup exportado (${localCount} itens locais, ${imageCount} imagens incorporadas).`);
    } catch (error) {
      console.error("Exportação do Career Hub:", error);
      alert(`Não foi possível exportar o backup.\n\n${error.message || error}`);
    }
  }

  async function handleImportFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      let snapshot;
      try { snapshot = JSON.parse(text); } catch (_) { throw new Error("O arquivo não contém JSON válido."); }
      validateSnapshot(snapshot);

      const current = await buildSnapshot();
      await saveSafetyBackup(current);

      const count = Object.keys(snapshot.localStorage || {}).length;
      const ok = window.confirm(
        `Backup válido encontrado.\n\n` +
        `Dados locais: ${count}\n` +
        `Imagens incorporadas: ${Number(snapshot.media?.imageCount || 0)}\n` +
        `Exportado em: ${snapshot.exportedAt ? new Date(snapshot.exportedAt).toLocaleString("pt-BR") : "data não informada"}\n\n` +
        `A importação substituirá os dados locais atuais. Um backup de segurança já foi criado automaticamente.\n\nContinuar?`
      );
      if (!ok) return;

      // A função cria outro backup de segurança antes da aplicação, mas isso
      // é intencional: mantém a proteção mesmo se o fluxo for chamado por API.
      await applySnapshot(snapshot);
    } catch (error) {
      console.error("Importação do Career Hub:", error);
      alert(`Importação cancelada. Seus dados atuais não foram substituídos.\n\n${error.message || error}`);
    }
  }

  async function restoreSafetyBackup() {
    try {
      const snapshot = await readSafetyBackup();
      validateSnapshot(snapshot);
      const ok = window.confirm("Restaurar o backup criado automaticamente antes da última importação?\n\nOs dados locais atuais serão substituídos.");
      if (!ok) return;
      await applySnapshot(snapshot);
    } catch (error) {
      alert(`Não foi possível restaurar o backup.\n\n${error.message || error}`);
    }
  }

  function wireUI() {
    const exportBtn = $("#exportBackupBtn");
    const importBtn = $("#importBackupBtn");
    const restoreBtn = $("#restoreBackupBtn");
    const input = $("#backupFileInput");

    exportBtn?.addEventListener("click", exportBackup);
    importBtn?.addEventListener("click", () => input?.click());
    restoreBtn?.addEventListener("click", restoreSafetyBackup);
    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      input.value = "";
      handleImportFile(file);
    });
  }

  window.careerHubBackup = {
    buildSnapshot,
    validateSnapshot,
    exportBackup,
    handleImportFile,
    restoreSafetyBackup,
    readSafetyBackup
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireUI);
  else wireUI();
})();
