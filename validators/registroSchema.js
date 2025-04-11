// Importa o módulo Joi para validação de dados
const Joi = require('joi');

// Define os esquemas de validação para os dados do cadastro e filtros
module.exports = {
  // Esquema de validação para o cadastro de um registro de ponto
  cadastro: Joi.object({
    // Valida o ID do funcionário
    id_funcionario: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'ID do funcionário deve ser um número', // Mensagem de erro caso não seja um número
        'any.required': 'ID do funcionário é obrigatório' // Mensagem de erro caso o campo seja ausente
      }),

    // Valida o tipo de registro, que deve ser uma das opções pré-definidas
    tipo: Joi.string().valid('Entrada', 'Saida', 'Intervalo', 'Retorno').required()
      .messages({
        'any.only': 'Tipo de registro inválido', // Mensagem de erro caso o tipo não seja um dos valores válidos
        'string.empty': 'Tipo de registro é obrigatório' // Mensagem de erro caso o campo esteja vazio
      }),

    // Valida a URL da foto, que deve ser uma URL válida, podendo ser nula ou uma string vazia
    foto_url: Joi.string().uri().allow(null, ''),

    // Valida a latitude, deve estar entre -90 e 90, podendo ser nula
    latitude: Joi.number().min(-90).max(90).allow(null),

    // Valida a longitude, deve estar entre -180 e 180, podendo ser nula
    longitude: Joi.number().min(-180).max(180).allow(null),

    // Valida a precisão da geolocalização, deve ser um número positivo, podendo ser nulo
    precisao_geolocalizacao: Joi.number().positive().allow(null),

    // Valida o dispositivo, que deve ser uma string com no máximo 100 caracteres
    dispositivo: Joi.string().max(100).required()
      .messages({
        'string.empty': 'Informação do dispositivo é obrigatória' // Mensagem de erro caso o dispositivo esteja vazio
      })
  }),

  // Esquema de validação para os filtros de busca de registros de ponto
  filtros: Joi.object({
    // Valida a data de início, deve ser uma data no formato ISO
    dataInicio: Joi.date().iso(),

    // Valida a data de fim, deve ser uma data no formato ISO e maior que a data de início
    dataFim: Joi.date().iso().greater(Joi.ref('dataInicio')),

    // Valida o status, que pode ser um dos três valores: 'Aprovado', 'Pendente', ou 'Rejeitado'
    status: Joi.string().valid('Aprovado', 'Pendente', 'Rejeitado'),

    // Valida o ID do funcionário, deve ser um número inteiro positivo
    idFuncionario: Joi.number().integer().positive(),

    // Valida o ID da empresa, deve ser um número inteiro positivo
    idEmpresa: Joi.number().integer().positive()
  })
};
