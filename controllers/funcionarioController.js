const FuncionarioService = require('../services/funcionarioService');
const { AppError } = require('../errors');
const { validate } = require('../middlewares/validators');
const funcionarioSchema = require('../validators/funcionarioSchema');
const db = require('../config/db');

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
        {
          tipo: req.body.tipo,
          foto: req.file?.buffer, // Recebe o buffer da imagem
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          precisao_geolocalizacao: req.body.precisao_geolocalizacao,
          dispositivo: req.body.dispositivo
        }
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
   * @api {post} /funcionario/solicitar-alteracao-ponto Solicitar Alteração de Ponto
   * @apiName SolicitarAlteracaoPonto
   * @apiGroup Funcionario
   * 
   * @apiBody {Number} id_registro ID do registro de ponto
   * @apiBody {String} motivo Motivo da alteração
   * @apiBody {String} [novo_tipo] Novo tipo de ponto (opcional)
   * @apiBody {String} [nova_data_hora] Nova data/hora (opcional)
   */
  static async solicitarAlteracaoPonto(req, res, next) {
    try {
      // Validação básica
      if (!req.body.id_registro || !req.body.motivo) {
        throw new AppError('ID do registro e motivo são obrigatórios', 400);
      }

      // Verifica se o usuário é funcionário
      if (req.usuario.nivel !== 'FUNCIONARIO') {
        throw new AppError('Apenas funcionários podem solicitar alterações', 403);
      }

      // Processa a solicitação
      const resultado = await FuncionarioService.solicitarAlteracaoPonto(
        req.usuario.id,
        req.body.id_registro,
        req.body.motivo,
        req.body.novo_tipo,
        req.body.nova_data_hora
      );

      res.status(201).json({
        success: true,
        data: resultado
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @api {get} /funcionario/solicitacoes-alteracao Listar Solicitações de Alteração
   * @apiName ListarSolicitacoesAlteracao
   * @apiGroup Funcionario
   */
  static async listarSolicitacoesAlteracao(req, res, next) {
    try {
      const solicitacoes = await FuncionarioService.listarSolicitacoesAlteracao(
        req.usuario.id
      );

      res.json({
        success: true,
        data: solicitacoes
      });
    } catch (error) {
      next(error);
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

  
  static async listarPontosAndroid(req, res, next) {
    try {
      // Obtém os parâmetros de data e idUsuario da query
      const { dataInicio, dataFim, idUsuario } = req.query;
  
      if (!idUsuario) {
        throw new AppError('Parâmetro idUsuario é obrigatório.', 400);
      }
  
      if (!dataInicio || !dataFim) {
        throw new AppError('Parâmetros dataInicio e dataFim são obrigatórios.', 400);
      }
  
      const registros = await FuncionarioService.buscarPontosParaAndroid(idUsuario, dataInicio, dataFim);
  
      return res.json(registros);
  
    } catch (err) {
      next(err);
    }
  }
  

}

module.exports = FuncionarioController;