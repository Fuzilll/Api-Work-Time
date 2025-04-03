const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController')
// Rota para listar o histórico de pontos do funcionário
router.get('/historico-pontos', funcionarioController.listarHistoricoPontos);

// Rota para pedir alteração de ponto
//router.post('/pedir-alteracao-ponto', funcionarioController.pedirAlteracaoPonto);

// Carregar dados do perfil do funcionário
router.get('/perfil', funcionarioController.carregarPerfil);

module.exports = router;