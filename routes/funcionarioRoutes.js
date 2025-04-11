const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const funcionarioSchema = require('../validators/funcionarioSchema');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel('FUNCIONARIO'));

// Rotas de perfil
router.get('/perfil', funcionarioController.obterPerfil);

// Rotas de histórico
router.get(
  '/historico-pontos',
  validate(funcionarioSchema.filtrosHistorico, 'query'),
  funcionarioController.listarHistoricoPontos
);

// Rotas de solicitações
router.post(
  '/solicitar-alteracao-ponto',
  validate(funcionarioSchema.solicitarAlteracaoPonto),
  funcionarioController.solicitarAlteracaoPonto
);

router.get('/solicitacoes', funcionarioController.listarSolicitacoes);

module.exports = router;