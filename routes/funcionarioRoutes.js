const express = require('express');
const router = express.Router();
const FuncionarioController = require('../controllers/funcionarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const funcionarioSchema = require('../validators/funcionarioSchema');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel(['FUNCIONARIO']));

// Rotas do dashboard
router.get('/dashboard', FuncionarioController.carregarDashboard);

// Rotas de pontos
router.post(
  '/pontos',
  validate(funcionarioSchema.registrarPonto),
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

module.exports = router;