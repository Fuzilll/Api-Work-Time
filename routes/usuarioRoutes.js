const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas públicas
router.post('/cadastrar', usuarioController.cadastrarUsuario);
router.post('/login', usuarioController.loginWeb);
router.post('/recuperar-senha', usuarioController.solicitarRecuperacaoSenha);
router.post('/resetar-senha', usuarioController.resetarSenha);

// Rotas protegidas
router.use(authMiddleware.autenticacao);

// Perfil do usuário
router.get('/meu-perfil', usuarioController.obterPerfil);
router.put('/atualizar-perfil', usuarioController.atualizarPerfil);
router.put('/alterar-senha', usuarioController.alterarSenha);

// Rotas específicas para IT Support
router.use(authMiddleware.verificarNivel('IT_SUPPORT'));
router.get('/listar', usuarioController.listarUsuarios);
router.put('/:id/status', usuarioController.alterarStatusUsuario);

module.exports = router;