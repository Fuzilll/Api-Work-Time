const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const adminSchema = require('../validators/adminSchema');

// Middlewares globais
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel(['ADMIN', 'IT_SUPPORT']));

// =============================================
// ROTAS DE FUNCIONÁRIOS
// =============================================
router.get('/funcionarios', 
  validate(adminSchema.filtrosFuncionario, 'query'),
  adminController.listarFuncionarios
);

router.post('/funcionarios',
  validate(adminSchema.cadastroFuncionario),
  adminController.cadastrarFuncionario
);

router.get('/funcionarios/:id',
  adminController.obterFuncionario
);

router.put('/funcionarios/:id',
  validate(adminSchema.atualizarFuncionario),
  adminController.atualizarFuncionario
);

router.put('/funcionarios/:id/horarios',
  validate(adminSchema.horariosFuncionario),
  adminController.atualizarHorariosFuncionario
);
router.get('/funcionarios/:id/horarios',
  adminController.obterHorariosFuncionario
);

router.put('/funcionarios/:id/desativar',
  adminController.desativarFuncionario
);
router.put('/funcionarios/:id/reativar',
  adminController.reativarFuncionario
);

router.delete('/funcionarios/:id',
  adminController.excluirFuncionario
);

router.get('/departamentos', adminController.listarDepartamentos);


// =============================================
// ROTAS DE PONTOS
// =============================================
router.get('/pontos',
  validate(adminSchema.filtrosRelatorio, 'query'),
  adminController.buscarPontos
);

router.get('/pontos/pendentes',
  adminController.carregarPontosPendentes
);

router.get('/pontos/:id/detalhes',
  adminController.obterDetalhesPonto
);

router.put('/pontos/:id/status',
  validate(adminSchema.atualizarStatusPonto),
  adminController.atualizarStatusPonto
);

// =============================================
// ROTAS DE RELATÓRIOS
// =============================================
router.get('/resumo',
  adminController.resumoFuncionarios
);

router.get('/relatorios/pontos',
  validate(adminSchema.filtrosRelatorio, 'query'),
  adminController.relatorioPontos
);

// =============================================
// ROTAS DE SOLICITAÇÕES
// =============================================
router.get('/solicitacoes/pendentes', 
  adminController.listarSolicitacoesPendentes
);

router.get('/solicitacoes/:id', 
  adminController.obterDetalhesSolicitacao
);

router.post('/solicitacoes/:id/processar', 
  adminController.processarSolicitacao
);

module.exports = router;