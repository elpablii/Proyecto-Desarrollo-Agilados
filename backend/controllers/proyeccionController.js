const proyeccionService = require('../services/proyeccionService');

const saveProyeccion = (req, res) => {
    const { codigoCarrera, name, projection } = req.body || {};
    if (!projection || !codigoCarrera) {
        return res.status(400).json({ error: 'Falta codigoCarrera o projection en el cuerpo' });
    }

    try {
        const userId = req.session.userId; // De authMiddleware
        const newProyeccion = proyeccionService.saveProjection({
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