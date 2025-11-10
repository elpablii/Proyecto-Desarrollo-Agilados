const fs = require('fs');
const path = require('path');

const PROYECCIONES_FILE = path.join(__dirname, '..', 'proyecciones.json');
let proyecciones = []; // Caché en memoria de proyecciones

const loadProyeccionesFromDisk = () => {
    try {
        if (fs.existsSync(PROYECCIONES_FILE)) {
            const raw = fs.readFileSync(PROYECCIONES_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) proyecciones = parsed;
            console.log(`[INFO] Repositorio: Cargadas ${proyecciones.length} proyecciones desde disco`);
        }
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron cargar proyecciones desde disco:', err.message);
    }
};

const saveProyeccionesToDisk = () => {
    try {
        fs.writeFileSync(PROYECCIONES_FILE, JSON.stringify(proyecciones, null, 2), 'utf8');
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron guardar proyecciones en disco:', err.message);
    }
};

// --- Interfaz del Repositorio ---

const save = (projectionData) => {
    proyecciones.push(projectionData);
    saveProyeccionesToDisk();
    return projectionData;
};

const findByUser = (userId, codigoCarrera) => {
    return proyecciones.filter(p => 
        p.userId === userId && 
        (!codigoCarrera || p.codigoCarrera === codigoCarrera)
    );
};

const findById = (id) => {
    return proyecciones.find(p => p.id === id);
};

module.exports = {
    loadProyeccionesFromDisk,
    save,
    findByUser,
    findById
};