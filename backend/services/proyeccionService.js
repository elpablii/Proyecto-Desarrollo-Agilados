// Servicio para manejar la lógica de proyecciones (ahora usa el repositorio)
const crypto = require('crypto');
const proyeccionRepository = require('../repositories/proyeccionRepository');

// (loadProyeccionesFromDisk se llama ahora desde index.js)

const saveProjection = (data) => {
    const { userId, codigoCarrera, name, projection } = data;
    
    // Lógica de negocio (crear ID, timestamps)
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
    
    // Pide al repositorio que guarde
    return proyeccionRepository.save(obj);
};

const getProjectionsByUser = (userId, codigoCarrera) => {
    // Pide al repositorio los datos
    return proyeccionRepository.findByUser(userId, codigoCarrera);
};

const getProjectionById = (id) => {
    // Pide al repositorio los datos
    return proyeccionRepository.findById(id);
};

module.exports = {
    // loadProyeccionesFromDisk, // Ya no lo exporta el servicio
    saveProjection,
    getProjectionsByUser,
    getProjectionById
};