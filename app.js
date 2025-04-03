
// app.js - Arquivo principal do servidor
const express = require('express');
const app = express();
const usuarioRoutes = require('./routes/usuarioRoutes');
const registroRoutes = require('./routes/registroRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const funcionarioRoutes = require('./routes/funcionarioRoutes')
const empresaRoutes = require('./routes/empresaRoutes');
const path = require('path'); // Para resolver caminhos de arquivos estáticos
const session = require('express-session');

app.use(session({
    secret: '777',
    resave: false,
    saveUninitialized: true
}));

// Middleware para permitir requisições JSON
app.use(express.json());

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/views'))); 
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Define as rotas principais do servidor
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/registros', registroRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/funcionario', funcionarioRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
