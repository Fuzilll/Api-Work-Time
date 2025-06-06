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
    console.log('[BACKEND] Requisição de login recebida');
    console.log('[BACKEND] Corpo da requisição:', req.body);

    try {
      const { email, senha } = req.body;
      console.log('[BACKEND] Credenciais recebidas - Email:', email);

      const resultado = await AuthService.login(email, senha, req.session);
      const { usuario, token } = resultado;

      req.session.id_usuario = usuario.id;
      req.session.nivel = usuario.nivel;

      if (usuario.id_empresa) {
        req.session.id_empresa = usuario.id_empresa;
      }

      console.log('[BACKEND] Sessão configurada:', req.session);

      const jwtPayload = {
        id: usuario.id,
        nivel: usuario.nivel,
        ...(usuario.id_empresa && { id_empresa: usuario.id_empresa })
      };

      const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      });

      console.log('[BACKEND] Token JWT gerado:', jwtToken);
      console.log('[BACKEND] Enviando resposta para frontend');

      res.json({
        token: jwtToken,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          nivel: usuario.nivel,
          id_empresa: usuario.id_empresa
        }
      });

    } catch (err) {
      console.error('[BACKEND] Erro durante login:', err);
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
      // 1. Destrói a sessão
      await new Promise((resolve, reject) => {
        req.session.destroy(err => {
          if (err) {
            console.error(`[BACKEND] Erro ao destruir sessão:`, err);
            reject(new AppError('Falha ao encerrar a sessão', 500));
            return;
          }

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

          console.log('[BACKEND] Logout realizado com sucesso');
          resolve();
        });
      });

      // 4. Resposta de sucesso
      res.status(200).json({
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
   * Inicia o processo de recuperação de senha
   */
  static async solicitarRecuperacaoSenha(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email é obrigatório', 400);
      }

      // Não aguardamos para não expor tempo de resposta
      AuthService.solicitarRecuperacaoSenha(email)
        .catch(error => console.error('Erro no envio de recuperação:', error));

      res.status(200).json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /resetar-senha
   * Redefine a senha do usuário
   */
  static async resetarSenha(req, res, next) {
    try {
      const { token, novaSenha } = req.body;

      if (!token || !novaSenha) {
        throw new AppError('Token e nova senha são obrigatórios', 400);
      }

      await AuthService.resetarSenha(token, novaSenha);

      res.status(200).json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Exporta o controlador para uso nas rotas
module.exports = AuthController;
