// Importa a biblioteca Joi para definição de esquemas de validação de dados
const Joi = require('joi');

// Exporta objeto contendo diferentes esquemas de validação
// Ambiente de execução: Node.js — esse arquivo é comumente usado em middlewares de validação
module.exports = {

  /**
   * Validação para cadastro de funcionário
   * - Utilizado ao criar um novo colaborador via endpoint
   * - Garante formato, obrigatoriedade e limites dos dados recebidos
   */
  cadastroFuncionario: Joi.object({
    nome: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    senha: Joi.string().min(8).required(),
    cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
    registro_emp: Joi.string().required(),
    funcao: Joi.string().required(),
    data_admissao: Joi.date().required(),
    departamento: Joi.string().allow(null, ''),
    salario_base: Joi.number().positive().allow(null),
    tipo_contrato: Joi.string().valid('CLT', 'PJ', 'Estagiario', 'Temporario').default('CLT'),
    horarios: Joi.array().items(
      Joi.object({
        dia_semana: Joi.string().valid('Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo').required(),
        hora_entrada: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        hora_saida: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        intervalo_inicio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
        intervalo_fim: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null)
      })
    ).optional()
  }),

  /**
   * Validação para alteração de status de um ponto (registro de ponto)
   * - Utilizado na aprovação ou rejeição por parte de um gestor
   */
  atualizarStatusPonto: Joi.object({
    // Só permite os status pré-definidos
    status: Joi.string().valid('Aprovado', 'Rejeitado').required()
  }),

  /**
   * Validação para filtros de relatório de ponto
   * - Permite filtrar por período, status e busca textual
   * - Utilizado em endpoints analíticos e de exportação
   */
  filtrosRelatorio: Joi.object({
    // Data de início do período (formato ISO, opcional)
    dataInicio: Joi.date().iso(),

    // Data final deve ser maior que a inicial, se fornecida
    dataFim: Joi.date().iso().greater(Joi.ref('dataInicio')),

    // Filtra por status de ponto (opcional)
    status: Joi.string().valid('Aprovado', 'Pendente', 'Rejeitado'),

    // Campo de busca textual (nome, email, etc), aceita vazio
    busca: Joi.string().allow('')
  })
};
