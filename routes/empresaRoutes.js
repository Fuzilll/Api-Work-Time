const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas abertas (sem autenticação)
router.post('/cadastrar', empresaController.cadastrarEmpresa);

// ===============================================
// ROTAS PARA IT SUPPORT (Protegidas por nível)
// ===============================================
router.use(authMiddleware.verificarNivel('IT_SUPPORT'));

// Listagem de empresas
router.get('/listar', empresaController.listarEmpresas);

// Gerenciamento de status de empresas
router.put('/:id_empresa/alternar-status', 
    authMiddleware.verificarEmpresa,
    empresaController.alternarStatusEmpresa
);

// Remoção de empresas
router.delete('/:id_empresa/remover', 
    authMiddleware.verificarEmpresa,
    empresaController.removerEmpresa
);

// Cadastro de administradores
router.post('/:id_empresa/cadastrar-admin', 
    authMiddleware.verificarEmpresa,
    empresaController.cadastrarAdmin
);

// ===============================================
// ROTAS PARA ADMINISTRADORES DE EMPRESA
// ===============================================

// Middleware de proteção para todas as rotas de admin
router.use('/:id_empresa/admin', [
    authMiddleware.verificarNivel('ADMIN'),
    authMiddleware.verificarEmpresa
]);

// Cadastro de funcionários (protegido por permissão específica)
router.post('/:id_empresa/admin/funcionarios', 
    authMiddleware.verificarPermissao('cadastrar_funcionario'),
    adminController.cadastrarFuncionario
);

// Dashboard e resumos
router.get('/:id_empresa/admin/resumo', 
    authMiddleware.verificarPermissao('visualizar_relatorios'),
    adminController.resumoFuncionarios
);

// Relatórios de pontos
router.get('/:id_empresa/admin/relatorios/pontos', 
    authMiddleware.verificarPermissao('visualizar_relatorios'),
    adminController.relatorioPontos
);

// Registros recentes
router.get('/:id_empresa/admin/registros-recentes', 
    authMiddleware.verificarPermissao('visualizar_pontos'),
    adminController.ultimosRegistrosPonto
);

// Pontos pendentes
router.get('/:id_empresa/admin/pontos-pendentes', 
    authMiddleware.verificarPermissao('aprovar_pontos'),
    adminController.carregarPontosPendentes
);

// Busca de pontos
router.get('/:id_empresa/admin/pontos', 
    authMiddleware.verificarPermissao('visualizar_pontos'),
    adminController.buscarPontos
);

// Atualização de status de ponto
router.put('/:id_empresa/admin/pontos/:id_ponto/status', 
    authMiddleware.verificarPermissao('aprovar_pontos'),
    adminController.atualizarStatusPonto
);

module.exports = router;