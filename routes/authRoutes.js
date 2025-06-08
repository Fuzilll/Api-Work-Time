// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validators');
const authSchema = require('../validators/authSchema');
const authMiddleware = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

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

router.post('/recuperar-senha',
  body('email').isEmail().normalizeEmail(),
  authController.solicitarRecuperacaoSenha
);


router.post('/resetar-senha',
  [
    body('token').notEmpty().trim(),
    body('novaSenha').isLength({ min: 8 }).trim()
  ],
  authController.resetarSenha
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