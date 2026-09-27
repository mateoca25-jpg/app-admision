// Guarda el historial de respuestas (Intento) en IndexedDB, en el propio dispositivo,
// para que no se pierda al cerrar la app (ver SPEC.md 3.2). Solo trata con el
// navegador: no se carga en las pruebas, que usan js/logica.js directamente.

const NOMBRE_DB = "app-admision";
const VERSION_DB = 1;
const ALMACEN_INTENTOS = "intentos";

function abrirDB() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(ALMACEN_INTENTOS)) {
        db.createObjectStore(ALMACEN_INTENTOS, { keyPath: "id", autoIncrement: true });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

async function guardarIntento(intento) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN_INTENTOS, "readwrite");
    tx.objectStore(ALMACEN_INTENTOS).add(intento);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function obtenerTodosIntentos() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN_INTENTOS, "readonly");
    const solicitud = tx.objectStore(ALMACEN_INTENTOS).getAll();
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}
