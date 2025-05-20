// Carrega variáveis de ambiente a partir do arquivo .env
require('dotenv').config();

// Importa os principais módulos utilizados na aplicação
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const estadosRoutes = require('./routes/estadosRoutes');

// Importa módulos internos do projeto
const { NotFoundError } = require('./errors');
const authMiddleware = require('./middlewares/authMiddleware');
const db = require('./config/db');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;

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
    // Configuração de CSP
    const cspConfig = {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Necessário para alguns componentes do Bootstrap
          "https://cdn.jsdelivr.net", // Para Bootstrap CDN
          "https://code.jquery.com" // Se usar jQuery
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Necessário para alguns estilos inline
          "https://cdn.jsdelivr.net", // Para Bootstrap CSS
          "https://fonts.googleapis.com" // Se usar Google Fonts
        ],
        imgSrc: [
          "'self'",
          "data:", // Para imagens em base64
          "https://*.cloudinary.com", // Se usar Cloudinary
          "https://*.googleapis.com",
          "https://*.gstatic.com"
        ],
        fontSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://fonts.gstatic.com"
        ],
        connectSrc: ["'self'"],
        frameSrc: ["https://www.google.com"] // Para mapas do Google
      }
    };

    // Configuração de segurança com helmet
    this.app.use(helmet({
      contentSecurityPolicy: cspConfig
    }));

    // Restante das configurações permanecem iguais
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
      max: 10000 
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
    const MySQLStore = require('express-mysql-session')(session);
    return new MySQLStore({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      clearExpired: true,
      checkExpirationInterval: 900000
    });
  }

  initializeRoutes() {
    // 1. Configuração de arquivos estáticos
    this.app.use(express.static(path.join(__dirname, 'frontend/public/views')));
    this.app.use('/js', express.static(path.join(__dirname, 'frontend/public/js')));
    this.app.use('/css', express.static(path.join(__dirname, 'frontend/public/css')));

    // 2. Rotas públicas (não requerem autenticação)
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
    });

    this.app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/public/views/login.html'));
    });
    this.app.post('/api/auth/logout', require('./controllers/authController').logout);
    
    this.app.use('/api/email', require('./routes/emailRoutes'));

    // 3. Rotas de API públicas
    this.app.use('/api/auth', require('./routes/authRoutes'));
    this.app.use('/api/usuarios', require('./routes/usuarioRoutes'));
    this.app.use('/api/estados', require('./routes/estadosRoutes'));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });

    // 4. Rotas para páginas HTML (sem .html na URL)
    this.app.get('/dashboard', authMiddleware.autenticacao, (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/public/views/dashboard.html'));
    });

    this.app.get('/dashboard-admin', authMiddleware.autenticacao, (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/public/views/dashboard_admin.html'));
    });

    this.app.get('/suporte-ti', authMiddleware.autenticacao, (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/public/views/it_suport.html'));
    });

    // 5. Rotas de API privadas (protegidas por autenticação)
    this.app.use('/api/empresas', authMiddleware.autenticacao, require('./routes/empresaRoutes'));
    this.app.use('/api/funcionarios', authMiddleware.autenticacao, require('./routes/funcionarioRoutes'));
    this.app.use('/api/registros', authMiddleware.autenticacao, require('./routes/registroRoutes'));
    this.app.use('/api/admin', authMiddleware.autenticacao, require('./routes/adminRoutes'));
    this.app.use('/api/dashboard', authMiddleware.autenticacao, require('./routes/dashboardRoutes'));

    //testando
    this.app.use('/api/chamados', authMiddleware.autenticacao, require('./routes/chamadoRoutes'));

    // 6. Rota fallback (DEVE ser a última)
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
