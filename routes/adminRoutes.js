const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const adminSchema = require('../validators/adminSchema');
const DashboardController = require('../controllers/dashboardController');

// Middleware para verificar se é admin da empresa
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel('ADMIN'));


// Rotas de funcionários
router.post(
  '/funcionarios',
  validate(adminSchema.cadastroFuncionario),
  adminController.cadastrarFuncionario
);

router.put(
  '/funcionarios/:id/desativar',
  adminController.desativarFuncionario
);

router.delete(
  '/funcionarios/:id',
  adminController.excluirFuncionario
);

// Rotas de relatórios
router.get(
  '/resumo',
  adminController.resumoFuncionarios
);

router.get(
  '/relatorios/pontos',
  validate(adminSchema.filtrosRelatorio, 'query'),
  adminController.relatorioPontos
);

// Rotas de pontos
router.get(
  '/pontos',
  validate(adminSchema.filtrosRelatorio, 'query'),
  adminController.buscarPontos
);

router.get(
  '/pontos/pendentes',
  adminController.carregarPontosPendentes
);

router.put(
  '/pontos/:id/status',
  validate(adminSchema.atualizarStatusPonto),
  adminController.atualizarStatusPonto
);

module.exports = router;