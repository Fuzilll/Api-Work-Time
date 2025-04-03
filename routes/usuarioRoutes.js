// usuarioRoutes.js - Rotas para os usuários
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
//const authMiddleware = require('../middlewares/authMiddleware');

// Rota para cadastrar usuário
router.post('/cadastrar', usuarioController.cadastrarUsuario);

// Rota para login no android
router.post('/login', usuarioController.loginWeb);


module.exports = router;
