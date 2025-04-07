const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');
const authMiddleware = require('../middlewares/authMiddleware');

// Registrar ponto (acessível para funcionários)
router.post('/registrar', 
    authMiddleware.verificarNivel('FUNCIONARIO'),
    registroController.cadastrarRegistro
);

// Buscar registros (com validações diferentes para cada nível)
router.get('/meus-registros', (req, res, next) => {
    if (req.nivel === 'FUNCIONARIO') {
        // Funcionário só pode ver os próprios registros
        req.params.userId = req.id_usuario;
        return registroController.buscarRegistrosDoUsuario(req, res, next);
    } else if (req.nivel === 'ADMIN') {
        // Admin pode ver registros da sua empresa
        return registroController.buscarRegistrosPorEmpresa(req, res, next);
    } else {
        // IT Support pode ver todos os registros
        return registroController.buscarTodosRegistros(req, res, next);
    }
});

module.exports = router;