
// app.js - Arquivo principal do servidor
const express = require('express');
const app = express();
const usuarioRoutes = require('./routes/usuarioRoutes');
const registroRoutes = require('./routes/registroRoutes');

// Middleware para permitir requisições JSON
app.use(express.json());

// Define as rotas principais do servidor
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/registros', registroRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});