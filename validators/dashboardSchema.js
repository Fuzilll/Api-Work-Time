// validators/dashboardSchema.js
const Joi = require('joi');

module.exports = {
  estatisticasMensais: Joi.object({
    ano: Joi.number().integer().min(2000).max(2100)
      .default(new Date().getFullYear())
  }),
  
  atualizarStatusPonto: Joi.object({
    status: Joi.string().valid('Aprovado', 'Rejeitado').required(),
    observacao: Joi.string().max(500).allow('', null)
  })
};