// Importação dos módulos necessários
const EmpresaService = require('../services/empresaService'); // Importa o serviço de empresa para manipular as operações no banco de dados.
const { AppError } = require('../errors'); // Importa o modelo de erro personalizado para tratar exceções.

class EmpresaController {
  // Método estático para cadastrar uma nova empresa
  static async cadastrarEmpresa(req, res, next) {
    try {
      // Chama o serviço para cadastrar a empresa, passando os dados do corpo da requisição (req.body)
      const empresa = await EmpresaService.cadastrarEmpresa(req.body); 
      
      // Retorna uma resposta com status 201 (Criado), contendo os dados da empresa cadastrada
      res.status(201).json({
        success: true, // Indica que a operação foi bem-sucedida
        data: empresa   // Retorna os dados da empresa cadastrada
      });
    } catch (err) {
      // Caso ocorra um erro, passa o erro para o próximo middleware de tratamento (next)
      next(err);
    }
  }

  // Método estático para listar todas as empresas
  static async listarEmpresas(req, res, next) {
    try {
      // Chama o serviço para listar todas as empresas cadastradas
      const empresas = await EmpresaService.listarEmpresas();
      
      // Retorna uma resposta com status 200 (OK), contendo a lista de empresas
      res.json({
        success: true, // Indica que a operação foi bem-sucedida
        data: empresas // Retorna a lista de empresas
      });
    } catch (err) {
      // Caso ocorra um erro, passa o erro para o próximo middleware de tratamento (next)
      next(err);
    }
  }

  // Método estático para remover uma empresa com base no ID
  static async removerEmpresa(req, res, next) {
    try {
      // Desestrutura o parâmetro id da requisição
      const { id } = req.params;
      
      // Chama o serviço para remover a empresa, passando o ID
      const resultado = await EmpresaService.removerEmpresa(id);
      
      // Retorna uma resposta com status 200 (OK), indicando que a empresa foi removida
      res.json({
        success: true, // Indica que a operação foi bem-sucedida
        data: resultado // Retorna o resultado da remoção (geralmente um objeto com o status da operação)
      });
    } catch (err) {
      // Caso ocorra um erro, passa o erro para o próximo middleware de tratamento (next)
      next(err);
    }
  }

  // Método estático para alternar o status de uma empresa (ex.: ativo/inativo)
  static async alternarStatus(req, res, next) {
    try {
      // Desestrutura o parâmetro id da requisição
      const { id } = req.params;
      
      // Chama o serviço para alternar o status da empresa, passando o ID
      const resultado = await EmpresaService.alternarStatus(id);
      
      // Retorna uma resposta com status 200 (OK), indicando que o status foi alterado
      res.json({
        success: true, // Indica que a operação foi bem-sucedida
        data: resultado // Retorna o resultado da alteração de status
      });
    } catch (err) {
      // Caso ocorra um erro, passa o erro para o próximo middleware de tratamento (next)
      next(err);
    }
  }

  
  // Método estático para obter os dados de uma empresa específica com base no ID
  static async obterEmpresa(req, res, next) {
    try {
      // Desestrutura o parâmetro id da requisição
      const { id } = req.params;
      
      // Chama o serviço para obter os dados da empresa, passando o ID
      const empresa = await EmpresaService.obterEmpresa(id);
      
      // Retorna uma resposta com status 200 (OK), contendo os dados da empresa
      res.json({
        success: true, // Indica que a operação foi bem-sucedida
        data: empresa  // Retorna os dados da empresa obtida
      });
    } catch (err) {
      // Caso ocorra um erro, passa o erro para o próximo middleware de tratamento (next)
      next(err);
    }
  }

  static async cadastrarAdmin(req, res, next) {
    try {
      const { nome, email, senha, id_empresa, cpf } = req.body;
      
      if (!nome || !email || !senha || !id_empresa || !cpf) {
        throw new AppError('Todos os campos são obrigatórios', 400);
      }

      const adminData = {
        nome,
        email,
        senha,
        cpf,
        id_empresa
      };

      const admin = await EmpresaService.cadastrarAdmin(adminData);
      
      res.status(201).json({
        success: true,
        data: admin,
        message: 'Administrador cadastrado com sucesso'
      });
    } catch (err) {
      next(err);
    }
  }

}

// Exporta o controlador para ser utilizado em outras partes da aplicação
module.exports = EmpresaController;
