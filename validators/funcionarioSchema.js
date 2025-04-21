const Joi = require('joi');

module.exports = {
  registrarPonto: Joi.object({
    tipo: Joi.string().valid('Entrada', 'Saida').required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required()
  }),

  listarPontos: Joi.object({
    dataInicio: Joi.date().iso(),
    dataFim: Joi.date().iso().greater(Joi.ref('dataInicio')),
    limit: Joi.number().integer().min(1).max(100)
  })
};