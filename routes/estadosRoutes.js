const express = require('express');
const router = express.Router();
const estadosController = require ('../controllers/estadosController');;

router.get('/listar', estadosController.listarEstados);

module.exports = router;
