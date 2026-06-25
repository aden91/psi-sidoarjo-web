// IndexedDB Storage Engine for Local File Uploads
window.PSIMediaDB = (() => {
  const DB_NAME = "PSISidoarjoDB";
  const DB_VERSION = 1;
  const STORE_NAME = "mediaStore";
  let dbInstance = null;

  // Initialize DB Connection
  function init() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error("IndexedDB Open Error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Save File/Blob to DB
  async function save(key, blob) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Get Blob from DB
  async function get(key) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Retrieve Object URL for elements (e.g. img.src / video.src)
  // Store created URLs so we can revoke them if necessary
  const objectUrls = new Map();
  async function getUrl(key) {
    if (objectUrls.has(key)) {
      return objectUrls.get(key);
    }
    try {
      const blob = await get(key);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      objectUrls.set(key, url);
      return url;
    } catch (e) {
      console.error("Failed to resolve Object URL for key:", key, e);
      return null;
    }
  }

  // Delete Media from DB
  async function remove(key) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        if (objectUrls.has(key)) {
          URL.revokeObjectURL(objectUrls.get(key));
          objectUrls.delete(key);
        }
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  return {
    init,
    save,
    get,
    getUrl,
    delete: remove
  };
})();
