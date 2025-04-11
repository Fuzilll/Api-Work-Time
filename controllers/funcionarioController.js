// Importação do serviço 'FuncionarioService' que contém as lógicas de negócios
// e da classe 'AppError' para tratamento de erros personalizados.
const FuncionarioService = require('../services/funcionarioService'); 
const { AppError } = require('../errors');

// A classe 'FuncionarioController' é responsável por gerenciar as requisições relacionadas
// aos funcionários, manipulando as interações com os serviços e retornando as respostas
// apropriadas para o cliente.
class FuncionarioController {
  
  // Método assíncrono para obter o perfil do funcionário
  // Contextualização: Este método vai pegar o 'id' do funcionário da requisição e
  // buscar as informações do perfil por meio do 'FuncionarioService'.
  static async obterPerfil(req, res, next) {
    try {
      // O 'id' do usuário é extraído do objeto 'usuario' na requisição (req.usuario)
      const perfil = await FuncionarioService.obterPerfil(req.usuario.id);
      
      // Resposta de sucesso, enviando o perfil obtido.
      res.json({
        success: true,
        data: perfil
      });
    } catch (err) {
      // Caso ocorra algum erro, passamos o erro para o próximo middleware (erro).
      next(err);
    }
  }

  // Método assíncrono para listar o histórico de pontos do funcionário
  // Contextualização: Este método usa o 'id' do funcionário e os filtros fornecidos na query 
  // para retornar o histórico de pontos por meio do serviço.
  static async listarHistoricoPontos(req, res, next) {
    try {
      // Aqui, 'req.query' está sendo usado para passar filtros adicionais para a busca do histórico.
      const historico = await FuncionarioService.listarHistoricoPontos(
        req.usuario.id, // 'id' do funcionário da requisição
        req.query // Filtros adicionais que podem ser passados na URL
      );
      
      // Resposta de sucesso, retornando o histórico de pontos do funcionário.
      res.json({
        success: true,
        data: historico
      });
    } catch (err) {
      // Caso ocorra algum erro, passamos o erro para o próximo middleware (erro).
      next(err);
    }
  }

  // Método assíncrono para solicitar alteração de ponto
  // Contextualização: Esse método recebe dados no corpo da requisição e usa
  // o serviço para solicitar alteração no ponto do funcionário.
  static async solicitarAlteracaoPonto(req, res, next) {
    try {
      // 'req.body' contém as informações sobre a solicitação de alteração de ponto
      const resultado = await FuncionarioService.solicitarAlteracaoPonto(
        req.usuario.id, // 'id' do funcionário da requisição
        req.body // Dados do corpo da requisição que especificam a solicitação de alteração
      );
      
      // Retorna um status 201 de sucesso com o resultado da solicitação de alteração.
      res.status(201).json({
        success: true,
        data: resultado
      });
    } catch (err) {
      // Caso ocorra algum erro, passamos o erro para o próximo middleware (erro).
      next(err);
    }
  }

  // Método assíncrono para listar todas as solicitações do funcionário
  // Contextualização: Este método retorna todas as solicitações feitas por um funcionário
  // por meio do 'FuncionarioService'.
  static async listarSolicitacoes(req, res, next) {
    try {
      // Busca todas as solicitações feitas pelo funcionário com o 'id' da requisição.
      const solicitacoes = await FuncionarioService.listarSolicitacoes(
        req.usuario.id
 
      );
      
      // Resposta de sucesso, retornando a lista de solicitações.
      res.json({
        success: true,
        data: solicitacoes
      });
    } catch (err) {
      // Caso ocorra algum erro, passamos o erro para o próximo middleware (erro).
      next(err);
    }
  }
}

// Exporte a classe para que seja utilizada em outras partes da aplicação
module.exports = FuncionarioController;
