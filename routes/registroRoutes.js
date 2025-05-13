const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');
const FuncionarioController = require('../controllers/funcionarioController')
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const registroSchema = require('../validators/registroSchema');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });



// Rotas protegidas
router.use(authMiddleware.autenticacao);

// Rotas públicas (para integração com app mobile)
router.post(
  '/registrar',
  upload.single('foto'), // Processa o upload da foto
  registroController.cadastrarRegistro
);

// Rotas para funcionários
router.get(
  '/meus-registros',
  authMiddleware.verificarNivel('FUNCIONARIO'),
  registroController.buscarRegistrosFuncionario
);

// Rotas para administradores
router.get(
  '/empresa',
  authMiddleware.verificarNivel('ADMIN'),
  validate(registroSchema.filtros, 'query'),
  registroController.buscarRegistrosEmpresa
);


// Rotas para IT Support
router.get(
  '/todos',
  authMiddleware.verificarNivel('IT_SUPPORT'),
  validate(registroSchema.filtros, 'query'),
  registroController.buscarTodosRegistros
);

router.get('/android/registros', FuncionarioController.listarPontosAndroid);

module.exports = router;