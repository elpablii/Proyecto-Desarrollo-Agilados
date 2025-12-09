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
const listProyecciones = async (req, res) => {
    const codigo = req.query.codigo;
    const userId = req.session.userId;
    try {
        const list = await proyeccionService.getProjectionsByUser(userId, codigo);
        res.json({ proyecciones: list, meta: { count: list.length } });
    } catch (err) {
        console.error('[PROYECCION LIST ERROR]', err);
        res.status(500).json({ error: 'Error interno listando proyecciones' });
    }
};

const getProyeccion = async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
        const p = await proyeccionService.getProjectionById(id);
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

const deleteProyeccion = async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        // 1. Verificar que existe y pertenece al usuario
        const existing = proyeccionService.getProjectionById(id);

        if (!existing) {
            return res.status(404).json({ error: 'Proyección no encontrada' });
        }

        if (existing.userId !== userId) {
            console.warn(`[AUTH] Usuario ${userId} intentó borrar proyección de ${existing.userId}`);
            return res.status(403).json({ error: 'No autorizado para eliminar esta proyección' });
        }

        // 2. Proceder a eliminar
        const deleted = await proyeccionService.deleteProjection(id);

        if (deleted) {
            console.log(`[PROYECCION] Eliminada ID: ${id} por Usuario: ${userId}`);
            res.json({ message: 'Proyección eliminada correctamente', id });
        } else {
            res.status(500).json({ error: 'No se pudo eliminar la proyección' });
        }

    } catch (err) {
        console.error('[PROYECCION DELETE ERROR]', err);
        res.status(500).json({ error: 'Error interno al eliminar proyección' });
    }
};


module.exports = {
    saveProyeccion,
    listProyecciones,
    getProyeccion,
    deleteProyeccion
};