const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');

router.post('/cadastrar', empresaController.cadastrarEmpresa);
router.post('/cadastrar-admin', empresaController.cadastrarAdmin);

module.exports = router;
