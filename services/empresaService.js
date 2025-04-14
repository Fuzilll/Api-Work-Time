// Importação da configuração do banco de dados e do erro personalizado 'AppError'
const db = require('../config/db');  // O módulo de configuração do banco de dados (provavelmente usando um pool de conexões)
const { AppError } = require('../errors');  // O módulo que exporta a classe de erro personalizada 'AppError'

class EmpresaService {
  // Método para cadastrar uma nova empresa
  static async cadastrarEmpresa(dados) {
    // Desestruturação dos dados recebidos para fácil acesso às propriedades
    const {
      nome, cnpj, cidade, cep, rua, numero,
      id_estado, ramo_atuacao, email, telefone
    } = dados;

    try {
      // Verificação se já existe uma empresa com o mesmo CNPJ ou email
      const [existente] = await db.query(
        'SELECT id FROM EMPRESA WHERE cnpj = ? OR email = ?',  // Consulta SQL que verifica duplicidade
        [cnpj, email]  // Parâmetros passados para a consulta, substituindo os "?" na query
      );

      if (existente) {
        // Se a empresa já existir, lança um erro indicando que o CNPJ ou email já estão cadastrados
        throw new AppError('CNPJ ou Email já cadastrado', 409);  // 409 é o código HTTP de conflito
      }

      // Inserção dos dados da empresa no banco de dados
      const [result] = await db.query(
        `INSERT INTO EMPRESA (
          nome, cnpj, cidade, cep, rua, numero, 
          id_estado, ramo_atuacao, email, telefone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo')`,  // A consulta SQL insere os dados na tabela EMPRESA
        [nome, cnpj, cidade, cep, rua, numero,
          id_estado, ramo_atuacao, email, telefone]  // Parâmetros passados para a consulta
      );

      // Retorna o id gerado e os dados principais da empresa
      return { id: result.insertId, nome, cnpj };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Caso o erro seja de chave duplicada, retorna um erro específico
        throw new AppError('CNPJ ou Email já cadastrado', 409);  // Trata o erro de duplicidade
      }
      // Em caso de outro tipo de erro, lança o erro original
      throw err;
    }
  }

  // Método para listar todas as empresas
  static async listarEmpresas() {
    // Consulta SQL que retorna todas as empresas com o nome e sigla do estado de cada uma
    return db.query(
      `SELECT e.*, es.nome as estado_nome, es.sigla as estado_sigla
       FROM EMPRESA e
       JOIN ESTADO es ON e.id_estado = es.id`  // A junção (JOIN) é feita entre a tabela EMPRESA e ESTADO
    );
  }

  // Método para remover uma empresa, dado o seu id
  static async removerEmpresa(id) {
    // Verifica se existem funcionários vinculados a essa empresa
    const [funcionarios] = await db.query(
      'SELECT id FROM FUNCIONARIO WHERE id_empresa = ?',  // Consulta para verificar se a empresa tem funcionários
      [id]  // O id da empresa é passado como parâmetro
    );

    if (funcionarios.length > 0) {
      // Se houver funcionários, lança um erro informando que a empresa não pode ser removida
      throw new AppError('Empresa possui funcionários vinculados', 400);  // 400 é o código HTTP de erro de solicitação inválida
    }

    // Se não houver funcionários, procede com a remoção da empresa
    const [result] = await db.query(
      'DELETE FROM EMPRESA WHERE id = ?',  // Consulta para remover a empresa da tabela EMPRESA
      [id]  // O id da empresa é passado como parâmetro
    );

    if (result.affectedRows === 0) {
      // Se nenhuma linha for afetada, significa que a empresa não foi encontrada
      throw new AppError('Empresa não encontrada', 404);  // 404 é o código HTTP de não encontrado
    }

    // Retorna uma mensagem de sucesso
    return { message: 'Empresa removida com sucesso' };
  }

  // Método para alternar o status da empresa entre 'Ativo' e 'Inativo'
  static async alternarStatus(id) {
    // Consulta para obter o status atual da empresa
    const [empresa] = await db.query(
      'SELECT status FROM EMPRESA WHERE id = ?',  // Consulta para obter o status da empresa
      [id]  // O id da empresa é passado como parâmetro
    );

    if (!empresa) {
      // Se a empresa não for encontrada, lança um erro
      throw new AppError('Empresa não encontrada', 404);  // 404 significa que a empresa não existe
    }

    // Alterna o status da empresa (se 'Ativo' torna-se 'Inativo' e vice-versa)
    const novoStatus = empresa.status === 'Ativo' ? 'Inativo' : 'Ativo';

    // Atualiza o status da empresa no banco de dados
    await db.query(
      'UPDATE EMPRESA SET status = ? WHERE id = ?',
      [novoStatus, id]  // Passa o novo status e o id da empresa como parâmetros
    );

    // Retorna o novo status da empresa
    return { novoStatus };
  }

  // Método para obter detalhes de uma empresa, dado o seu id
  static async obterEmpresa(id) {
    // Consulta SQL que retorna os dados da empresa, incluindo o nome e sigla do estado
    const [empresa] = await db.query(
      `SELECT e.*, es.nome as estado_nome, es.sigla as estado_sigla
       FROM EMPRESA e
       JOIN ESTADO es ON e.id_estado = es.id
       WHERE e.id = ?`,  // Consulta busca a empresa pelo id
      [id]  // O id da empresa é passado como parâmetro
    );

    if (!empresa) {
      // Se a empresa não for encontrada, lança um erro
      throw new AppError('Empresa não encontrada', 404);  // 404 significa que a empresa não existe
    }

    // Retorna os dados completos da empresa
    return empresa;
  }

  
  static async cadastrarAdmin(adminData) {
    const {
      nome,
      email,
      senha,
      nivel,
      cpf,
      registro_emp,
      funcao,
      data_admissao,
      id_empresa,
      status,
      foto_url
    } = adminData;

    try {
      // Verificar se a empresa existe
      const [empresa] = await db.query('SELECT id FROM EMPRESA WHERE id = ?', [id_empresa]);
      if (!empresa) {
        throw new AppError('Empresa não encontrada', 404);
      }

      // Verificar se email ou CPF já existem
      const [existente] = await db.query(
        'SELECT id FROM USUARIO WHERE email = ? OR cpf = ?',
        [email, cpf]
      );

      if (existente) {
        throw new AppError('Email ou CPF já cadastrado', 409);
      }

      // Hash da senha
      const saltRounds = 10;
      const senhaHash = await bcrypt.hash(senha, saltRounds);

      // Iniciar transação
      await db.beginTransaction();

      try {
        // Inserir usuário
        const [usuarioResult] = await db.query(
          `INSERT INTO USUARIO (
                    nome, email, senha, nivel, status, cpf, foto_perfil_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nome, email, senhaHash, nivel, status, cpf, foto_url]
        );

        const usuarioId = usuarioResult.insertId;

        // Inserir admin
        await db.query(
          `INSERT INTO ADMIN (
                    id_usuario, id_empresa, permissoes
                ) VALUES (?, ?, ?)`,
          [usuarioId, id_empresa, JSON.stringify({
            gerenciar_usuarios: true,
            gerenciar_pontos: true,
            aprovar_pontos: true,
            visualizar_relatorios: true
          })]
        );

        // Commit da transação
        await db.commit();

        return {
          id: usuarioId,
          nome,
          email,
          nivel,
          id_empresa
        };
      } catch (err) {
        await db.rollback();
        throw err;
      }
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new AppError('Email ou CPF já cadastrado', 409);
      }
      throw err;
    }
  }
}

// Exportação do serviço para que possa ser utilizado em outras partes do código
module.exports = EmpresaService;

