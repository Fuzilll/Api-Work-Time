const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const adminController = require('../controllers/adminController');

router.post('/cadastrar', empresaController.cadastrarEmpresa);
router.post('/cadastrar-admin', empresaController.cadastrarAdmin);
router.get('/listar-empresas', empresaController.listarEmpresas);

// Alternar status da empresa
router.put('/alternar-status/:id', empresaController.alternarStatusEmpresa);
// Remover empresa
router.delete('/remover/:id', empresaController.removerEmpresa);

// Rotas dos admin
router.post('/cadastrar-funcionario', adminController.cadastrarFuncionario);
router.get('/admin-resumoFuncionarios', adminController.resumoFuncionarios);
router.get('/admin-relatorioPontos', adminController.relatorioPontos);
router.get('/admin-ultimosRegistrosPonto', adminController.ultimosRegistrosPonto);


router.get('/carregar-pontos-pendentes', adminController.carregarPontosPendentes)
router.get('/buscar-pontos', adminController.buscarPontos);
router.put('/atualizar-status/:id/:status', adminController.atualizarStatusPonto);

module.exports = router;
