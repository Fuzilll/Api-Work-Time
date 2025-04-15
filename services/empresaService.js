// Importação da configuração do banco de dados e do erro personalizado 'AppError'
const db = require('../config/db');  // O módulo de configuração do banco de dados (provavelmente usando um pool de conexões)
const { AppError } = require('../errors');  // O módulo que exporta a classe de erro personalizada 'AppError'
const bcrypt = require('bcrypt'); // Adicione esta linha

class EmpresaService {
  // Método para cadastrar uma nova empresa
  static async cadastrarEmpresa(dados) {
    const {
      nome, cnpj, cidade, cep, rua, numero,
      id_estado, ramo_atuacao, email, telefone
    } = dados;

    try {
      // Verifica se o estado existe
      const estadoResult = await db.query('SELECT id FROM ESTADO WHERE id = ?', [id_estado]);
      if (estadoResult.length === 0) {
        throw new AppError('Estado inválido', 400);
      }

      // Verifica empresa existente
      const existenteResult = await db.query(
        'SELECT id FROM EMPRESA WHERE cnpj = ? OR email = ?',
        [cnpj, email]
      );

      if (existenteResult.length > 0) {
        throw new AppError('CNPJ ou Email já cadastrado', 409);
      }

      const insertResult = await db.query(
        `INSERT INTO EMPRESA (
          nome, cnpj, cidade, cep, rua, numero, 
          id_estado, ramo_atuacao, email, telefone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo')`,
        [nome, cnpj, cidade, cep, rua, numero,
          id_estado, ramo_atuacao, email, telefone]
      );

      return {
        id: insertResult.insertId,
        nome,
        cnpj,
        status: 'Ativo'
      };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new AppError('CNPJ ou Email já cadastrado', 409);
      }
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
    try {
      return await db.transaction(async (conn) => {
        // 1. Remover administradores vinculados
        await conn.query(
          `DELETE a FROM ADMIN a
           JOIN USUARIO u ON a.id_usuario = u.id
           WHERE a.id_empresa = ?`,
          [id]
        );

        // 2. Remover usuários que eram apenas administradores desta empresa
        await conn.query(
          `DELETE u FROM USUARIO u
           LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
           LEFT JOIN ADMIN a ON u.id = a.id_usuario
           WHERE u.nivel = 'ADMIN' 
           AND a.id_empresa = ? 
           AND f.id_usuario IS NULL`,
          [id]
        );

        // 3. Verificar se existem funcionários vinculados
        const funcionarios = await conn.query(
          'SELECT id FROM FUNCIONARIO WHERE id_empresa = ?',
          [id]
        );

        if (funcionarios.length > 0) {
          throw new AppError('Empresa possui funcionários vinculados', 400);
        }

        // 4. Remover a empresa
        const result = await conn.query(
          'DELETE FROM EMPRESA WHERE id = ?',
          [id]
        );

        if (result.affectedRows === 0) {
          throw new AppError('Empresa não encontrada', 404);
        }

        return { message: 'Empresa removida com sucesso' };
      });
    } catch (err) {
      throw err;
    }
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
    const { nome, email, senha, cpf, id_empresa } = adminData;

    console.log('[DEBUG] Iniciando cadastro de admin com dados:', {
        nome,
        email: email.substring(0, 3) + '...',
        cpf: cpf.substring(0, 3) + '...',
        id_empresa
    });

    try {
        return await db.transaction(async (conn) => {
            console.log('[DEBUG] Transação iniciada');

            // 1. Verificar empresa
            console.log('[DEBUG] Verificando empresa ID:', id_empresa);
            const [empresaRows] = await conn.query('SELECT id FROM EMPRESA WHERE id = ?', [id_empresa]);
            
            if (!empresaRows || empresaRows.length === 0) {
                console.error('[DEBUG] Empresa não encontrada');
                throw new AppError('Empresa não encontrada', 404);
            }
            console.log('[DEBUG] Empresa validada');

            // 2. Verificar email existente - FORMA CORRIGIDA
            console.log('[DEBUG] Verificando email:', email);
            const [emailRows] = await conn.query('SELECT id FROM USUARIO WHERE email = ?', [email]);
            
            console.log('[DEBUG] Resultado verificação email:', emailRows);
            
            if (emailRows && emailRows.length > 0) {
                console.error('[DEBUG] Email já cadastrado. ID do usuário existente:', emailRows[0].id);
                throw new AppError('Email já cadastrado', 409);
            }
            console.log('[DEBUG] Email disponível');

            // 3. Verificar CPF existente - FORMA CORRIGIDA
            console.log('[DEBUG] Verificando CPF:', cpf);
            const [cpfRows] = await conn.query('SELECT id FROM USUARIO WHERE cpf = ?', [cpf]);
            
            console.log('[DEBUG] Resultado verificação CPF:', cpfRows);
            
            if (cpfRows && cpfRows.length > 0) {
                console.error('[DEBUG] CPF já cadastrado. ID do usuário existente:', cpfRows[0].id);
                throw new AppError('CPF já cadastrado', 409);
            }
            console.log('[DEBUG] CPF disponível');

            // 4. Criar hash da senha
            console.log('[DEBUG] Criando hash da senha');
            const saltRounds = 10;
            const senhaHash = await bcrypt.hash(senha, saltRounds);
            console.log('[DEBUG] Hash da senha criado');

            // 5. Inserir usuário
            console.log('[DEBUG] Inserindo usuário na tabela USUARIO');
            const [usuarioResult] = await conn.query(
                `INSERT INTO USUARIO (
                    nome, email, senha, nivel, status, cpf, foto_perfil_url
                ) VALUES (?, ?, ?, 'ADMIN', 'Ativo', ?, NULL)`,
                [nome, email, senhaHash, cpf]
            );

            const usuarioId = usuarioResult.insertId;
            console.log('[DEBUG] Usuário criado com ID:', usuarioId);

            // 6. Definir permissões
            const permissoes = {
                gerenciar_usuarios: true,
                gerenciar_pontos: true,
                fechar_ponto: true,
                cadastrar_funcionario: true,
                aprovar_pontos: true,
                excluir_funcionario: true,
                desativar_funcionario: true,
                visualizar_relatorios: true,
                gerenciar_empresa: true,
                configurar_sistema: true,
                gerenciar_ferias: true,
                gerenciar_beneficios: true,
                gerenciar_documentos: true,
                gerenciar_cargos: true,
                gerenciar_departamentos: true,
                gerenciar_horarios: true,
                gerenciar_escalas: true,
                gerenciar_ocorrencias: true,
                gerenciar_folha_pagamento: true
            };
            console.log('[DEBUG] Permissões definidas:', permissoes);

            // 7. Inserir admin
            console.log('[DEBUG] Inserindo registro na tabela ADMIN');
            await conn.query(
                `INSERT INTO ADMIN (
                    id_usuario, id_empresa, permissoes
                ) VALUES (?, ?, ?)`,
                [usuarioId, id_empresa, JSON.stringify(permissoes)]
            );
            console.log('[DEBUG] Admin cadastrado com sucesso');

            return {
                id: usuarioId,
                nome,
                email,
                nivel: 'ADMIN',
                id_empresa
            };
        });
    } catch (err) {
        console.error('[DEBUG] Erro durante cadastro de admin:', {
            message: err.message,
            code: err.code,
            stack: err.stack
        });

        if (err.code === 'ER_DUP_ENTRY') {
            // Verificação adicional para identificar qual campo causou a duplicidade
            try {
                const [emailCheck] = await db.query('SELECT id FROM USUARIO WHERE email = ?', [email]);
                const [cpfCheck] = await db.query('SELECT id FROM USUARIO WHERE cpf = ?', [cpf]);

                if (emailCheck && emailCheck.length > 0) {
                    throw new AppError('Email já cadastrado', 409);
                } else if (cpfCheck && cpfCheck.length > 0) {
                    throw new AppError('CPF já cadastrado', 409);
                }
            } catch (checkError) {
                console.error('[DEBUG] Erro ao verificar duplicidade:', checkError);
            }
            
            throw new AppError('Dados já cadastrados', 409);
        }
        
        throw err;
    }
}
}
// Exportação do serviço para que possa ser utilizado em outras partes do código
module.exports = EmpresaService;

