const DB_NAME = 'cafe-desa-pos';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products';
const STORE_QUEUE = 'sync-queue';
const STORE_TX = 'local-transactions';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_TX)) {
        db.createObjectStore(STORE_TX, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- Products cache ----

export async function cacheProducts(products: ProductCache[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = t.objectStore(STORE_PRODUCTS);
    store.clear();
    products.forEach((p) => store.put(p));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getCachedProducts(): Promise<ProductCache[]> {
  return tx(STORE_PRODUCTS, 'readonly', (s) => s.getAll());
}

// ---- Sync queue ----

export type QueueStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export type QueueItem = {
  id?: number;
  type: 'transaction';
  payload: LocalTransaction;
  status: QueueStatus;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export async function enqueueTransaction(localTx: LocalTransaction): Promise<number> {
  const item: Omit<QueueItem, 'id'> = {
    type: 'transaction',
    payload: localTx,
    status: 'pending',
    createdAt: Date.now(),
    attempts: 0,
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_QUEUE, 'readwrite');
    const req = t.objectStore(STORE_QUEUE).add(item);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingQueue(): Promise<QueueItem[]> {
  const all = (await tx(STORE_QUEUE, 'readonly', (s) => s.getAll())) as QueueItem[];
  return all.filter((i) => i.status === 'pending' || i.status === 'failed');
}

export async function getQueueCount(): Promise<number> {
  const all = await getPendingQueue();
  return all.length;
}

export async function updateQueueItem(id: number, updates: Partial<QueueItem>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_QUEUE, 'readwrite');
    const store = t.objectStore(STORE_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve();
      Object.assign(item, updates);
      store.put(item);
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function removeQueueItem(id: number): Promise<void> {
  await tx(STORE_QUEUE, 'readwrite', (s) => s.delete(id));
}

// ---- Local transactions ----

export type LocalTransaction = {
  localId: string;
  invoice_no: string;
  payment_method: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  change: number;
  status: string;
  table_number: string | null;
  created_at: string;
  items: LocalTransactionItem[];
  synced: boolean;
};

export type LocalTransactionItem = {
  product_id: string | null;
  product_name: string;
  qty: number;
  price: number;
  cost_price?: number; // <--- DITAMBAHKAN: Harga modal item
  subtotal: number;
};

export async function saveLocalTransaction(localTx: LocalTransaction): Promise<void> {
  await tx(STORE_TX, 'readwrite', (s) => s.put(localTx));
}

export async function getLocalTransactions(): Promise<LocalTransaction[]> {
  return tx(STORE_TX, 'readonly', (s) => s.getAll());
}

export async function markLocalTransactionSynced(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_TX, 'readwrite');
    const store = t.objectStore(STORE_TX);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve();
      item.synced = true;
      store.put(item);
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export type ProductCache = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost_price?: number; // <--- DITAMBAHKAN: Harga modal produk di cache
  image_url: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};