const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const adminController = require('../controllers/adminController');

router.post('/cadastrar', empresaController.cadastrarEmpresa);
router.post('/cadastrar-admin', empresaController.cadastrarAdmin);

router.get('/listar-empresas', empresaController.listarEmpresas);


//rotas dos admin
router.post('/cadastrar-funcionario', adminController.cadastrarFuncionario);
router.post('/admin-aprovarRejeitarPonto', adminController.aprovarRejeitarPonto);

router.get('/admin-resumoFuncionarios', adminController.resumoFuncionarios);
router.get('/admin-relatorioPontos', adminController.relatorioPontos);
router.get('/admin-ultimosRegistrosPonto', adminController.ultimosRegistrosPonto);

module.exports = router;
