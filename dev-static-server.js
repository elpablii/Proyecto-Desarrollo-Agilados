// Minimal static server for development
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;
const FRONTEND_DIR = path.join(__dirname, 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'dePrueba.html')));
app.listen(PORT, () => console.log(`[DEV-SERVER] Frontend served at http://localhost:${PORT}`));
