// Carrega variáveis de ambiente a partir do arquivo .env
require('dotenv').config();

// Importa os principais módulos utilizados na aplicação
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importa módulos internos do projeto
const { NotFoundError } = require('./errors');
const authMiddleware = require('./middlewares/authMiddleware');
const db = require('./config/db');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeDatabase() {
    db.query('SELECT 1')
      .then(() => console.log('✅ Conexão com o banco de dados estabelecida'))
      .catch(err => {
        console.error('❌ Falha na conexão com o banco de dados:', err);
        process.exit(1);
      });
  }

  initializeMiddlewares() {
    this.app.use(helmet());

    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cookie',
        'X-Requested-With'
      ]
    }));

    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      next();
    });

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    this.app.use(limiter);

    this.app.use(session({
      secret: process.env.SESSION_SECRET || '777',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      },
      store: this.configureSessionStore()
    }));

    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    this.app.use(express.static(path.join(__dirname, 'frontend/public')));
    this.app.use('/js', express.static(path.join(__dirname, 'frontend/public/js')));
    this.app.use('/css', express.static(path.join(__dirname, 'frontend/public/css')));
  }

  
  configureSessionStore() {
    if (process.env.NODE_ENV === 'production') {
      const MySQLStore = require('express-mysql-session')(session);
      return new MySQLStore({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        clearExpired: true,
        checkExpirationInterval: 900000
      });
    }
    return undefined;
  }

  initializeRoutes() {
    // 1. Configuração de arquivos estáticos (DEVE vir antes das rotas)
    this.app.use(express.static(path.join(__dirname, 'frontend/public/views')));
    this.app.use('/js', express.static(path.join(__dirname, 'frontend/public/js')));
    this.app.use('/css', express.static(path.join(__dirname, 'frontend/public/css')));

    // 2. Rota raiz - Página inicial
    this.app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
    });

    // 3. Rotas de API públicas
    this.app.use('/api/auth', require('./routes/authRoutes'));
    this.app.use('/api/usuarios', require('./routes/usuarioRoutes'));
    
    // Health check
    this.app.get('/api/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date() });
    });

    // 4. Rotas para páginas HTML (sem .html na URL)
    this.app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/views/dashboard.html'));
    });

    this.app.get('/dashboard-admin', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/views/dashboard_admin.html'));
    });

    this.app.get('/suporte-ti', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/views/it_suport.html'));
    });

    this.app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/views/login.html'));
    });

    // 5. Middleware de autenticação (protege as rotas abaixo)
    this.app.use(authMiddleware.autenticacao);

    // 6. Rotas de API privadas
    this.app.use('/api/empresas', require('./routes/empresaRoutes'));
    this.app.use('/api/funcionarios', require('./routes/funcionarioRoutes'));
    this.app.use('/api/registros', require('./routes/registroRoutes'));
    this.app.use('/api/admin', require('./routes/adminRoutes'));
    this.app.use('/api/dashboard', require('./routes/dashboardRoutes'));

    // 7. Rota fallback (DEVE ser a última)
    this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
    });
}

  initializeErrorHandling() {
    this.app.use((req, res, next) => {
      next(new NotFoundError('Endpoint não encontrado'));
    });

    this.app.use((err, req, res, next) => {
      console.error('Erro:', err.stack);

      const statusCode = err.statusCode || 500;
      const response = {
        error: {
          message: err.message,
          type: err.name
        }
      };

      if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
      }

      res.status(statusCode).json(response);
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Servidor rodando na porta ${this.port}`);
      console.log(`🔗 Acesse: http://localhost:${this.port}`);
    });

    process.on('unhandledRejection', (err) => {
      console.error('Erro não tratado:', err);
      this.server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('👋 Recebido SIGTERM. Encerrando servidor...');
      this.server.close(() => {
        console.log('Servidor encerrado');
        process.exit(0);
      });
    });
  }
}

const app = new App();
app.start();

module.exports = app;