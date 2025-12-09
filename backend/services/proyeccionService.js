const crypto = require('crypto');
const proyeccionRepository = require('../repositories/proyeccionRepository');

/**
 * [MODIFICADO] Ahora es asíncrono.
 */
const saveProjection = async (data) => {
    const { userId, codigoCarrera, name, projection } = data;

    const id = crypto.randomBytes(8).toString('hex');
    const now = Date.now();

    const obj = {
        id,
        userId,
        codigoCarrera,
        name: name || `proyeccion_${codigoCarrera}_${now}`,
        projection,
        createdAt: now,
        updatedAt: now
    };

    // [MODIFICADO] Await al guardar
    return await proyeccionRepository.save(obj);
};

const getProjectionsByUser = async (userId, codigoCarrera) => {
    return await proyeccionRepository.findByUser(userId, codigoCarrera);
};

const getProjectionById = async (id) => {
    return await proyeccionRepository.findById(id);
};

const deleteProjection = async (id) => {
    return await proyeccionRepository.deleteById(id);
};

module.exports = {
    saveProjection,
    getProjectionsByUser,
    getProjectionById,
    deleteProjection
};