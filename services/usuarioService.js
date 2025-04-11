// Importa a configuração do banco de dados para realizar consultas e operações.
const db = require('../config/db'); 
// Importa os erros personalizados para tratamento de exceções.
const { AppError, UnauthorizedError, NotFoundError } = require('../errors');
// Importa o módulo crypto para gerar tokens criptográficos.
const crypto = require('crypto'); 
// Importa o módulo bcryptjs para realizar o hash das senhas de forma segura.
const bcrypt = require('bcryptjs'); 
// Importa a função para gerar tokens JWT que serão usados para autenticar APIs.
const { generateToken } = require('../utils/auth'); 
// Importa o serviço de envio de emails.
const emailService = require('./emailService');

// Classe que define os serviços de usuário (cadastrar, login, recuperar senha, etc).
class UsuarioService {

  // Método para cadastrar um novo usuário
  static async cadastrarUsuario(dados) {
    // Desestruturação dos dados recebidos para variáveis individuais
    const { 
      nome, 
      email, 
      senha, 
      nivel, 
      cpf,
      status = 'Ativo',  // Se o status não for informado, o padrão será 'Ativo'.
      foto_perfil_url = null,  // Caso o usuário tenha foto de perfil, ela será armazenada.
      registro_emp = null,  // Registro do funcionário, necessário apenas para 'FUNCIONARIO'.
      funcao = null,  // Função do funcionário, também só necessária para 'FUNCIONARIO'.
      data_admissao = null,  // Data de admissão do funcionário.
      id_empresa = null  // ID da empresa associada ao usuário, obrigatório para Admin/Funcionário.
    } = dados;

    // Validação: se o nível não for 'IT_SUPPORT', a empresa deve ser informada para Admin/Funcionário.
    if (nivel !== 'IT_SUPPORT' && !id_empresa) {
      throw new AppError('Empresa é obrigatória para Admin/Funcionário', 400);
    }

    // Validação: caso seja 'FUNCIONARIO', todos os dados relacionados ao trabalho devem ser informados.
    if (nivel === 'FUNCIONARIO' && (!registro_emp || !funcao || !data_admissao)) {
      throw new AppError('Dados incompletos para funcionário', 400);
    }

    try {
      // Verifica se já existe um usuário com o mesmo email.
      const [existente] = await db.query(
        'SELECT id FROM USUARIO WHERE email = ?', 
        [email]
      );

      // Se o email já existir, retorna um erro de conflito (409).
      if (existente) {
        throw new AppError('Email já cadastrado', 409);
      }

      // Gera um hash da senha para garantir que a senha seja armazenada de forma segura.
      const senhaHash = await bcrypt.hash(senha, 12);

      // Insere os dados do usuário na tabela 'USUARIO'.
      const [result] = await db.query(
        `INSERT INTO USUARIO 
        (nome, email, senha, nivel, cpf, status, foto_perfil_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nome, email, senhaHash, nivel, cpf, status, foto_perfil_url]
      );

      const userId = result.insertId; // Armazena o ID do usuário recém-inserido.

      // Se o nível for 'ADMIN', insere dados adicionais na tabela 'ADMIN'.
      if (nivel === 'ADMIN') {
        await db.query(
          `INSERT INTO ADMIN (id_usuario, id_empresa) 
          VALUES (?, ?)`,
          [userId, id_empresa]
        );
      } 
      // Se o nível for 'FUNCIONARIO', insere dados na tabela 'FUNCIONARIO'.
      else if (nivel === 'FUNCIONARIO') {
        await db.query(
          `INSERT INTO FUNCIONARIO 
          (id_usuario, registro_emp, funcao, data_admissao, id_empresa) 
          VALUES (?, ?, ?, ?, ?)`,
          [userId, registro_emp, funcao, data_admissao, id_empresa]
        );
      }

      // Recupera os dados do usuário recém-cadastrado (incluindo dados adicionais de ADMIN ou FUNCIONARIO).
      const [usuario] = await db.query(
        `SELECT 
          u.id, u.nome, u.email, u.nivel, u.status,
          a.id_empresa, f.registro_emp
        FROM USUARIO u
        LEFT JOIN ADMIN a ON u.id = a.id_usuario
        LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
        WHERE u.id = ?`,
        [userId]
      );

      // Se o usuário não for 'IT_SUPPORT', envia um email de confirmação de cadastro.
      if (dados.nivel !== 'IT_SUPPORT') {
        await emailService.enviarEmailConfirmacaoCadastro(
          dados.email, 
          dados.nome
        );
      }

      return usuario; // Retorna o objeto com os dados do usuário recém-criado.
    } catch (err) {
      // Se ocorrer um erro de duplicação (CPF ou Email), lança um erro específico.
      if (err.code === 'ER_DUP_ENTRY') {
        throw new AppError('CPF ou Email já cadastrado', 409);
      }
      throw err; // Relança outros erros não tratados
    }
  }

  // Método para realizar login de um usuário
  static async login(email, senha, session) {
    // Busca o usuário pelo email no banco de dados.
    const [usuario] = await db.query(
      `SELECT 
        u.id, u.nome, u.email, u.senha, u.nivel, u.status, u.foto_perfil_url,
        a.id_empresa, a.permissoes,
        f.id AS id_funcionario
      FROM USUARIO u
      LEFT JOIN ADMIN a ON u.id = a.id_usuario
      LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
      WHERE u.email = ?`,
      [email]
    );

    
    // Verifica se o usuário não existe ou se a senha não confere.
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Se o status do usuário for diferente de 'Ativo', retorna erro.
    if (usuario.status !== 'Ativo') {
      throw new UnauthorizedError('Conta inativa');
    }

    // Configura as informações da sessão para o usuário logado.
    session.id_usuario = usuario.id;
    session.nivel = usuario.nivel;
    session.id_empresa = usuario.id_empresa;

    // Gera um token JWT para autenticar as chamadas subsequentes da API.
    const token = generateToken({
      id: usuario.id,
      nivel: usuario.nivel,
      id_empresa: usuario.id_empresa
    });

    // Retorna as informações do usuário e o token gerado.
    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
        id_empresa: usuario.id_empresa,
        foto_perfil_url: usuario.foto_perfil_url,
        id_funcionario: usuario.id_funcionario
      },
      token
    };
  }

  // Método para solicitar recuperação de senha (geração de token)
  static async solicitarRecuperacaoSenha(email) {
    // Verifica se o email informado existe no banco.
    const [usuario] = await db.query(
      'SELECT id FROM USUARIO WHERE email = ?',
      [email]
    );

    // Não retorna erro se o usuário não for encontrado, por questões de segurança.
    if (!usuario) {
      return;
    }

    // Gera um token aleatório para recuperação de senha (válido por 1 hora).
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 3600000); // O token vai expirar em 1 hora.

    // Atualiza o banco com o token gerado e a data de expiração.
    await db.query(
      `UPDATE USUARIO 
      SET reset_token = ?, reset_token_expires = ? 
      WHERE id = ?`,
      [token, expiration, usuario.id]
    );

    // Envia um email com o link de recuperação de senha.
    await emailService.enviarEmailRecuperacao(email, token);
  }

  // Método para resetar a senha com o token gerado
  static async resetarSenha(token, novaSenha) {
    // Verifica se o token é válido e se não expirou.
    const [usuario] = await db.query(
      `SELECT id FROM USUARIO 
      WHERE reset_token = ? AND reset_token_expires > NOW()`,
      [token]
    );

    // Se o token não for válido ou expirado, retorna erro.
    if (!usuario) {
      throw new AppError('Token inválido ou expirado', 400);
    }

    // Criptografa a nova senha antes de salvar no banco.
    const senhaHash = await bcrypt.hash(novaSenha, 12);

    // Atualiza a senha do usuário e limpa o token de recuperação.
    await db.query(
      `UPDATE USUARIO 
      SET senha = ?, reset_token = NULL, reset_token_expires = NULL 
      WHERE id = ?`,
      [senhaHash, usuario.id]
    );
  }

  // Método para obter o perfil completo do usuário
  static async obterPerfil(userId) {
    // Busca as informações do perfil no banco de dados.
    const [perfil] = await db.query(
      `SELECT 
        u.id, u.nome, u.email, u.nivel, u.cpf, u.foto_perfil_url,
        f.registro_emp, f.funcao, f.data_admissao, f.id_empresa,
        e.nome AS nome_empresa
      FROM USUARIO u
      LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
      LEFT JOIN EMPRESA e ON f.id_empresa = e.id
      WHERE u.id = ?`,
      [userId]
    );

    // Se o perfil não for encontrado, lança um erro.
    if (!perfil) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return perfil; // Retorna o perfil do usuário encontrado.
  }

  // Método para atualizar o perfil do usuário (dados pessoais)
  static async atualizarPerfil(userId, dados) {
    const { nome, cpf, foto_perfil_url } = dados;

    // Atualiza os dados do usuário no banco (nome, CPF, foto de perfil).
    await db.query(
      `UPDATE USUARIO 
      SET nome = ?, cpf = ?, foto_perfil_url = ? 
      WHERE id = ?`,
      [nome, cpf, foto_perfil_url, userId]
    );

    // Retorna o perfil atualizado após a modificação.
    return this.obterPerfil(userId);
  }

  // Método para alterar a senha do usuário
  static async alterarSenha(userId, senhaAtual, novaSenha) {
    // Busca a senha atual do usuário para validação.
    const [usuario] = await db.query(
      'SELECT senha FROM USUARIO WHERE id = ?',
      [userId]
    );

    // Se o usuário não for encontrado, lança um erro.
    if (!usuario) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Verifica se a senha atual fornecida é válida.
    if (!(await bcrypt.compare(senhaAtual, usuario.senha))) {
      throw new AppError('Senha atual incorreta', 401);
    }

    // Criptografa a nova senha antes de salvar no banco.
    const senhaHash = await bcrypt.hash(novaSenha, 12);

    // Atualiza a senha no banco de dados.
    await db.query(
      'UPDATE USUARIO SET senha = ? WHERE id = ?',
      [senhaHash, userId]
    );
  }

  // Método para listar todos os usuários do sistema
  static async listarUsuarios() {
    // Retorna todos os usuários com seus dados básicos, incluindo a empresa associada.
    return db.query(
      `SELECT 
        u.id, u.nome, u.email, u.nivel, u.status, u.foto_perfil_url,
        f.id_empresa, e.nome AS nome_empresa
      FROM USUARIO u
      LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
      LEFT JOIN EMPRESA e ON f.id_empresa = e.id
      ORDER BY u.nome` // Ordena os resultados pelo nome do usuário.
    );
  }

  // Método para alterar o status de um usuário (ativo ou inativo)
  static async alterarStatusUsuario(id, status) {
    // Atualiza o status do usuário para 'Ativo' ou 'Inativo'.
    await db.query(
      'UPDATE USUARIO SET status = ? WHERE id = ?',
      [status, id]
    );
  }
}

module.exports = UsuarioService;
