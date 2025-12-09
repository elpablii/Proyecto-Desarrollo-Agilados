const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ruta de la base de datos dentro del volumen montado
const DB_PATH = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('file:', '')
    : path.join(__dirname, '../data/dev.db');

// Asegurar que el directorio data exista
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    console.log('[DB] Creating data directory at', dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('[DB] Connecting to SQLite at:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[DB ERROR] Could not connect to database:', err.message);
    } else {
        console.log('[DB] Connected to SQLite database.');
        initializeParams();
    }
});

function initializeParams() {
    const query = `
    CREATE TABLE IF NOT EXISTS proyecciones (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        carreras_codigo TEXT NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    db.run(query, (err) => {
        if (err) {
            console.error('[DB ERROR] Error creating table:', err.message);
        } else {
            console.log('[DB] Table "proyecciones" ready.');
        }
    });
}

// Helper para promisify db.all
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper para promisify db.run
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const save = async (projectionData) => {
    // projectionData structure: { id, userId, codigoCarrera, name, date, projection (array) }
    // We store the 'projection' array as a JSON string in 'data' column
    const { id, userId, codigoCarrera, name, projection } = projectionData;
    const dataStr = JSON.stringify(projection);

    const sql = `
        INSERT INTO proyecciones (id, user_id, carreras_codigo, name, data, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;

    await dbRun(sql, [id, userId, codigoCarrera, name, dataStr]);
    return projectionData;
};

const findByUser = async (userId, codigoCarrera) => {
    const sql = `
        SELECT * FROM proyecciones 
        WHERE user_id = ? AND carreras_codigo = ?
        ORDER BY created_at DESC
    `;

    const rows = await dbAll(sql, [userId, codigoCarrera]);

    // Map back to object structure
    return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        codigoCarrera: row.carreras_codigo,
        name: row.name,
        date: row.created_at,
        projection: JSON.parse(row.data)
    }));
};

const findById = async (id) => {
    const sql = `SELECT * FROM proyecciones WHERE id = ?`;
    const rows = await dbAll(sql, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        codigoCarrera: row.carreras_codigo,
        name: row.name,
        date: row.created_at,
        projection: JSON.parse(row.data)
    };
};

const deleteById = async (id, userId) => {
    const sql = `DELETE FROM proyecciones WHERE id = ? AND user_id = ?`;
    const result = await dbRun(sql, [id, userId]);
    return result.changes > 0;
};

module.exports = {
    save,
    findByUser,
    findById,
    deleteById
};