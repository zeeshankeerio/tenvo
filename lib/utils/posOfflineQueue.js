/**
 * Offline POS sale queue — replays checkout when connection restores.
 */

const DB_NAME = 'tenvo_pos_offline';
const DB_VERSION = 1;
const STORE = 'sales';

function openDb() {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB unavailable'));
    }
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                os.createIndex('businessId', 'businessId', { unique: false });
                os.createIndex('status', 'status', { unique: false });
            }
        };
    });
}

/**
 * @param {{ businessId: string, payload: object, clientRef?: string }} sale
 */
export async function enqueueOfflinePosSale(sale) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const record = {
            ...sale,
            status: 'pending',
            createdAt: new Date().toISOString(),
            attempts: 0,
        };
        const req = tx.objectStore(STORE).add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function listPendingPosSales(businessId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const idx = tx.objectStore(STORE).index('businessId');
        const req = idx.getAll(businessId);
        req.onsuccess = () => {
            const rows = (req.result || []).filter((r) => r.status === 'pending');
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function markPosSaleSynced(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const row = getReq.result;
            if (!row) {
                resolve(false);
                return;
            }
            row.status = 'synced';
            row.syncedAt = new Date().toISOString();
            store.put(row);
        };
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function incrementPosSaleAttempt(id, error) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const row = getReq.result;
            if (!row) return;
            row.attempts = (row.attempts || 0) + 1;
            row.lastError = error || null;
            store.put(row);
        };
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function countPendingPosSales(businessId) {
    const pending = await listPendingPosSales(businessId);
    return pending.length;
}
