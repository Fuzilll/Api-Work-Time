// Importação da biblioteca Joi para validação de dados
const Joi = require('joi');  // Joi é utilizado para validar os dados que chegam ao servidor

// Exporte o objeto de validação para ser utilizado em outras partes do código
module.exports = {
  
  // Validação para o cadastro de uma nova empresa
  cadastro: Joi.object({
    // Validação do campo 'nome', com mínimo de 3 caracteres e máximo de 150
    nome: Joi.string().min(3).max(150).required()  // O campo nome deve ser uma string com 3 a 150 caracteres
      .messages({  // Personaliza as mensagens de erro para este campo
        'string.empty': 'Nome é obrigatório',  // Se o campo estiver vazio
        'string.min': 'Nome deve ter pelo menos 3 caracteres'  // Se o nome for menor que 3 caracteres
      }),

    // Validação do campo 'cnpj', deve ter exatamente 14 caracteres numéricos
    cnpj: Joi.string().length(14).pattern(/^\d+$/).required()  // O CNPJ precisa ter exatamente 14 dígitos numéricos
      .messages({  // Personaliza as mensagens de erro para o campo CNPJ
        'string.length': 'CNPJ deve ter 14 dígitos',  // Se o comprimento do CNPJ for diferente de 14
        'string.pattern.base': 'CNPJ deve conter apenas números'  // Se o CNPJ contiver caracteres não numéricos
      }),

    // Validação do campo 'cidade', deve ser uma string com entre 2 e 100 caracteres
    cidade: Joi.string().min(2).max(100).required(),  // O nome da cidade deve ter entre 2 e 100 caracteres

    // Validação do campo 'cep', precisa ter exatamente 8 caracteres numéricos
    cep: Joi.string().length(8).pattern(/^\d+$/).required(),  // O campo CEP deve ser composto apenas por números e ter exatamente 8 caracteres

    // Validação do campo 'rua', entre 2 e 150 caracteres
    rua: Joi.string().min(2).max(150).required(),  // O nome da rua deve ter entre 2 e 150 caracteres

    // Validação do campo 'numero', deve ser uma string com até 20 caracteres
    numero: Joi.string().max(20).required(),  // O número da rua pode ter até 20 caracteres (inclusive números e letras)

    // Validação do campo 'id_estado', deve ser um número inteiro positivo
    id_estado: Joi.number().integer().positive().required(),  // O campo id_estado deve ser um número inteiro positivo

    // Validação do campo 'ramo_atuacao', deve ter entre 2 e 100 caracteres
    ramo_atuacao: Joi.string().min(2).max(100).required(),  // O ramo de atuação da empresa deve ter entre 2 e 100 caracteres

    // Validação do campo 'email', deve ser um e-mail válido
    email: Joi.string().email().required(),  // O campo email deve ser um e-mail válido

    // Validação do campo 'telefone', deve ter entre 10 e 15 caracteres
    telefone: Joi.string().min(10).max(15).required()  // O número de telefone deve ter entre 10 e 15 caracteres, incluindo DDD
  }),

  // Validação para atualização dos dados de uma empresa
  atualizacao: Joi.object({
    // Validação do campo 'nome', com as mesmas regras que o cadastro, mas não obrigatório para atualização
    nome: Joi.string().min(3).max(150),  // O campo nome é opcional na atualização, mas caso presente, deve ter entre 3 e 150 caracteres

    // Validação do campo 'cidade', com as mesmas regras que o cadastro, mas não obrigatório
    cidade: Joi.string().min(2).max(100),  // O nome da cidade é opcional, mas deve ter entre 2 e 100 caracteres

    // Validação do campo 'cep', com as mesmas regras que o cadastro, mas não obrigatório
    cep: Joi.string().length(8).pattern(/^\d+$/),  // O campo CEP é opcional, mas se presente, deve ser numérico e ter exatamente 8 dígitos

    // Validação do campo 'rua', com as mesmas regras que o cadastro, mas não obrigatório
    rua: Joi.string().min(2).max(150),  // O nome da rua é opcional, mas se presente, deve ter entre 2 e 150 caracteres

    // Validação do campo 'numero', com as mesmas regras que o cadastro, mas não obrigatório
    numero: Joi.string().max(20),  // O número da rua é opcional, mas se presente, deve ter até 20 caracteres

    // Validação do campo 'id_estado', com as mesmas regras que o cadastro, mas não obrigatório
    id_estado: Joi.number().integer().positive(),  // O campo id_estado é opcional, mas se presente, deve ser um número inteiro positivo

    // Validação do campo 'ramo_atuacao', com as mesmas regras que o cadastro, mas não obrigatório
    ramo_atuacao: Joi.string().min(2).max(100),  // O ramo de atuação é opcional, mas se presente, deve ter entre 2 e 100 caracteres

    // Validação do campo 'email', com as mesmas regras que o cadastro, mas não obrigatório
    email: Joi.string().email(),  // O campo email é opcional, mas se presente, deve ser um e-mail válido

    // Validação do campo 'telefone', com as mesmas regras que o cadastro, mas não obrigatório
    telefone: Joi.string().min(10).max(15)  // O número de telefone é opcional, mas se presente, deve ter entre 10 e 15 caracteres
  })
  .min(1)  // A atualização deve ter pelo menos um campo presente. Isso significa que ao menos um campo precisa ser fornecido para a atualização ser válida.
};
