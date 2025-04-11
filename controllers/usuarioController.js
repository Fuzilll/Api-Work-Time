// Importando as dependências necessárias
const db = require('../config/db'); // Conexão com o banco de dados, configurada externamente
const crypto = require('crypto'); // Módulo de criptografia para lidar com segurança de senhas
const { AppError } = require('../errors'); // Custom Error handler para capturar erros de aplicação
const UsuarioService = require('../services/usuarioService'); // Lógica de negócios de usuário encapsulada em um serviço

// Controlador de usuários que manipula as requisições HTTP e interage com o UsuarioService
class UsuarioController {

  // Método para cadastrar um novo usuário
  static async cadastrarUsuario(req, res, next) {
    try {
      // Recebe os dados do usuário enviados no corpo da requisição (req.body)
      const usuario = await UsuarioService.cadastrarUsuario(req.body);
      
      // Retorna uma resposta de sucesso com os dados do novo usuário
      res.status(201).json({
        success: true,
        data: usuario // Usuário recém-cadastrado é enviado de volta
      });
    } catch (err) {
      // Se ocorrer um erro, passa para o próximo middleware de erro
      next(err);
    }
  }

  // Método para login de usuário
  static async login(req, res, next) {
    try {
      // Desestruturação para obter email e senha da requisição
      const { email, senha } = req.body;
      
      // Chama o serviço de login, que verifica o email e a senha e gerencia a sessão
      const resultado = await UsuarioService.login(email, senha, req.session);
      
      // Retorna os resultados do login com sucesso
      res.json({
        success: true,
        data: resultado // Informações sobre a sessão ou token retornado após o login
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  
  // Método para solicitar a recuperação de senha
  static async solicitarRecuperacaoSenha(req, res, next) {
    try {
      // Recebe o email do corpo da requisição
      const { email } = req.body;
      
      // Chama o serviço que inicia a recuperação de senha
      await UsuarioService.solicitarRecuperacaoSenha(email);
      
      // Envia a resposta confirmando que as instruções foram enviadas
      res.json({
        success: true,
        message: 'Instruções de recuperação enviadas para seu email' // Mensagem de sucesso
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para resetar a senha
  static async resetarSenha(req, res, next) {
    try {
      // Desestruturação para obter o token de recuperação e a nova senha
      const { token, novaSenha } = req.body;
      
      // Chama o serviço para resetar a senha com o token e a nova senha fornecida
      await UsuarioService.resetarSenha(token, novaSenha);
      
      // Retorna resposta confirmando que a senha foi alterada com sucesso
      res.json({
        success: true,
        message: 'Senha alterada com sucesso' // Mensagem de sucesso
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para obter as informações de perfil de um usuário
  static async obterPerfil(req, res, next) {
    try {
      // Chama o serviço que retorna as informações do perfil do usuário com base no ID do usuário (req.usuario.id)
      const perfil = await UsuarioService.obterPerfil(req.usuario.id);
      
      // Retorna os dados do perfil do usuário
      res.json({
        success: true,
        data: perfil // Informações do perfil do usuário
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para atualizar o perfil de um usuário
  static async atualizarPerfil(req, res, next) {
    try {
      // Chama o serviço para atualizar as informações de perfil com os dados fornecidos
      const perfil = await UsuarioService.atualizarPerfil(req.usuario.id, req.body);
      
      // Retorna os dados do perfil atualizado
      res.json({
        success: true,
        data: perfil, // Perfil atualizado retornado para o cliente
        message: 'Perfil atualizado com sucesso' // Mensagem de sucesso
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para alterar a senha do usuário
  static async alterarSenha(req, res, next) {
    try {
      // Desestruturação para obter a senha atual e a nova senha do corpo da requisição
      const { senhaAtual, novaSenha } = req.body;
      
      // Chama o serviço para alterar a senha do usuário
      await UsuarioService.alterarSenha(req.usuario.id, senhaAtual, novaSenha);
      
      // Retorna uma mensagem de sucesso após a alteração da senha
      res.json({
        success: true,
        message: 'Senha alterada com sucesso' // Mensagem de sucesso
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para listar todos os usuários
  static async listarUsuarios(req, res, next) {
    try {
      // Chama o serviço que retorna todos os usuários registrados no sistema
      const usuarios = await UsuarioService.listarUsuarios();
      
      // Retorna a lista de usuários
      res.json({
        success: true,
        data: usuarios // Lista de usuários retornada para o cliente
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }

  // Método para alterar o status de um usuário (ativo/inativo)
  static async alterarStatusUsuario(req, res, next) {
    try {
      // Obtém o ID do usuário da URL e o novo status (ativo/inativo) do corpo da requisição
      const { id } = req.params;
      const { status } = req.body;
      
      // Chama o serviço que altera o status do usuário
      await UsuarioService.alterarStatusUsuario(id, status);
      
      // Retorna uma mensagem de sucesso com o novo status do usuário
      res.json({
        success: true,
        message: `Status do usuário alterado para ${status}` // Status alterado com sucesso
      });
    } catch (err) {
      next(err); // Propaga erro para o middleware de erro
    }
  }
}

// Exporta o controlador para ser utilizado em outras partes da aplicação
module.exports = UsuarioController;
