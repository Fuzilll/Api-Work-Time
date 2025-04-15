const EstadoService = require('../services/estadoService');
const { AppError } = require('../errors');

class EstadosController {
  static async listarEstados(req, res, next) {
    try {
      const estados = await EstadoService.listarEstados();
      
      // Envia os estados para o frontend com um formato adequado
      res.json({
        success: true,
        data: estados.map(estado => ({
          id: estado.id,
          sigla: estado.sigla,
          nome: estado.nome
        })),
        message: 'Estados listados com sucesso'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = EstadosController;
