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
    const transaction = await db.beginTransaction();
    try {
        console.log('[PontoController] Iniciando solicitação de alteração', {
            usuario: req.usuario.id,
            body: req.body
        });

        // Validação robusta dos dados de entrada
        const { id_registro, motivo, novo_tipo, nova_data_hora } = req.body;
        
        if (!id_registro || !motivo) {
            throw new AppError('Campos obrigatórios não informados: id_registro e motivo são necessários', 400);
        }

        if (req.usuario.nivel !== 'FUNCIONARIO') {
            throw new AppError('Apenas funcionários podem solicitar alterações de ponto', 403);
        }

        // Converter e validar ID
        const idRegistroPonto = parseInt(id_registro);
        if (isNaN(idRegistroPonto)) {
            throw new AppError('ID do registro deve ser um número válido', 400);
        }

        // Validar motivo (tamanho mínimo e máximo)
        if (motivo.length < 10 || motivo.length > 500) {
            throw new AppError('O motivo deve ter entre 10 e 500 caracteres', 400);
        }

        // Validar data/hora se fornecida
        let dataHoraValidada = null;
        if (nova_data_hora) {
            dataHoraValidada = new Date(nova_data_hora);
            if (isNaN(dataHoraValidada.getTime())) {
                throw new AppError('Formato de data/hora inválido', 400);
            }
        }

        // Obter funcionário com verificação de existência
        const funcionario = await FuncionarioService.obterFuncionarioPorUsuario(req.usuario.id, transaction);
        if (!funcionario) {
            throw new AppError('Funcionário não encontrado', 404);
        }

        // Processar solicitação
        const resultado = await FuncionarioService.solicitarAlteracaoPonto(
            funcionario.id,
            idRegistroPonto,
            motivo,
            novo_tipo || null,
            dataHoraValidada || null,
            transaction
        );

        await db.commitTransaction(transaction);

        console.log('[PontoController] Solicitação processada com sucesso', {
            solicitacaoId: resultado.id
        });

        return res.status(201).json({
            success: true,
            message: 'Solicitação de alteração registrada com sucesso',
            data: resultado
        });

    } catch (error) {
        await db.rollbackTransaction(transaction);
        console.error('[PontoController] Erro na solicitação:', {
            error: error.message,
            stack: error.stack,
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