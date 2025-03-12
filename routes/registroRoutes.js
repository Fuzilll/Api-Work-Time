// registroRoutes.js - Rotas para os registros de ponto
const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');

// Rota para cadastrar um novo registro de ponto
router.post('/cadastrar', registroController.cadastrarRegistro);

// Rota para buscar registros de um usuário específico
router.get('/usuario/:userId', registroController.buscarRegistrosDoUsuario);

module.exports = router;