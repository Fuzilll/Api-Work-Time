const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const authMiddleware = require('./middlewares/authMiddleware');
const cors = require('cors');


app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['set-cookie'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Configuração de sessão
app.use(session({
    secret: '777',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Mude para true se usar HTTPS
      sameSite: 'lax', // Importante para Cross-Site
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/views')));
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Rotas públicas (sem autenticação)
app.use('/api/usuarios', require('./routes/usuarioRoutes'));

// Middleware de autenticação global para rotas privadas
app.use(authMiddleware.autenticacao);

// Rotas privadas
app.use('/api/registros', require('./routes/registroRoutes'));
app.use('/api/empresas', require('./routes/empresaRoutes'));
app.use('/api/funcionarios', require('./routes/funcionarioRoutes'));

// Rota de fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/views/index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro global:', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
