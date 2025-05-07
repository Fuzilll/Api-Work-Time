// routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');

router.get('/test', async (req, res) => {
  try {
    const result = await EmailService.enviarEmailRegistroPonto('seu-email@exemplo.com', {
      nome: 'Teste',
      tipo: 'Entrada',
      dataHora: new Date(),
      dispositivo: 'Dispositivo Teste',
      empresa: 'Empresa Teste'
    });
    
    res.json({
      success: true,
      message: 'Email de teste enviado',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Falha ao enviar email',
      error: error.message,
      details: error
    });
  }
});

module.exports = router;