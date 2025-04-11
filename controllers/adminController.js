// Importa o serviço de administração, que contém a lógica de negócio
const AdminService = require('../services/adminService');
// Importa classe de erro customizada para tratamento centralizado de erros
const { AppError } = require('../errors');

// Controlador responsável por gerenciar requisições relacionadas a funcionalidades administrativas
// Ambiente de execução: Node.js com Express.js
class AdminController {

  /**
   * Cadastro de um novo funcionário
   * - Contexto: Apenas administradores da empresa podem cadastrar funcionários
   * - Entradas: dados do funcionário no corpo da requisição, id_empresa do usuário logado
   * - Saída: objeto do funcionário criado
   */
  static async cadastrarFuncionario(req, res, next) {
    try {
      // Chama o serviço para cadastrar, passando o id da empresa e os dados do corpo da requisição
      const funcionario = await AdminService.cadastrarFuncionario(
        req.usuario.id_empresa,
        req.body
      );

      // Retorna sucesso com status 201 (Created)
      res.status(201).json({
        success: true,
        data: funcionario
      });
    } catch (err) {
      // Encaminha erro para middleware de tratamento
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
   * Atualiza o status de um ponto (ex: de pendente para aprovado/rejeitado)
   * - Contexto: validação de ponto por um superior
   * - Segurança: precisa do id do ponto e do usuário autenticado
   */
  static async atualizarStatusPonto(req, res, next) {
    try {
      const resultado = await AdminService.atualizarStatusPonto(
        req.params.id,      // id do ponto
        req.body.status,    // novo status
        req.usuario.id      // quem está alterando
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
   * Carrega todos os pontos que ainda não foram validados
   * - Usado em painéis de aprovação de ponto
   */
  static async carregarPontosPendentes(req, res, next) {
    try {
      const pontos = await AdminService.carregarPontosPendentes(req.usuario.id_empresa);

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
