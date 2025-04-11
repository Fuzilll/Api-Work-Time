const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const registroSchema = require('../validators/registroSchema');

// Rotas públicas (para integração com app mobile)
router.post(
  '/registrar',
  validate(registroSchema.cadastro),
  registroController.cadastrarRegistro
);

// Rotas protegidas
router.use(authMiddleware.autenticacao);

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

module.exports = router;