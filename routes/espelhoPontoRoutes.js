const express = require('express');
const router = express.Router();
const espelhoPontoController = require('../controllers/espelhoPontoController');
const authMiddleware = require('../middlewares/authMiddleware');
const { param, query, validationResult } = require('express-validator'); // Adicione esta linha

router.use(authMiddleware.verificarNivel(['ADMIN', 'IT_SUPPORT']));


router.get('/:id', 
    param('id').isInt().withMessage('ID deve ser um número inteiro'),
    query('dataInicial').isISO8601().withMessage('Data inicial inválida'),
    query('dataFinal').isISO8601().withMessage('Data final inválida'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    espelhoPontoController.getEspelhoPonto
);
module.exports = router;