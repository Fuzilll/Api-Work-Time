const express = require('express');
const router = express.Router();
const ChamadoController = require('../controllers/ChamadoController');
const EmpresaController = require('../controllers/EmpresaController'); // Adicione esta linha
const authMiddleware = require('../middlewares/authMiddleware');

// Middlewares globais
router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel(['ADMIN', 'IT_SUPPORT', 'FUNCIONARIO']));
const upload = require('../middlewares/uploadMiddleware');

// Rotas para chamados
router.post('/', ChamadoController.criarChamado);
router.get('/', ChamadoController.listarChamados);
router.get('/:id', ChamadoController.obterChamado);
router.put('/:id', ChamadoController.atualizarChamado);
router.post('/:id/anexo', ChamadoController.adicionarAnexo);

router.post('/:id/midia', upload.single('file'), ChamadoController.uploadMidia);
// rota para empresas
router.get('/empresas/listar', ChamadoController.listarEmpresas);

module.exports = router;