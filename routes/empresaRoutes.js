const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const empresaSchema = require('../validators/empresaSchema');




// Rotas protegidas
router.use(authMiddleware.autenticacao);

// Rotas para IT Support
router.use(authMiddleware.verificarNivel('IT_SUPPORT'));

router.post('/cadastrar',validate(empresaSchema.cadastro),empresaController.cadastrarEmpresa);
router.get('/listar', empresaController.listarEmpresas);

router.delete('/:id', empresaController.removerEmpresa);
router.put('/:id/status', empresaController.alternarStatus);
router.get('/:id', empresaController.obterEmpresa);
router.post('/cadastrar-admin', validate(empresaSchema.cadastroAdmin), empresaController.cadastrarAdmin);

module.exports = router;