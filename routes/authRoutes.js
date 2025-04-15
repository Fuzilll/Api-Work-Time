// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validators');
const authSchema = require('../validators/authSchema');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 */
router.post('/login',
  validate(authSchema.login),  // Validação dos dados de entrada
  authController.login         // Controller de login
);

// Rota para solicitar recuperação de senha - Valida os dados de recuperação e chama a função correspondente
router.post('/recuperar-senha',
  validate(authSchema.recuperarSenha),  // Valida os dados de recuperação de senha
  authController.solicitarRecuperacaoSenha  // Chama a função que inicia o processo de recuperação de senha
);

// Rota para resetar a senha - Valida os dados e chama a função de reset
router.post('/resetar-senha',
  validate(authSchema.resetarSenha),  // Valida os dados para resetar a senha
  authController.resetarSenha        // Chama a função que efetua o reset da senha
);

// Rota protegida para verificar a sessão do usuário autenticado
router.get('/sessao',
  authMiddleware.autenticacao,  // Chama o middleware de autenticação para garantir que o usuário está autenticado
  authController.verificarSessao  // Chama a função que verifica os dados da sessão do usuário
);

router.post('/logout', 
  authMiddleware.autenticacao,  // Garante que apenas usuários autenticados podem fazer logout
  authController.logout
);

// Exporta o roteador para ser utilizado na aplicação principal
module.exports = router;