// Importa o serviço de registros, onde a lógica de negócios de criação e recuperação de registros é executada
const RegistroService = require('../services/registroService');
// Importa o erro personalizado que será utilizado para capturar exceções específicas
const { AppError } = require('../errors');

class RegistroController {
  // Método para cadastrar um novo registro
  static async cadastrarRegistro(req, res, next) {
    try {
      // Extrai os dados do corpo da requisição
      const dadosRegistro = {
        id_funcionario: req.body.id_funcionario,
        tipo: req.body.tipo,
        foto_url: req.body.foto_url, 
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        dispositivo: req.body.dispositivo
      };
      console.log('[Controller]dadosRegistro',dadosRegistro)
      // Validações básicas
      if (!dadosRegistro.id_funcionario || !dadosRegistro.tipo) {
        throw new AppError('ID do funcionário e tipo de registro são obrigatórios', 400);
      }

      const registro = await RegistroService.cadastrarRegistro(dadosRegistro);

      res.status(201).json({
        success: true,
        data: registro
      });
    } catch (err) {
      next(err);
    }
  }
  // Método para buscar os registros de um funcionário específico
  // A identificação do funcionário é passada via parâmetro da URL
  static async buscarRegistrosFuncionario(req, res, next) {
    try {
      // Chama o serviço de registro para buscar os registros do funcionário com base no id fornecido
      const registros = await RegistroService.buscarRegistrosFuncionario(
        req.params.id_funcionario // Pega o id do funcionário da URL
      );

      // Retorna os registros encontrados
      res.json({
        success: true,  // Indica que a operação foi bem-sucedida
        data: registros  // Retorna a lista de registros encontrados
      });
    } catch (err) {
      // Em caso de erro, passa o erro para o próximo middleware de tratamento de erros
      next(err);
    }
  }

  // Método para buscar os registros de todos os funcionários de uma empresa
  // A identificação da empresa é extraída do objeto do usuário (req.usuario) e os parâmetros de consulta são passados como query string
  static async buscarRegistrosEmpresa(req, res, next) {
    try {
      // Chama o serviço de registro para buscar os registros com base no id da empresa e nos parâmetros de consulta fornecidos
      const registros = await RegistroService.buscarRegistrosEmpresa(
        req.usuario.id_empresa,  // Pega o id da empresa do usuário autenticado
        req.query               // Pega os parâmetros de consulta da URL
      );

      // Retorna os registros encontrados
      res.json({
        success: true,  // Indica que a operação foi bem-sucedida
        data: registros  // Retorna a lista de registros encontrados
      });
    } catch (err) {
      // Em caso de erro, passa o erro para o próximo middleware de tratamento de erros
      next(err);
    }
  }

  // Método para buscar todos os registros de acordo com os parâmetros fornecidos na query string
  static async buscarTodosRegistros(req, res, next) {
    try {
      // Chama o serviço de registro para buscar todos os registros com base nos parâmetros de consulta fornecidos
      const registros = await RegistroService.buscarTodosRegistros(
        req.query // Pega os parâmetros de consulta da URL
      );

   
      // Retorna os registros encontrados
      res.json({
        success: true,  // Indica que a operação foi bem-sucedida
        data: registros  // Retorna a lista de registros encontrados
      });
    } catch (err) {
      // Em caso de erro, passa o erro para o próximo middleware de tratamento de erros
      next(err);
    }
  }
}

// Exporta o controlador para que ele possa ser usado em outras partes da aplicação
module.exports = RegistroController;
