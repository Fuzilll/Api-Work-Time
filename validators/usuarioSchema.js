// Importação do módulo Joi para validação de dados
// Joi é uma biblioteca que permite validar objetos e dados em JavaScript, facilitando a implementação de regras de negócios no backend
const Joi = require('joi'); 

// Importa constantes de níveis de usuários, possivelmente definidos em outro arquivo
// Esses níveis podem ser usados para restringir ou definir permissões de acordo com o tipo de usuário
const { niveisUsuario } = require('../constants'); 

// Expressões regulares para validação de CPF e Registro de Funcionário
// O CPF deve ter 11 dígitos e o registro de funcionário deve ser uma string alfanumérica com entre 5 e 20 caracteres
const cpfRegex = /^\d{11}$/;
const registroEmpRegex = /^[A-Z0-9]{5,20}$/;

// Módulo exportado, que contém todos os esquemas de validação utilizados nas rotas da API.
module.exports = {
  
  // Validação de dados para o cadastro de um novo usuário
  cadastro: Joi.object({
    
    // Validação para o campo 'nome'
    // O nome deve ser uma string entre 3 e 150 caracteres e não pode ser vazio
    nome: Joi.string().min(3).max(150).required()
      .messages({
        'string.empty': 'Nome é obrigatório', // Mensagem personalizada caso o campo esteja vazio
        'string.min': 'Nome deve ter pelo menos 3 caracteres', // Mensagem personalizada caso o nome tenha menos de 3 caracteres
        'string.max': 'Nome não pode exceder 150 caracteres' // Mensagem personalizada caso o nome exceda 150 caracteres
      }),

    // Validação para o campo 'email'
    // O email deve ser válido (formato padrão) e não pode ultrapassar 150 caracteres
    email: Joi.string().email().max(150).required()
      .messages({
        'string.email': 'Email inválido', // Caso o email não esteja no formato correto
        'string.empty': 'Email é obrigatório' // Caso o email esteja vazio
      }),

    // Validação para o campo 'senha'
    // A senha deve ter entre 8 e 50 caracteres e passar por uma verificação de complexidade
    senha: Joi.string().min(8).max(50).required()
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')) // A senha deve ter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial
      .messages({
        'string.pattern.base': 'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial', 
        'string.min': 'Senha deve ter pelo menos 8 caracteres',
        'string.empty': 'Senha é obrigatória'
      }),

    // Validação para o campo 'nivel'
    // O nível do usuário deve ser um valor válido, dentro das opções definidas em 'niveisUsuario'
    nivel: Joi.string().valid(...Object.values(niveisUsuario)).required()
      .messages({
        'any.only': 'Nível de usuário inválido', // Mensagem caso o nível não seja válido
        'string.empty': 'Nível é obrigatório' // Mensagem caso o nível não seja informado
      }),

    // Validação para o campo 'cpf'
    // O CPF deve ser uma string com exatamente 11 dígitos numéricos
    cpf: Joi.string().pattern(cpfRegex).required()
      .messages({
        'string.pattern.base': 'CPF deve conter 11 dígitos', // Mensagem personalizada caso o CPF não tenha 11 dígitos
        'string.empty': 'CPF é obrigatório' // Mensagem caso o CPF esteja vazio
      }),

    // Validação para o campo 'status'
    // O status do usuário deve ser 'Ativo' ou 'Inativo'
    status: Joi.string().valid('Ativo', 'Inativo'),

    // Validação para o campo 'foto_perfil_url'
    // A URL da foto de perfil deve ser uma string que represente uma URL válida e não deve ultrapassar 255 caracteres
    foto_perfil_url: Joi.string().uri().max(255),

    // Validação para o campo 'registro_emp' que só é necessário para o nível 'FUNCIONARIO'
    registro_emp: Joi.when('nivel', {
      is: 'FUNCIONARIO', // Caso o nível seja 'FUNCIONARIO', o registro é obrigatório
      then: Joi.string().pattern(registroEmpRegex).required()
        .messages({
          'string.pattern.base': 'Registro inválido', // Mensagem caso o registro não tenha o formato correto
          'string.empty': 'Registro é obrigatório para funcionários' // Mensagem caso o registro não seja informado
        })
    }),

    // Validação para o campo 'funcao' que só é necessário para o nível 'FUNCIONARIO'
    funcao: Joi.when('nivel', {
      is: 'FUNCIONARIO', // Caso o nível seja 'FUNCIONARIO', a função é obrigatória
      then: Joi.string().max(150).required()
        .messages({
          'string.empty': 'Função é obrigatória para funcionários' // Mensagem caso a função não seja informada
        })
    }),

    // Validação para o campo 'data_admissao' que só é necessário para o nível 'FUNCIONARIO'
    data_admissao: Joi.when('nivel', {
      is: 'FUNCIONARIO', // Caso o nível seja 'FUNCIONARIO', a data de admissão é obrigatória
      then: Joi.date().required()
        .messages({
          'date.base': 'Data de admissão inválida', // Mensagem caso a data de admissão tenha formato inválido
          'any.required': 'Data de admissão é obrigatória para funcionários' // Mensagem caso a data de admissão não seja informada
        })
    }),

    // Validação para o campo 'id_empresa' que é necessário para os níveis 'ADMIN' e 'FUNCIONARIO'
    id_empresa: Joi.when('nivel', {
      is: Joi.valid('ADMIN', 'FUNCIONARIO'), // Caso o nível seja 'ADMIN' ou 'FUNCIONARIO', a empresa é obrigatória
      then: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Empresa é obrigatória', // Mensagem caso o ID da empresa não seja fornecido
          'any.required': 'Empresa é obrigatória' // Mensagem caso o ID da empresa não seja fornecido
        })
    })
  }),

  // Validação para o login
  login: Joi.object({
    email: Joi.string().email().required() // O email deve ser válido e obrigatório
      .messages({
        'string.email': 'Email inválido',
        'string.empty': 'Email é obrigatório'
      }),
    
    senha: Joi.string().required() // A senha é obrigatória
      .messages({
        'string.empty': 'Senha é obrigatória'
      })
  }),

  // Validação para a solicitação de recuperação de senha
  recuperarSenha: Joi.object({
    email: Joi.string().email().required() // O email é obrigatório e deve ser válido
      .messages({
        'string.email': 'Email inválido',
        'string.empty': 'Email é obrigatório'
      })
  }),

  // Validação para o reset de senha
  resetarSenha: Joi.object({
    token: Joi.string().required() // O token é obrigatório para a recuperação da senha
      .messages({
        'string.empty': 'Token é obrigatório'
      }),
    
    novaSenha: Joi.string().min(8).max(50).required() // A nova senha deve ter entre 8 e 50 caracteres
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')) // A nova senha deve ter uma complexidade mínima
      .messages({
        'string.pattern.base': 'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
        'string.min': 'Senha deve ter pelo menos 8 caracteres',
        'string.empty': 'Senha é obrigatória'
      })
  }),

  // Validação para atualizar o perfil do usuário
  atualizarPerfil: Joi.object({
    nome: Joi.string().min(3).max(150) // O nome deve ter entre 3 e 150 caracteres
      .messages({
        'string.min': 'Nome deve ter pelo menos 3 caracteres',
        'string.max': 'Nome não pode exceder 150 caracteres'
      }),

    cpf: Joi.string().pattern(cpfRegex) // O CPF deve ter o formato válido
      .messages({
        'string.pattern.base': 'CPF deve conter 11 dígitos'
      }),

    foto_perfil_url: Joi.string().uri().max(255) // A URL da foto de perfil deve ser válida e ter no máximo 255 caracteres
  }),

  // Validação para alterar a senha do usuário
  alterarSenha: Joi.object({
    senhaAtual: Joi.string().required() // A senha atual deve ser fornecida
      .messages({
        'string.empty': 'Senha atual é obrigatória'
      }),

    novaSenha: Joi.string().min(8).max(50).required() // A nova senha deve ter entre 8 e 50 caracteres
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')) // A nova senha deve ter uma complexidade mínima
      .messages({
        'string.pattern.base': 'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
        'string.min': 'Senha deve ter pelo menos 8 caracteres',
        'string.empty': 'Nova senha é obrigatória'
      })
  }),

  // Validação para alterar o status do usuário
  alterarStatus: Joi.object({
    status: Joi.string().valid('Ativo', 'Inativo').required() // O status deve ser 'Ativo' ou 'Inativo'
      .messages({
        'any.only': 'Status deve ser Ativo ou Inativo',
        'string.empty': 'Status é obrigatório'
      })
  })
};
