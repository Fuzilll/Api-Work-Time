// Importa o serviço de registros, onde a lógica de negócios de criação e recuperação de registros é executada
const RegistroService = require('../services/registroService');
// Importa o erro personalizado que será utilizado para capturar exceções específicas
const { AppError } = require('../errors');

class RegistroController {
  // Método para cadastrar um novo registro
  // Recebe a requisição (req), a resposta (res), e o próximo middleware (next)
  static async cadastrarRegistro(req, res, next) {
    try {
      // Chama o serviço de registro para cadastrar o novo registro, passando os dados do corpo da requisição
      const registro = await RegistroService.cadastrarRegistro(req.body);

      // Se o cadastro for bem-sucedido, retorna a resposta com status 201 e os dados do registro
      res.status(201).json({
        success: true,  // Indica que a operação foi bem-sucedida
        data: registro  // Retorna o registro cadastrado
      });
    } catch (err) {
      // Em caso de erro, passa o erro para o próximo middleware de tratamento de erros
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
