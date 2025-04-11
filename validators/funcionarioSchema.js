// Importação do módulo 'Joi', utilizado para validação de dados em Node.js.
// O Joi facilita a validação de objetos, strings, números e outros tipos de dados.
const Joi = require('joi'); 

// Exporta o objeto que contém as definições de validação para as solicitações de alteração de ponto e filtros de histórico.
// A estrutura está organizada em dois blocos principais: 'solicitarAlteracaoPonto' e 'filtrosHistorico'.
module.exports = {

  // Definição de esquema de validação para a solicitação de alteração de ponto.
  // Contextualização: Esse esquema de validação é utilizado para garantir que os dados fornecidos
  // pelo usuário para a solicitação de alteração de ponto sejam válidos antes de serem processados.
  solicitarAlteracaoPonto: Joi.object({
    // Validação do campo 'id_registro' que deve ser um número inteiro positivo.
    // O método '.required()' garante que o campo seja obrigatório.
    id_registro: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'ID do registro deve ser um número',  // Mensagem de erro quando o tipo de dado não é um número.
        'any.required': 'ID do registro é obrigatório'  // Mensagem de erro quando o campo é omitido.
      }),

    // Validação do campo 'tipo_solicitacao' que deve ser uma string com um dos valores válidos ('Correcao' ou 'Justificativa').
    // O campo é obrigatório, e se o valor não for um dos definidos, retorna a mensagem de erro correspondente.
    tipo_solicitacao: Joi.string().valid('Correcao', 'Justificativa').required()
      .messages({
        'any.only': 'Tipo de solicitação inválido',  // Mensagem de erro caso o tipo não seja 'Correcao' nem 'Justificativa'.
        'string.empty': 'Tipo de solicitação é obrigatório'  // Mensagem de erro caso o campo esteja vazio.
      }),

    // Validação do campo 'motivo', que deve ser uma string com no mínimo 10 e no máximo 500 caracteres.
    // O campo também é obrigatório, e se não atender ao tamanho mínimo ou máximo, a mensagem de erro correspondente é retornada.
    motivo: Joi.string().min(10).max(500).required()
      .messages({
        'string.min': 'Motivo deve ter pelo menos 10 caracteres',  // Mensagem de erro para o tamanho mínimo.
        'string.max': 'Motivo não pode exceder 500 caracteres',  // Mensagem de erro para o tamanho máximo.
        'string.empty': 'Motivo é obrigatório'  // Mensagem de erro caso o campo esteja vazio.
      })
  }),

  // Definição de esquema de validação para os filtros do histórico de ponto.
  // Contextualização: Este esquema valida os parâmetros de filtro que podem ser passados para buscar os registros de ponto,
  // como data de início, data de fim e tipo de ponto.
  filtrosHistorico: Joi.object({
    // Validação do campo 'dataInicio', que deve ser uma data válida no formato ISO.
    dataInicio: Joi.date().iso(),

    // Validação do campo 'dataFim', que também deve ser uma data válida no formato ISO.
    // A validação adicional '.greater(Joi.ref('dataInicio'))' assegura que a 'dataFim' seja maior que 'dataInicio'.
    dataFim: Joi.date().iso().greater(Joi.ref('dataInicio'))
      .message('Data final deve ser maior que data inicial'), // Mensagem de erro caso a data final não seja maior que a data inicial.

    // Validação do campo 'tipo', que deve ser uma string com um dos valores válidos ('Entrada', 'Saida', 'Intervalo', 'Retorno').
    tipo: Joi.string().valid('Entrada', 'Saida', 'Intervalo', 'Retorno')
  })
};
