const DB_NAME = 'drawing_canvas_db';
const DB_VERSION = 1;
const STORE_NAME = 'canvas_store';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      dbPromise = null;
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      dbPromise = null;
      reject(e.target.error);
    };
  });
  return dbPromise;
}

export function saveToDB(key, value) {
  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => { try { db.close(); } catch {} };
    } catch {}
  }).catch(() => {});
}

export function loadFromDB(key) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          try { db.close(); } catch {}
          resolve(request.result || null);
        };
        request.onerror = () => {
          try { db.close(); } catch {}
          resolve(null);
        };
      } catch {
        try { db.close(); } catch {}
        resolve(null);
      }
    });
  }).catch(() => null);
}

export function removeFromDB(key) {
  getDB().then(db => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => { try { db.close(); } catch {} };
    } catch {}
  }).catch(() => {});
}

export function saveJSON(key, obj) {
  saveToDB(key, JSON.stringify(obj));
}

export async function loadJSON(key) {
  const raw = await loadFromDB(key);
  if (!raw && typeof raw !== 'string') {
    try { const fallback = localStorage.getItem(key); return fallback ? JSON.parse(fallback) : null; } catch { return null; }
  }
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveDrawingCanvas(dataURL) {
  if (!dataURL) return;
  saveToDB('drawingCanvas', dataURL);
  try { localStorage.setItem('drawingCanvas', dataURL); } catch {}
}

export async function loadDrawingCanvas() {
  const fromDB = await loadFromDB('drawingCanvas');
  if (fromDB) return fromDB;
  return localStorage.getItem('drawingCanvas') || null;
}

export function saveDrawingLayers(layersJSON) {
  if (!layersJSON) return;
  saveToDB('drawingLayers', layersJSON);
  try { localStorage.setItem('drawingLayers', layersJSON); } catch {}
}

export async function loadDrawingLayers() {
  const fromDB = await loadFromDB('drawingLayers');
  if (fromDB) return fromDB;
  return localStorage.getItem('drawingLayers') || null;
}

export function saveSavedCanvases(arr) {
  saveJSON('drawing_saved_canvases', arr);
  try { localStorage.setItem('drawing_saved_canvases', JSON.stringify(arr)); } catch {}
}

export function saveAutoSaveHistory(arr) {
  saveJSON('drawing_autosave_history', arr);
  try { localStorage.setItem('drawing_autosave_history', JSON.stringify(arr)); } catch {}
}

export function saveArtworks(arr) {
  saveJSON('drawing_artworks', arr);
  try { localStorage.setItem('drawing_artworks', JSON.stringify(arr)); } catch {}
}