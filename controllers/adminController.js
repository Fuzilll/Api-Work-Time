// Importa o serviço de administração, que contém a lógica de negócio
const AdminService = require('../services/adminService');
// Importa classe de erro customizada para tratamento centralizado de erros
const { AppError } = require('../errors');

// Controlador responsável por gerenciar requisições relacionadas a funcionalidades administrativas
// Ambiente de execução: Node.js com Express.js
class AdminController {

  /**
   * @api {post} /funcionarios Cadastrar Funcionário
   * @apiName CadastrarFuncionario
   * @apiGroup Admin
   * 
   * @apiBody {String} nome Nome completo
   * @apiBody {String} email E-mail válido
   * @apiBody {String} senha Mínimo 8 caracteres
   * @apiBody {String} cpf 11 dígitos
   * @apiBody {String} registro_emp Registro na empresa
   * @apiBody {String} funcao Função exercida
   * @apiBody {Date} data_admissao Data de admissão
   * @apiBody {String} departamento Departamento
   * @apiBody {Number} salario_base Salário base
   * @apiBody {String} tipo_contrato CLT/PJ/Estagiario/Temporario
   */
  static async cadastrarFuncionario(req, res, next) {
    try {
      // Verificar se o usuário tem permissão (ADMIN ou IT_SUPPORT)
      if (!['ADMIN', 'IT_SUPPORT'].includes(req.usuario.nivel)) {
        throw new AppError('Acesso não autorizado', 403);
      }

      // Verificar campos obrigatórios
      const camposObrigatorios = ['nome', 'email', 'senha', 'cpf', 'registro_emp',
        'funcao', 'data_admissao', 'tipo_contrato'];

      const faltantes = camposObrigatorios.filter(campo => !req.body[campo]);

      if (faltantes.length > 0) {
        throw new AppError(`Campos obrigatórios faltando: ${faltantes.join(', ')}`, 400);
      }

      // Converter valores numéricos
      if (req.body.salario_base) {
        req.body.salario_base = parseFloat(req.body.salario_base);
      }

      const funcionario = await AdminService.cadastrarFuncionario(
        req.usuario.id_empresa,
        {
          ...req.body,
          horarios: req.body.horarios // Inclui os horários no cadastro
        }
      );

      res.status(201).json({
        success: true,
        data: funcionario,
        id: funcionario.id_funcionario
      });
    } catch (err) {
      next(err);
    }
  }

  /**
 * @api {post} /funcionarios/:id/horarios Cadastrar Horários
 * @apiName CadastrarHorarios
 * @apiGroup Admin
 * 
 * @apiParam {Number} id ID do funcionário
 * @apiBody {Array} horarios Array de objetos de horário
 */
  static async cadastrarHorariosFuncionario(req, res, next) {
    try {
      if (!req.body.horarios || !Array.isArray(req.body.horarios)) {
        throw new AppError('Horários não fornecidos ou formato inválido', 400);
      }

      // Verificação mais robusta
      if (!req.params.id || isNaN(req.params.id)) {
        throw new AppError('ID do funcionário inválido', 400);
      }

      // Converter para número
      const idFuncionario = parseInt(req.params.id);

      // Verificar existência
      await AdminService.verificarFuncionarioExistente(idFuncionario);

      // Cadastrar horários
      const resultado = await AdminService.cadastrarHorarios(
        idFuncionario,
        req.body.horarios
      );

      res.status(201).json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * Retorna um resumo dos funcionários cadastrados
   * - Objetivo: fornecer visão agregada para o painel do admin
   */
  static async resumoFuncionarios(req, res, next) {
    try {
      // Chama o serviço que monta o resumo baseado no id da empresa
      const resumo = await AdminService.resumoFuncionarios(req.usuario.id_empresa);

      res.json({
        success: true,
        data: resumo
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gera um relatório detalhado de pontos dos funcionários
   * - Utilizado para análises mais profundas ou exportação de dados
   * - query string usada para filtros (ex: período, status, etc.)
   */
  static async relatorioPontos(req, res, next) {
    try {
      const relatorio = await AdminService.relatorioPontos(
        req.usuario.id_empresa,
        req.query // filtros de busca
      );

      res.json({
        success: true,
        data: relatorio
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Busca registros de ponto de funcionários com base em filtros
   * - Similar ao relatório, mas com retorno menos complexo
   * - Útil para interfaces que listam os pontos
   */
  static async buscarPontos(req, res, next) {
    try {
      const pontos = await AdminService.buscarPontos(
        req.usuario.id_empresa,
        req.query
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }

  /**
  * @api {get} /api/admin/pontos/analise Listar Pontos para Análise
  * @apiName CarregarPontosParaAnalise
  * @apiGroup Admin
  * 
  * @apiDescription Retorna pontos com possíveis irregularidades para análise manual
  */
  static async carregarPontosParaAnalise(req, res, next) {
    try {
      const pontos = await AdminService.carregarPontosParaAnalise(
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }


  /**
    * @api {put} /api/admin/pontos/:id/status Aprovar/Rejeitar Ponto
    * @apiName AtualizarStatusPonto
    * @apiGroup Admin
    * 
    * @apiParam {Number} id ID do registro de ponto
    * @apiBody {String="Aprovado","Rejeitado"} status Novo status do ponto
    * @apiBody {String} [justificativa] Justificativa para rejeição
    */
  static async atualizarStatusPonto(req, res, next) {
    try {
      // Verifica se o usuário tem permissão (middleware já validou)
      if (!req.usuario.permissoes?.aprovar_pontos && req.usuario.nivel !== 'ADMIN') {
        throw new AppError('Você não tem permissão para aprovar/rejeitar pontos', 403);
      }
  
      const resultado = await AdminService.atualizarStatusPonto(
        req.params.id,              // ID do ponto
        req.body.status,            // 'Aprovado' ou 'Rejeitado'
        req.usuario.id,             // ID do usuário autenticado (aprovador)
        req.body.justificativa      // Justificativa (opcional)
      );
  
      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * @api {get} /api/admin/pontos/pendentes Listar Pontos Pendentes
   * @apiName CarregarPontosPendentes
   * @apiGroup Admin
   * 
   * @apiQuery {String} [dataInicio] Data de início para filtro (YYYY-MM-DD)
   * @apiQuery {String} [dataFim] Data de fim para filtro (YYYY-MM-DD)
   * @apiQuery {String} [departamento] Filtro por departamento
   */
  static async carregarPontosPendentes(req, res, next) {
    try {
      const pontos = await AdminService.carregarPontosPendentes(
        req.usuario.id_empresa,
        {
          dataInicio: req.query.date_start,
          dataFim: req.query.date_end,
          departamento: req.query.department,
          status: req.query.status,
          nome: req.query.nome
        }
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }



  /**
   * Desativa um funcionário (sem excluir do banco)
   * - Ideal quando o funcionário sai da empresa mas precisa manter o histórico
   */
  static async desativarFuncionario(req, res, next) {
    try {
      const resultado = await AdminService.desativarFuncionario(
        req.params.id,
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @api {get} /api/admin/pontos/:id/detalhes Obter Detalhes do Ponto
   * @apiName ObterDetalhesPonto
   * @apiGroup Admin
   * 
   * @apiParam {Number} id ID do registro de ponto
   * 
   * @apiSuccess {Object} data Detalhes completos do ponto
   */
  static async obterDetalhesPonto(req, res, next) {
    try {
      console.log(`[AdminController] Buscando detalhes do ponto ID: ${req.params.id}`);

      const detalhes = await AdminService.obterDetalhesPonto(
        req.params.id,
        req.usuario.id_empresa
      );

      if (!detalhes) {
        console.log(`[AdminController] Ponto não encontrado: ${req.params.id}`);
        throw new AppError('Ponto não encontrado', 404);
      }

      console.log(`[AdminController] Detalhes encontrados para o ponto: ${req.params.id}`);
      res.json({
        success: true,
        data: detalhes
      });
    } catch (err) {
      console.error(`[AdminController] Erro ao buscar detalhes do ponto: ${err.message}`);
      next(err);
    }
  }

  /**
   * Exclui um funcionário definitivamente
   * - Usar com cautela. Verificar se há dados dependentes antes
   */
  static async excluirFuncionario(req, res, next) {
    try {
      const resultado = await AdminService.excluirFuncionario(
        req.params.id,
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
}

// Exporta a classe para uso nas rotas (ex: admin.routes.js)
module.exports = AdminController;
