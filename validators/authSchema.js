// Importação do Joi para validação de dados de entrada
const Joi = require('joi');

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

  /**
   * Validação de dados para a rota de recuperação de senha.
   * O objetivo é garantir que o e-mail fornecido para a recuperação seja válido.
   * - O e-mail é obrigatório e deve ter formato válido.
   */
  recuperarSenha: Joi.object({
    // Validação do e-mail para recuperação de senha
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email inválido', // Mensagem de erro caso o e-mail não seja válido
        'string.empty': 'Email é obrigatório' // Mensagem de erro caso o e-mail não seja fornecido
      })
  }),

  /**
   * Validação de dados para a rota de reset de senha.
   * O objetivo é garantir que:
   * - O token de recuperação de senha seja fornecido e válido.
   * - A nova senha siga critérios de segurança.
   * A senha deve ter pelo menos 8 caracteres, conter letras maiúsculas, minúsculas, números e caracteres especiais.
   */
  resetarSenha: Joi.object({
    // Validação do token de recuperação: o token é obrigatório
    token: Joi.string().required()
      .messages({
        'string.empty': 'Token é obrigatório' // Mensagem de erro caso o token não seja fornecido
      }),
    // Validação da nova senha: a senha deve ter entre 8 e 50 caracteres e atender a critérios de complexidade
    novaSenha: Joi.string().min(8).max(50).required()
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')) // Expressão regular para garantir que a senha tenha pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial
      .messages({
        'string.pattern.base': 'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial', // Mensagem de erro para a expressão regular
        'string.min': 'Senha deve ter pelo menos 8 caracteres', // Mensagem de erro se a senha for menor que 8 caracteres
        'string.empty': 'Senha é obrigatória' // Mensagem de erro se a senha não for fornecida
      })
  })
};
