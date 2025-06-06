// Importação do Joi para validação de dados de entrada
const Joi = require('joi');
const { body } = require('express-validator');

// Este módulo exporta objetos de validação para diferentes operações de autenticação.
// O Joi é usado para garantir que os dados recebidos nas requisições estejam em conformidade com os requisitos especificados.
// Ambiente de execução: Node.js, geralmente utilizado com Express.js para validações em rotas.

module.exports = {

  /**
   * Validação de dados para a rota de login.
   * O objetivo é garantir que o e-mail e a senha fornecidos sejam válidos.
   * - O e-mail deve ser um e-mail válido.
   * - A senha é obrigatória.
   */
  login: Joi.object({
    // Validação do e-mail: deve ser uma string no formato de e-mail
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email inválido', // Mensagem de erro caso o e-mail não seja válido
        'string.empty': 'Email é obrigatório' // Mensagem de erro caso o e-mail não seja fornecido
      }),
    // Validação da senha: a senha deve ser uma string não vazia
    senha: Joi.string().required()
      .messages({
        'string.empty': 'Senha é obrigatória' // Mensagem de erro caso a senha não seja fornecida
      })
  }),

  recuperarSenha: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail()
  ],
  resetarSenha: [
    body('token')
      .notEmpty()
      .withMessage('Token é obrigatório'),
    body('novaSenha')
      .isLength({ min: 8 })
      .withMessage('A senha deve ter pelo menos 8 caracteres')
      .trim()
  ]
};
