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
    // Nome deve ter no mínimo 3 e no máximo 100 caracteres
    nome: Joi.string().min(3).max(100).required(),

    // E-mail deve ser válido e é obrigatório
    email: Joi.string().email().required(),

    // Senha com no mínimo 8 caracteres, exigido por segurança
    senha: Joi.string().min(8).required(),

    // CPF deve conter 11 dígitos numéricos (sem máscara), obrigatório
    cpf: Joi.string().length(11).pattern(/^\d+$/).required(),

    // Registro interno da empresa (ex: matrícula), obrigatório
    registro_emp: Joi.string().required(),

    // Função do colaborador (ex: Analista, Técnico), obrigatório
    funcao: Joi.string().required(),

    // Data de admissão deve ser uma data válida
    data_admissao: Joi.date().required(),

    // Departamento pode ser nulo ou string vazia (não obrigatório)
    departamento: Joi.string().allow(null, ''),

    // Salário pode ser omitido, mas se informado, deve ser número positivo
    salario_base: Joi.number().positive().allow(null),

    // Tipo de contrato com valores pré-definidos e 'CLT' como valor padrão
    tipo_contrato: Joi.string().valid('CLT', 'PJ', 'Estagiario', 'Temporario').default('CLT')
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
