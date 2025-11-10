const proyeccionService = require('../services/proyeccionService');

// [MODIFICADO] saveProyeccion ahora es asíncrono
const saveProyeccion = async (req, res) => {
    const { codigoCarrera, name, projection } = req.body || {};

    try {
        const userId = req.session.userId; // De authMiddleware
        // [MODIFICADO] await
        const newProyeccion = await proyeccionService.saveProjection({
            userId,
            codigoCarrera,
            name,
            projection
        });
        res.json({ id: newProyeccion.id, createdAt: new Date(newProyeccion.createdAt).toISOString() });
    } catch (err) {
        console.error('[PROYECCION SAVE ERROR]', err);
        res.status(500).json({ error: 'Error interno guardando proyección' });
    }
};

// (listProyecciones y getProyeccion no llaman servicios async, no necesitan cambios)
// ... (listProyecciones, getProyeccion) ...
const listProyecciones = (req, res) => {
    const codigo = req.query.codigo;
    const userId = req.session.userId;
    try {
        const list = proyeccionService.getProjectionsByUser(userId, codigo);
        res.json({ proyecciones: list, meta: { count: list.length } });
    } catch (err) {
        console.error('[PROYECCION LIST ERROR]', err);
        res.status(500).json({ error: 'Error interno listando proyecciones' });
    }
};

const getProyeccion = (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
        const p = proyeccionService.getProjectionById(id);
        if (!p) {
            return res.status(404).json({ error: 'Proyección no encontrada' });
        }
        // Autorización
        if (p.userId !== userId) {
            return res.status(403).json({ error: 'No autorizado para ver esta proyección' });
        }
        res.json({ proyeccion: p });
    } catch (err) {
        console.error('[PROYECCION GET ERROR]', err);
        res.status(500).json({ error: 'Error interno obteniendo proyección' });
    }
};


module.exports = {
    saveProyeccion,
    listProyecciones,
    getProyeccion
};