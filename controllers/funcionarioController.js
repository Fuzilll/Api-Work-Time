const FuncionarioService = require('../services/funcionarioService');
const { AppError } = require('../errors');
const { validate } = require('../middlewares/validators');
const funcionarioSchema = require('../validators/funcionarioSchema');

class FuncionarioController {
  /**
   * @api {get} /funcionario/dashboard Carregar Dashboard
   * @apiName CarregarDashboard
   * @apiGroup Funcionario
   */
  static async carregarDashboard(req, res, next) {
    try {
      const dashboard = await FuncionarioService.carregarDashboard(req.usuario.id);

      console.log('[DASHBOARD] Enviando dados:', {
        resumo: dashboard.resumo,
        pontosHoje: dashboard.pontosHoje,
        ultimosPontos: dashboard.ultimosPontos
      });


      res.json({
        success: true,
        data: dashboard
      });
    } catch (err) {
      next(err);
    }
  }


  /**
   * @api {post} /funcionario/pontos Registrar Ponto
   * @apiName RegistrarPonto
   * @apiGroup Funcionario
   * 
   * @apiBody {String} tipo Tipo de registro (Entrada/Saida)
   * @apiBody {Number} latitude Latitude da localização
   * @apiBody {Number} longitude Longitude da localização
   */
  static async registrarPonto(req, res, next) {
    try {
      const ponto = await FuncionarioService.registrarPonto(
        req.usuario.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: ponto
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @api {get} /funcionario/pontos Listar Pontos
   * @apiName ListarPontos 
   * @apiGroup Funcionario
   * 
   * @apiQuery {String} [dataInicio] Data de início (YYYY-MM-DD)
   * @apiQuery {String} [dataFim] Data de fim (YYYY-MM-DD)
   */
  static async listarPontos(req, res, next) {
    try {
      const pontos = await FuncionarioService.listarPontos(
        req.usuario.id,
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
 * @api {get} /funcionario/historico-pontos Listar Histórico de Pontos
 * @apiName ListarHistoricoPontos
 * @apiGroup Funcionario
 * 
 * @apiQuery {String} [dataInicio] Data de início (YYYY-MM-DD)
 * @apiQuery {String} [dataFim] Data de fim (YYYY-MM-DD)
 */
static async listarHistoricoPontos(req, res, next) {
  try {
      const pontos = await FuncionarioService.listarHistoricoPontos(
          req.usuario.id,
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
 * @api {post} /funcionario/pedir-alteracao-ponto Solicitar Alteração de Ponto
 * @apiName SolicitarAlteracaoPonto
 * @apiGroup Funcionario
 * 
 * @apiBody {Number} id_registro ID do registro a ser alterado
 * @apiBody {String} novo_horario Novo horário no formato YYYY-MM-DD HH:MM:SS
 * @apiBody {String} motivo Motivo da alteração
 */
static async solicitarAlteracaoPonto(req, res, next) {
  try {
      const { id_registro, novo_horario, motivo } = req.body;

      if (!id_registro || !novo_horario || !motivo) {
          throw new AppError('Todos os campos são obrigatórios', 400);
      }

      const solicitacao = await FuncionarioService.solicitarAlteracaoPonto(
          req.usuario.id,
          id_registro,
          novo_horario,
          motivo
      );

      res.json({
          success: true,
          data: solicitacao,
          message: 'Solicitação de alteração registrada com sucesso'
      });
  } catch (err) {
      next(err);
  }
}

  /**
   * @api {get} /funcionario/pontos/:id Detalhes do Ponto
   * @apiName DetalhesPonto
   * @apiGroup Funcionario
   */
  static async detalhesPonto(req, res, next) {
    try {
      const ponto = await FuncionarioService.detalhesPonto(
        req.params.id,
        req.usuario.id
      );

      res.json({
        success: true,
        data: ponto
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @api {get} /funcionario/horarios Listar Horários
   * @apiName ListarHorarios
   * @apiGroup Funcionario
   */
  static async listarHorarios(req, res, next) {
    try {
      const horarios = await FuncionarioService.listarHorarios(req.usuario.id);

      res.json({
        success: true,
        data: horarios
      });
    } catch (err) {
      next(err);
    }
  }

  static async carregarPerfil(req, res, next) {
    try {
      const perfil = await FuncionarioService.carregarPerfil(req.usuario.id);

      res.json({
        success: true,
        data: perfil
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FuncionarioController;