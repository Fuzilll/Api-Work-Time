const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController')
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/exportar-dados-excel',authMiddleware.autenticacao, exportController.exportToExcel);

module.exports = router;
