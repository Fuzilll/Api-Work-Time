// Importação dos serviços e bibliotecas necessárias
const AuthService = require('../services/authService'); // Serviço responsável pela lógica de autenticação
const { AppError, UnauthorizedError } = require('../errors'); // Classes de erro customizadas para controle de exceções
const jwt = require('jsonwebtoken'); // Biblioteca para geração e verificação de tokens JWT

/**
 * Controlador de autenticação responsável por lidar com rotas de login, logout, verificação de sessão e recuperação de senha.
 * Ambiente de execução: Node.js (Express), utilizando sessões e JWT para controle de autenticação.
 */
class AuthController {

  /**
   * POST /login
   * Realiza login do usuário com base nas credenciais informadas
   * - Autentica o usuário
   * - Cria uma sessão com informações relevantes
   * - Gera e retorna um token JWT para autenticação futura
   */
  static async login(req, res, next) {
    console.log('[BACKEND] Requisição de login recebida'); // LOG A
    console.log('[BACKEND] Corpo da requisição:', req.body); // LOG B

    try {
      const { email, senha } = req.body;
      console.log('[BACKEND] Credenciais recebidas - Email:', email); // LOG C

      const resultado = await AuthService.login(email, senha, req.session);
      console.log('[BACKEND] Resultado do AuthService:', {
        id: resultado.usuario.id,
        nivel: resultado.usuario.nivel,
        empresa: resultado.usuario.id_empresa
      }); // LOG D

      req.session.id_usuario = resultado.usuario.id;
      req.session.nivel = resultado.usuario.nivel;
      req.session.id_empresa = resultado.usuario.id_empresa;
      console.log('[BACKEND] Sessão configurada:', req.session); // LOG E


      const token = jwt.sign(
        {
          id: resultado.usuario.id,
          nivel: resultado.usuario.nivel,
          id_empresa: resultado.usuario.id_empresa
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );
      console.log('[BACKEND] Token JWT gerado:', token); // LOG F

      console.log('[BACKEND] Enviando resposta para frontend'); // LOG G
      res.json({
        token,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
          nivel: resultado.usuario.nivel,
          id_empresa: resultado.usuario.id_empresa
        }
      });

    } catch (err) {
      console.error('[BACKEND] Erro durante login:', err); // LOG H
      next(err);
    }
  }

/**
 * POST /logout
 * Realiza logout do usuário destruindo a sessão ativa e invalidando o token JWT
 */
static async logout(req, res, next) {
  console.log('[BACKEND] Requisição de logout recebida');

  try {
      const token = req.headers.authorization?.split(' ')[1];
      const userId = req.session.id_usuario || 'N/A';
      
      console.log(`[BACKEND] Iniciando logout para usuário ${userId}`);

      // 1. Destrói a sessão
      await new Promise((resolve, reject) => {
          req.session.destroy(err => {
              if (err) {
                  console.error(`[BACKEND] Erro ao destruir sessão:`, err);
                  reject(new AppError('Falha ao encerrar a sessão', 500));
                  return;
              }
              console.log(`[BACKEND] Sessão destruída com sucesso`);
              resolve();
          });
      });

      // 2. Configurações para limpeza dos cookies
      const cookieOptions = {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          domain: process.env.COOKIE_DOMAIN || undefined
      };

      // 3. Remove todos os cookies relacionados à autenticação
      res.clearCookie('connect.sid', cookieOptions);
      res.clearCookie('token', cookieOptions);
      console.log('[BACKEND] Cookies de autenticação removidos');

      // 4. Resposta de sucesso
      res.json({
          success: true,
          message: 'Logout realizado com sucesso'
      });

  } catch (err) {
      console.error('[BACKEND] Erro durante logout:', err);
      next(err);
  }
}

  /**
   * GET /sessao
   * Verifica se há uma sessão ativa e retorna informações do usuário
   */
  static async verificarSessao(req, res, next) {
    try {
      // Retorna o usuário armazenado na requisição (geralmente populado por middleware de autenticação)
      res.json({
        success: true,
        data: {
          usuario: req.usuario
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /recuperar-senha
   * Inicia o processo de recuperação de senha a partir do email informado
   * - Envia e-mail com instruções para redefinir a senha
   */
  static async solicitarRecuperacaoSenha(req, res, next) {
    try {
      const { email } = req.body;

      // Solicita ao serviço de autenticação o envio do e-mail com instruções
      await AuthService.solicitarRecuperacaoSenha(email);

      res.json({
        success: true,
        message: 'Instruções de recuperação enviadas para seu email'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /resetar-senha
   * Redefine a senha do usuário a partir de um token de recuperação
   */
  static async resetarSenha(req, res, next) {
    try {
      const { token, novaSenha } = req.body;

      // Chama o serviço de autenticação para redefinir a senha
      await AuthService.resetarSenha(token, novaSenha);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (err) {
      next(err);
    }
  }
}

// Exporta o controlador para uso nas rotas
module.exports = AuthController;
