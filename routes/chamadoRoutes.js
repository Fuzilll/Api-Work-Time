const express = require('express');
const router = express.Router();
const ChamadoController = require('../controllers/ChamadoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Middlewares globais
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel(['ADMIN', 'IT_SUPPORT', 'FUNCIONARIO']));

// Rotas para chamados
router.post('/', ChamadoController.criarChamado); // Alterado de '/chamados' para '/'
router.get('/', ChamadoController.listarChamados); // Alterado de '/listarChamados' para '/'
router.get('/:id', ChamadoController.obterChamado);
router.put('/:id', ChamadoController.atualizarChamado);
router.post('/:id/anexo', ChamadoController.adicionarAnexo);

module.exports = router;