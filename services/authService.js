// Importação dos módulos necessários
const db = require('../config/db'); // Configuração do banco de dados (provavelmente um pool de conexões)
const bcrypt = require('bcryptjs'); // Biblioteca para hash de senhas (usada para comparar e gerar senhas seguras)
const crypto = require('crypto'); // Biblioteca para gerar tokens criptografados (para recuperação de senha)
const { AppError, UnauthorizedError } = require('../errors'); // Erros personalizados para o serviço
const emailService = require('./emailService'); // Serviço para envio de e-mails
const { generateToken } = require('../utils/auth'); // Função utilitária para gerar tokens JWT

/**
 * AuthService é responsável por toda a lógica de autenticação do usuário:
 * - Login (com validação de credenciais)
 * - Recuperação de senha (envio de token de recuperação)
 * - Reset de senha (alteração da senha com token válido)
 * Ambiente de execução: Node.js (com banco de dados e interações com e-mail).
 */
class AuthService {

  /**
   * Realiza o login do usuário validando as credenciais e gerando um token JWT
   * @param {string} email - E-mail do usuário.
   * @param {string} senha - Senha do usuário.
   * @param {object} session - Objeto de sessão, usado para armazenar dados temporários.
   * @returns {object} - Objeto com as informações do usuário e o token gerado.
   */
  static async login(email, senha, session) {
    console.log('[SERVICE] Iniciando autenticação para:', email);

    const [usuario] = await db.query(
      `SELECT 
          u.id, u.nome, u.email, u.senha, u.nivel, u.status, u.foto_perfil_url,
          a.id_empresa AS admin_id_empresa,
          f.id_empresa AS func_id_empresa,
          f.id AS id_funcionario
       FROM USUARIO u
       LEFT JOIN ADMIN a ON u.id = a.id_usuario
       LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
       WHERE u.email = ?`,
      [email]
    );

    console.log('[SERVICE] Usuário encontrado no DB:', usuario ? usuario.id : 'Nenhum');

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      console.log('[SERVICE] Credenciais inválidas');
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (usuario.status !== 'Ativo') {
      console.log('[SERVICE] Conta inativa');
      throw new UnauthorizedError('Conta inativa');
    }

    const { id, nome, email: userEmail, nivel, foto_perfil_url, id_funcionario } = usuario;

    session.id_usuario = id;
    session.nivel = nivel;

    let id_empresa = null;

    if (nivel === 'ADMIN') {
      id_empresa = usuario.admin_id_empresa;
      session.id_empresa = id_empresa;
    } else if (nivel === 'FUNCIONARIO') {
      id_empresa = usuario.func_id_empresa;
      session.id_empresa = id_empresa;
    }

    console.log('[SERVICE] Sessão configurada:', {
      id_usuario: session.id_usuario,
      nivel: session.nivel,
      id_empresa: session.id_empresa || 'N/A'
    });

    const token = generateToken({
      id,
      nivel,
      ...(id_empresa && { id_empresa })
    });

    console.log('[SERVICE] Token gerado:', token);

    return {
      usuario: {
        id,
        nome,
        email: userEmail,
        nivel,
        id_empresa,
        foto_perfil_url,
        id_funcionario
      },
      token
    };
  }


  /**
   * Solicita a recuperação de senha, gerando um token e enviando um e-mail com instruções
   * @param {string} email - E-mail do usuário para o qual será enviado o link de recuperação
   */
  /**
   * Solicita a recuperação de senha, gerando um token e enviando um e-mail com instruções
   * @param {string} email - E-mail do usuário para o qual será enviado o link de recuperação
   * @returns {Promise<void>}
   */
  static async solicitarRecuperacaoSenha(email) {
    console.log('[AUTH SERVICE] Iniciando processo de recuperação para:', email);

    // 1. Verificar se o usuário existe
    const [usuario] = await db.query(
      `SELECT id, nome, email 
     FROM USUARIO 
     WHERE email = ? AND status = 'Ativo'`,
      [email]
    );

    if (!usuario) {
      console.log('[AUTH SERVICE] Usuário não encontrado ou inativo');
      // Por segurança, não revelamos se o email existe
      return;
    }

    // 2. Gerar token de recuperação
    const token = crypto.randomBytes(32).toString('hex');
    const expiracao = new Date(Date.now() + 3600000); // 1 hora de validade

    // 3. Salvar token no banco de dados
    await db.query(
      `UPDATE USUARIO 
     SET token_recuperacao = ?, token_validade = ?
     WHERE id = ?`,
      [token, expiracao, usuario.id]
    );

    // 4. Preparar URL de reset
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
    // 5. Enviar email
    try {
      await emailService.enviarEmailRecuperacaoSenha(usuario.email, {
        nome: usuario.nome,
        resetUrl: resetUrl,
        expiracao: '1 hora',
        empresa: usuario.empresa_nome || 'Work Time System'
      });

      console.log('[AUTH SERVICE] Email de recuperação enviado com sucesso');
    } catch (error) {
      console.error('[AUTH SERVICE] Erro ao enviar email de recuperação:', error);
      throw new AppError('Falha ao enviar email de recuperação', 500);
    }
  }

  /**
   * Redefine a senha do usuário usando um token válido
   * @param {string} token - Token de recuperação
   * @param {string} novaSenha - Nova senha
   * @returns {Promise<void>}
   */
  static async resetarSenha(token, novaSenha) {
    console.log('[AUTH SERVICE] Processando reset de senha para token:', token);

    // 1. Validar token e obter usuário
    const [usuario] = await db.query(
      `SELECT id, token_validade 
     FROM USUARIO 
     WHERE token_recuperacao = ? 
     AND token_validade > NOW()`,
      [token]
    );

    if (!usuario) {
      console.log('[AUTH SERVICE] Token inválido ou expirado');
      throw new AppError('Token inválido ou expirado', 400);
    }

    // 2. Validar força da senha (opcional)
    if (novaSenha.length < 8) {
      throw new AppError('A senha deve ter pelo menos 8 caracteres', 400);
    }

    // 3. Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 12);

    // 4. Atualizar senha e limpar token
    await db.query(
      `UPDATE USUARIO 
     SET senha = ?, token_recuperacao = NULL, token_validade = NULL
     WHERE id = ?`,
      [senhaHash, usuario.id]
    );

    console.log('[AUTH SERVICE] Senha atualizada com sucesso para usuário:', usuario.id);
  }

  /**
 * Obtém informações consolidadas para o dashboard administrativo
 * - Resumo de funcionários
 * - Estatísticas de pontos
 * - Últimos registros pendentes
 */
  static async carregarDashboardAdmin(idEmpresa) {
    try {
      // Executa todas as consultas em paralelo para melhor performance
      const [resumoFuncionarios, relatorioPontos, pontosPendentes] = await Promise.all([
        this.resumoFuncionarios(idEmpresa),
        this.relatorioPontos(idEmpresa, {
          dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)),
          dataFim: new Date()
        }),
        this.carregarPontosPendentes(idEmpresa)
      ]);


      return {
        resumoFuncionarios: resumoFuncionarios[0],
        relatorioPontos: relatorioPontos[0],
        pontosPendentes
      };
    } catch (err) {
      console.error('Erro ao carregar dashboard admin:', err);
      throw new AppError('Falha ao carregar dados do dashboard', 500);
    }
  }

  static async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao realizar logout');
      }

      // Limpa os dados locais
      localStorage.clear();
      sessionStorage.clear();

      return await response.json();
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Força a limpeza mesmo em caso de erro
      localStorage.clear();
      sessionStorage.clear();
      throw error;
    }
  }

}

// Exporta o AuthService para uso em outros módulos
module.exports = AuthService;
