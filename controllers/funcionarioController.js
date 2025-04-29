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
   * Solicita alteração em um registro de ponto
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  static async solicitarAlteracaoPonto(req, res, next) {
    try {
        console.log('[CONTROLLER] Iniciando solicitação de alteração:', {
            usuarioId: req.usuario.id,
            body: req.body
        });

        // Validações básicas
        if (!req.body.id_registro || !req.body.motivo) {
            throw new AppError('ID do registro e motivo são obrigatórios', 400);
        }

        if (req.usuario.nivel !== 'FUNCIONARIO') {
            throw new AppError('Apenas funcionários podem solicitar alterações', 403);
        }

        // Converter ID do registro
        const idRegistroPonto = parseInt(req.body.id_registro);
        if (isNaN(idRegistroPonto)) {
            throw new AppError('ID do registro deve ser um número válido', 400);
        }

        // Obter funcionário com tratamento robusto
        console.log('[CONTROLLER] Chamando serviço para obter funcionário...');
        const funcionario = await FuncionarioService.obterFuncionarioPorUsuario(req.usuario.id);
        
        console.log('[CONTROLLER] Funcionário recebido do serviço:', JSON.stringify(funcionario, null, 2));
        
        if (!funcionario) {
            console.error('[CONTROLLER] Erro crítico: serviço retornou null/undefined');
            throw new AppError('Erro inesperado ao obter dados do funcionário', 500);
        }

        // Processar solicitação
        console.log('[CONTROLLER] Chamando serviço para solicitar alteração...');
        const resultado = await FuncionarioService.solicitarAlteracaoPonto(
            funcionario.id,
            idRegistroPonto,
            req.body.motivo,
            req.body.novo_tipo || null,
            req.body.nova_data_hora || null
        );

        console.log('[CONTROLLER] Solicitação processada com sucesso:', resultado);

        return res.status(201).json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('[CONTROLLER] Erro completo:', {
            message: error.message,
            stack: error.stack,
            usuario: req.usuario,
            body: req.body
        });
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
}

module.exports = FuncionarioController;