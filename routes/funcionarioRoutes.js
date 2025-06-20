const express = require('express');
const router = express.Router();
const FuncionarioController = require('../controllers/funcionarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const funcionarioSchema = require('../validators/funcionarioSchema');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware de autenticação para todas as rotas
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel(['FUNCIONARIO', 'ADMIN', 'IT_SUPPORT']));

// Rotas do dashboard
router.get('/dashboard', FuncionarioController.carregarDashboard);

router.post(
  '/pontos',
  upload.single('foto'),
  FuncionarioController.registrarPonto
);


router.get(
  '/pontos',
  validate(funcionarioSchema.listarPontos, 'query'),
  FuncionarioController.listarPontos
);

router.get('/pontos/:id', FuncionarioController.detalhesPonto);

// Rotas de horários
router.get('/horarios', FuncionarioController.listarHorarios);

router.get('/perfil', FuncionarioController.carregarPerfil);

// Solicitar alteração de ponto
router.post(
  '/solicitar-alteracao-ponto',
  FuncionarioController.solicitarAlteracaoPonto
);

router.get('/historico-pontos', FuncionarioController.listarHistoricoPontos);

// Listar solicitações de alteração
router.get(
  '/solicitacoes-alteracao',
  FuncionarioController.listarSolicitacoesAlteracao
);




router.post('/upload-foto-perfil', 
    upload.single('foto'), 
    FuncionarioController.uploadFotoPerfil
);


module.exports = router;