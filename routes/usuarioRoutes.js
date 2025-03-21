// usuarioRoutes.js - Rotas para os usuários
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Rota para cadastrar usuário
router.post('/cadastrar', usuarioController.cadastrarUsuario);

// Rota para login no android
router.post('/login', usuarioController.login);


module.exports = router;
