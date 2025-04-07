const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação
router.use(authMiddleware.verificarNivel('FUNCIONARIO'));

// Rotas de funcionário
router.get('/perfil', funcionarioController.carregarPerfil);
router.get('/historico-pontos', funcionarioController.listarHistoricoPontos);

// Rota para solicitar alteração de ponto
router.post('/solicitar-alteracao-ponto', 
    funcionarioController.solicitarAlteracaoPonto
);

module.exports = router;