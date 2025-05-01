// Importa a instância de conexão com o banco de dados
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { AppError } = require('../errors');
// const emailService = require('../services/emailService'); // descomente se necessário

class AdminService {
  static async cadastrarFuncionario(idEmpresa, dados) {
    const {
      nome, email, senha, cpf, registro_emp, funcao,
      data_admissao, departamento, salario_base, tipo_contrato,
      horarios
    } = dados;

    try {
      return await db.transaction(async (connection) => {
        // 1. Verificar se usuário já existe
        const usuarioExistente = await this.verificarUsuarioExistente(connection, email, cpf);
        if (usuarioExistente) {
          throw new AppError(usuarioExistente, 409);
        }

        // 2. Cadastrar usuário
        const idUsuario = await this.cadastrarUsuario(connection, nome, email, senha, cpf);
        if (!idUsuario) {
          throw new AppError('Falha ao obter ID do usuário cadastrado', 500);
        }

        // 3. Cadastrar dados do funcionário
        const funcionario = await this.cadastrarDadosFuncionario(
          connection,
          idUsuario,
          idEmpresa,
          { registro_emp, funcao, data_admissao, departamento, salario_base, tipo_contrato }
        );

        // 4. Cadastrar horários (padrão ou personalizados)
        if (!horarios || horarios.length === 0) {
          // Cadastrar horário padrão se não for fornecido
          await this.cadastrarHorarioPadrao(connection, funcionario.insertId);
        } else {
          // Cadastrar horários personalizados
          await this.cadastrarHorarios(connection, funcionario.insertId, horarios);
        }

        return {
          id: idUsuario,
          id_funcionario: funcionario.insertId,
          nome,
          email,
          registro_emp,
          funcao,
          status: 'Ativo'
        };
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const erro = {};
        if (err.message.includes('email')) erro.email = 'E-mail já cadastrado';
        if (err.message.includes('cpf')) erro.cpf = 'CPF já cadastrado';
        throw new AppError(erro, 409);
      }
      throw err;
    }
  }

  static async cadastrarHorarioPadrao(connection, idFuncionario) {
    const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
    const horariosPadrao = diasSemana.map(dia => ({
      dia_semana: dia,
      hora_entrada: '09:00',
      hora_saida: '18:00',
      intervalo_inicio: '12:00',
      intervalo_fim: '13:00'
    }));

    await this.cadastrarHorarios(connection, idFuncionario, horariosPadrao);
  }

  static async cadastrarHorarios(connection, idFuncionario, horarios) {
    if (!idFuncionario || !horarios || !Array.isArray(horarios)) {
      throw new AppError('Parâmetros inválidos para cadastro de horários', 400);
    }

    // Validar cada horário
    for (const horario of horarios) {
      if (!horario.dia_semana || !horario.hora_entrada || !horario.hora_saida) {
        throw new AppError('Dados de horário incompletos', 400);
      }
    }

    const values = horarios.map(h => [
      idFuncionario,
      h.dia_semana,
      h.hora_entrada,
      h.hora_saida,
      h.intervalo_inicio || null,
      h.intervalo_fim || null
    ]);

    await connection.query(
      `INSERT INTO HORARIO_TRABALHO (
        id_funcionario, dia_semana, hora_entrada, hora_saida, 
        intervalo_inicio, intervalo_fim
      ) VALUES ?`,
      [values]
    );
  }


  static async cadastrarUsuario(connection, nome, email, senha, cpf) {
    try {
      const hashedPassword = await bcrypt.hash(senha, 10);
      const [result] = await connection.execute(
        `INSERT INTO USUARIO (nome, email, senha, nivel, cpf, status)
         VALUES (?, ?, ?, 'FUNCIONARIO', ?, 'Ativo')`,
        [nome, email, hashedPassword, cpf]
      );
      if (!result || !result.insertId) {
        throw new AppError('Falha ao cadastrar usuário: ID não gerado', 500);
      }
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async cadastrarDadosFuncionario(connection, idUsuario, idEmpresa, dados) {
    if (!idUsuario || !idEmpresa) {
      throw new AppError('IDs de usuário ou empresa inválidos', 400);
    }

    const parametros = [
      idUsuario,
      dados.registro_emp,
      dados.funcao,
      dados.departamento || null,
      dados.data_admissao,
      idEmpresa,
      dados.salario_base ?? null,
      dados.tipo_contrato
    ];

    try {
      const [result] = await connection.execute(
        `INSERT INTO FUNCIONARIO (
          id_usuario, registro_emp, funcao, departamento, 
          data_admissao, id_empresa, salario_base, tipo_contrato
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        parametros
      );
      return result;
    } catch (error) {
      console.error('ERRO SQL AO INSERIR FUNCIONÁRIO:', error); // 👈 log real do erro
      throw new AppError('Erro ao cadastrar dados do funcionário', 500);
    }
  }


  static async verificarUsuarioExistente(connection, email, cpf) {
    try {
      // Verificar por email
      const [emailExistente] = await connection.query(
        'SELECT id FROM USUARIO WHERE email = ?',
        [email]
      );

      if (emailExistente.length > 0) {
        return { email: 'E-mail já cadastrado' };
      }

      // Verificar por CPF
      const [cpfExistente] = await connection.query(
        'SELECT id FROM USUARIO WHERE cpf = ?',
        [cpf]
      );

      if (cpfExistente.length > 0) {
        return { cpf: 'CPF já cadastrado' };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar usuário existente:', error);
      throw new AppError('Erro ao verificar usuário existente', 500);
    }
  }

  static async inserirHorarios(connection, idFuncionario, horarios) {
    const values = horarios.map(h => [
      idFuncionario,
      h.dia_semana,
      h.hora_entrada,
      h.hora_saida,
      h.intervalo_inicio,
      h.intervalo_fim
    ]);
    await connection.query(
      `INSERT INTO HORARIO_TRABALHO (
        id_funcionario, dia_semana, hora_entrada, hora_saida, 
        intervalo_inicio, intervalo_fim
      ) VALUES ?`,
      [values]
    );
  }
  /**
   * Obtém detalhes completos de um ponto específico
   * @param {Number} idPonto - ID do ponto
   * @param {Number} idEmpresa - ID da empresa (para validação)
   * @returns {Promise<Object>} - Detalhes completos do ponto
   */
  static async obterDetalhesPonto(idPonto, idEmpresa) {
    console.log(`[AdminService] Buscando detalhes do ponto ${idPonto} para empresa ${idEmpresa}`);

    try {
      const sql = `
        SELECT 
          rp.id,
          u.nome AS funcionario,
          f.departamento,
          rp.tipo,
          rp.data_hora,
          rp.status,
          rp.justificativa,
          rp.foto_url,
          rp.latitude,
          rp.longitude,
          rp.endereco_registro,
          rp.dispositivo,
          rp.precisao_geolocalizacao,
          aprovador_usuario.nome AS aprovador,
          f.registro_emp AS matricula
        FROM REGISTRO_PONTO rp
        JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
        JOIN USUARIO u ON f.id_usuario = u.id
        LEFT JOIN ADMIN a ON rp.id_aprovador = a.id
        LEFT JOIN USUARIO aprovador_usuario ON a.id_usuario = aprovador_usuario.id
        WHERE rp.id = ? AND (f.id_empresa = ? OR ? IS NULL)
      `;

      console.log(`[AdminService] Executando query: ${sql}`);
      const resultado = await db.query(sql, [idPonto, idEmpresa, idEmpresa]);

      if (!resultado || resultado.length === 0) {
        console.log(`[AdminService] Ponto ${idPonto} não encontrado`);
        return null;
      }

      console.log(`[AdminService] Ponto encontrado:`, resultado[0]);
      return resultado[0];

    } catch (error) {
      console.error(`[AdminService] Erro ao buscar detalhes do ponto: ${error.message}`);
      throw new AppError('Erro ao buscar detalhes do ponto', 500);
    }
  }

  static async resumoFuncionarios(idEmpresa) {
    const [resumo] = await db.query(`
      SELECT 
        COUNT(*) AS total_funcionarios,
        SUM(CASE WHEN u.status = 'Ativo' THEN 1 ELSE 0 END) AS ativos,
        SUM(CASE WHEN u.status = 'Inativo' THEN 1 ELSE 0 END) AS inativos,
        SUM(CASE WHEN f.tipo_contrato = 'CLT' THEN 1 ELSE 0 END) AS clt,
        SUM(CASE WHEN f.tipo_contrato = 'PJ' THEN 1 ELSE 0 END) AS pj
      FROM FUNCIONARIO f
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
    `, [idEmpresa]);
    return resumo;
  }

  static async relatorioPontos(idEmpresa, filtros = {}) {
    const { dataInicio, dataFim } = filtros;
    let sql = `
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN rp.status = 'Aprovado' THEN 1 ELSE 0 END) AS aprovados,
        SUM(CASE WHEN rp.status = 'Pendente' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN rp.status = 'Rejeitado' THEN 1 ELSE 0 END) AS rejeitados
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      WHERE f.id_empresa = ?
    `;
    const params = [idEmpresa];
    if (dataInicio && dataFim) {
      sql += ' AND DATE(rp.data_hora) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }
    const [relatorio] = await db.query(sql, params);
    return relatorio;
  }

  static async buscarPontos(idEmpresa, filtros = {}) {
    const { status, dataInicio, dataFim, busca } = filtros;
    let sql = `
      SELECT 
        rp.id, u.nome AS funcionario, rp.data_hora, 
        rp.tipo, rp.status, rp.foto_url
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
    `;
    const params = [idEmpresa];
    if (status) {
      sql += ' AND rp.status = ?';
      params.push(status);
    }
    if (dataInicio && dataFim) {
      sql += ' AND DATE(rp.data_hora) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }
    if (busca) {
      sql += ' AND (u.nome LIKE ? OR u.email LIKE ? OR f.registro_emp LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }
    sql += ' ORDER BY rp.data_hora DESC';
    return db.query(sql, params);
  }
  static async atualizarStatusPonto(idPonto, status, idUsuarioAprovador, justificativa = null) {
    return await db.transaction(async (conn) => {
      // 1. Verificar se o ponto existe
      const [ponto] = await conn.query(
        `SELECT rp.id, rp.id_funcionario, rp.status, f.id_empresa
         FROM REGISTRO_PONTO rp
         JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
         WHERE rp.id = ? FOR UPDATE`,
        [idPonto]
      );
  
      if (!ponto?.length) {
        throw new AppError('Ponto não encontrado', 404);
      }
  
      const pontoData = ponto[0];
  
      // 2. Buscar informações do usuário aprovador
      const [usuarioRows] = await conn.query(
        `SELECT 
           u.id AS user_id, 
           u.nome,
           u.nivel,
           a.id AS admin_id,
           a.id_empresa,
           a.permissoes
         FROM USUARIO u
         LEFT JOIN ADMIN a ON u.id = a.id_usuario
         WHERE u.id = ?`,
        [idUsuarioAprovador]
      );
  
      if (!usuarioRows?.length) {
        throw new AppError('Usuário não encontrado', 404);
      }
  
      const user = usuarioRows[0];
      let idAdmin = user.admin_id;
  
      // 3. Verificar permissões
      if (user.nivel === 'IT_SUPPORT') {
        if (!idAdmin) {
          throw new AppError('Administrador IT_SUPPORT não encontrado', 403);
        }
      } else if (user.nivel === 'ADMIN') {
        if (user.id_empresa !== pontoData.id_empresa) {
          throw new AppError('Você não tem permissão para aprovar este ponto', 403);
        }
        if (!idAdmin) {
          throw new AppError('Administrador não encontrado', 403);
        }
      } else {
        throw new AppError('Usuário não autorizado para aprovar pontos', 403);
      }
  
      // 4. Atualizar status do ponto
      await conn.query(
        `UPDATE REGISTRO_PONTO 
         SET status = ?, id_aprovador = ?, justificativa = ?
         WHERE id = ?`,
        [status, idAdmin, justificativa, idPonto]
      );
  
      // 5. Registrar ocorrência se rejeitado
      if (status === 'Rejeitado') {
        await conn.query(
          `INSERT INTO OCORRENCIA 
           (id_funcionario, tipo, descricao, id_admin_responsavel, data_ocorrencia, status)
           VALUES (?, ?, ?, ?, NOW(), 'Aprovada')`,
          [pontoData.id_funcionario, 'PontoRejeitado', justificativa, idAdmin]
        );
      }
  
      // 6. Inserir log de auditoria
      const acao = status === 'Aprovado' ? 'Aprovação de Ponto' : 'Rejeição de Ponto';
      const detalhe = `Ponto ID ${idPonto}, status alterado para "${status}"${justificativa ? `, justificativa: ${justificativa}` : ''}`;
      await conn.query(
        `INSERT INTO LOG_AUDITORIA (id_usuario, acao, detalhe) VALUES (?, ?, ?)`,
        [idUsuarioAprovador, acao, detalhe]
      );
  
      // 7. Retornar dados atualizados do ponto
      const [pontoAtualizadoRows] = await conn.query(
        `SELECT rp.*, u.nome as nome_funcionario 
         FROM REGISTRO_PONTO rp
         JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
         JOIN USUARIO u ON f.id_usuario = u.id
         WHERE rp.id = ?`,
        [idPonto]
      );
  
      return {
        ...pontoAtualizadoRows[0],
        justificativa: status === 'Rejeitado' ? justificativa : null
      };
    });
  }
  
  

  
  
  /**
 * Registra uma ocorrência para um funcionário
 * @param {Object} conn - Conexão de banco de dados
 * @param {Number} idFuncionario - ID do funcionário
 * @param {String} tipo - Tipo de ocorrência
 * @param {String} descricao - Descrição da ocorrência
 * @param {Number} idAdmin - ID do administrador responsável
 */
  static async registrarOcorrencia(conn, idFuncionario, tipo, descricao, idAdmin) {
    await conn.query(
      `INSERT INTO OCORRENCIA (
          id_funcionario, tipo, descricao, id_admin_responsavel, data_ocorrencia
        ) VALUES (?, ?, ?, ?, CURDATE())`,
      [idFuncionario, tipo, descricao, idAdmin]
    );
  }

  /**
    * Carrega pontos pendentes de aprovação
    * @param {Number} idEmpresa - ID da empresa
    * @param {Object} filtros - Filtros de busca
    * @returns {Promise<Array>} - Lista de pontos pendentes
    */
  static async carregarPontosPendentes(idEmpresa, filtros = {}) {
    let sql = `
      SELECT 
        rp.id,
        u.nome AS funcionario,
        f.departamento,
        rp.tipo,
        rp.data_hora,
        rp.foto_url,
        rp.latitude,
        rp.longitude,
        rp.endereco_registro,
        rp.status,
        rp.justificativa,
        rp.dispositivo,
        rp.precisao_geolocalizacao
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
    `;
  
    const params = [idEmpresa];
  
    if (filtros.status) {
      sql += ` AND rp.status = ?`;
      params.push(filtros.status);
    }
  
    if (filtros.dataInicio && filtros.dataFim) {
      sql += ` AND DATE(rp.data_hora) BETWEEN ? AND ?`;
      params.push(filtros.dataInicio, filtros.dataFim);
    }
  
    if (filtros.departamento) {
      sql += ` AND f.departamento = ?`;
      params.push(filtros.departamento);
    }
  
    if (filtros.nome && filtros.nome.trim()) {
      sql += ` AND u.nome LIKE ?`;
      params.push(`%${filtros.nome.trim()}%`);
    }
  
    sql += ` ORDER BY rp.data_hora DESC`;
  
    return await db.query(sql, params);
  }
  

  
  /**
    * Carrega pontos com possíveis irregularidades para análise manual
    * @param {Number} idEmpresa - ID da empresa
    * @returns {Promise<Array>} - Lista de pontos para análise
    */
  static async carregarPontosParaAnalise(idEmpresa) {
    // 1. Obter configurações da empresa
    const [config] = await db.query(
      `SELECT tolerancia_atraso, raio_geolocalizacao 
     FROM CONFIGURACAO_PONTO 
     WHERE id_empresa = ?`,
      [idEmpresa]
    );

    // 2. Obter pontos com possíveis problemas
    const pontos = await db.query(
      `SELECT 
      rp.id,
      u.nome AS funcionario,
      f.departamento,
      rp.tipo,
      rp.data_hora,
      rp.status,
      rp.foto_url,
      rp.latitude,
      rp.longitude,
      rp.endereco_registro,
      rp.precisao_geolocalizacao,
      ht.hora_entrada AS hora_esperada_entrada,
      ht.hora_saida AS hora_esperada_saida
    FROM REGISTRO_PONTO rp
    JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
    JOIN USUARIO u ON f.id_usuario = u.id
    LEFT JOIN HORARIO_TRABALHO ht ON 
      f.id = ht.id_funcionario AND 
      ht.dia_semana = DAYNAME(rp.data_hora)
    WHERE f.id_empresa = ? AND rp.status = 'Pendente'
    ORDER BY rp.data_hora DESC`,
      [idEmpresa]
    );

    // 3. Analisar cada ponto
    return pontos.map(ponto => {
      const analise = PointAnalyzer.analisarPonto(ponto, config[0]);
      return { ...ponto, analise };
    });
  }

  static async desativarFuncionario(idFuncionario, idEmpresa) {
    const [result] = await db.query(`
      UPDATE USUARIO u
      JOIN FUNCIONARIO f ON u.id = f.id_usuario
      SET u.status = 'Inativo'
      WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Ativo'
    `, [idFuncionario, idEmpresa]);

    if (result.affectedRows === 0) {
      throw new AppError('Funcionário ativo não encontrado nesta empresa', 404);
    }

    return { message: 'Funcionário desativado com sucesso' };
  }

  static async excluirFuncionario(idFuncionario, idEmpresa) {
    return await db.transaction(async (connection) => {
      const [funcionario] = await connection.query(`
        SELECT f.id_usuario 
        FROM FUNCIONARIO f
        JOIN USUARIO u ON f.id_usuario = u.id
        WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Inativo'
      `, [idFuncionario, idEmpresa]);

      if (!funcionario.length) {
        throw new AppError('Funcionário não encontrado ou ainda ativo', 400);
      }

      const idUsuario = funcionario[0].id_usuario;

      await connection.query('DELETE FROM HORARIO_TRABALHO WHERE id_funcionario = ?', [idFuncionario]);
      await connection.query('DELETE FROM REGISTRO_PONTO WHERE id_funcionario = ?', [idFuncionario]);
      await connection.query('DELETE FROM FUNCIONARIO WHERE id = ?', [idFuncionario]);
      await connection.query('DELETE FROM USUARIO WHERE id = ?', [idUsuario]);

      return { message: 'Funcionário excluído com sucesso' };
    });
  }


  //solicitações de alteração de ponto 
  /**
 * Processa a resposta do admin para uma solicitação de alteração
 * @param {Number} idSolicitacao - ID da solicitação
 * @param {Number} idAdmin - ID do admin que está respondendo
 * @param {String} acao - 'Aprovada' ou 'Rejeitada'
 * @param {String} resposta - Resposta do admin
 * @returns {Promise<Object>} - Resultado do processamento
 */
static async responderSolicitacaoAlteracao(idSolicitacao, idAdmin, acao, resposta) {
    return await db.transaction(async (connection) => {
        // 1. Verificar se a solicitação existe e está pendente
        const [solicitacao] = await connection.query(
            `SELECT sa.*, rp.id_funcionario, u.nome as nome_funcionario, u.email
             FROM SOLICITACAO_ALTERACAO sa
             JOIN REGISTRO_PONTO rp ON sa.id_registro = rp.id
             JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
             JOIN USUARIO u ON f.id_usuario = u.id
             WHERE sa.id = ? AND sa.status = 'Pendente' FOR UPDATE`,
            [idSolicitacao]
        );

        if (!solicitacao.length) {
            throw new AppError('Solicitação não encontrada ou já processada', 404);
        }

        const solicitacaoData = solicitacao[0];

        // 2. Verificar se o admin tem permissão
        const [admin] = await connection.query(
            `SELECT id FROM ADMIN WHERE id = ? AND id = ?`,
            [idAdmin, solicitacaoData.id_admin_responsavel]
        );

        if (!admin.length) {
            throw new AppError('Você não tem permissão para responder esta solicitação', 403);
        }

        // 3. Atualizar a solicitação
        await connection.query(
            `UPDATE SOLICITACAO_ALTERACAO 
             SET status = ?, resposta_admin = ?, data_resposta = NOW()
             WHERE id = ?`,
            [acao, resposta, idSolicitacao]
        );

        // 4. Atualizar o registro de ponto
        let statusPonto = acao === 'Aprovada' ? 'Aprovado' : 'Rejeitado';
        await connection.query(
            `UPDATE REGISTRO_PONTO 
             SET status = ?, id_aprovador = ?
             WHERE id = ?`,
            [statusPonto, idAdmin, solicitacaoData.id_registro]
        );

        // 5. Registrar log
        await connection.query(
            `INSERT INTO LOG_AUDITORIA (id_usuario, acao, detalhe) 
             VALUES (?, ?, ?)`,
            [
                idAdmin,
                `Resposta Solicitação Alteração Ponto`,
                `Solicitação ID ${idSolicitacao} ${acao}. Resposta: ${resposta}`
            ]
        );

        // 6. Retornar dados para envio de email
        return {
            id: idSolicitacao,
            id_registro: solicitacaoData.id_registro,
            id_funcionario: solicitacaoData.id_funcionario,
            nome_funcionario: solicitacaoData.nome_funcionario,
            email_funcionario: solicitacaoData.email,
            status: acao,
            resposta_admin: resposta,
            data_resposta: new Date()
        };
    });
}

/**
 * Lista solicitações de alteração pendentes para um admin
 * @param {Number} idAdmin - ID do admin
 * @returns {Promise<Array>} - Lista de solicitações
 */
static async listarSolicitacoesPendentes(idAdmin) {
    const [solicitacoes] = await db.query(
        `SELECT 
            sa.id,
            sa.id_registro,
            sa.motivo,
            sa.data_solicitacao,
            u.nome as nome_funcionario,
            f.departamento,
            rp.tipo as tipo_ponto,
            rp.data_hora,
            rp.status as status_ponto
         FROM SOLICITACAO_ALTERACAO sa
         JOIN REGISTRO_PONTO rp ON sa.id_registro = rp.id
         JOIN FUNCIONARIO f ON sa.id_funcionario = f.id
         JOIN USUARIO u ON f.id_usuario = u.id
         WHERE sa.id_admin_responsavel = ? AND sa.status = 'Pendente'
         ORDER BY sa.data_solicitacao DESC`,
        [idAdmin]
    );

    return solicitacoes;
}

/**
 * Obtém detalhes de uma solicitação específica
 * @param {Number} idSolicitacao - ID da solicitação
 * @param {Number} idAdmin - ID do admin (para validação)
 * @returns {Promise<Object>} - Detalhes da solicitação
 */
static async obterDetalhesSolicitacao(idSolicitacao, idAdmin) {
    const [solicitacao] = await db.query(
        `SELECT 
            sa.*,
            u.nome as nome_funcionario,
            f.departamento,
            rp.tipo as tipo_ponto,
            rp.data_hora,
            rp.foto_url,
            rp.latitude,
            rp.longitude,
            rp.endereco_registro,
            aprovador.nome as nome_aprovador
         FROM SOLICITACAO_ALTERACAO sa
         JOIN REGISTRO_PONTO rp ON sa.id_registro = rp.id
         JOIN FUNCIONARIO f ON sa.id_funcionario = f.id
         JOIN USUARIO u ON f.id_usuario = u.id
         LEFT JOIN ADMIN adm ON sa.id_admin_responsavel = adm.id
         LEFT JOIN USUARIO aprovador ON adm.id_usuario = aprovador.id
         WHERE sa.id = ? AND sa.id_admin_responsavel = ?`,
        [idSolicitacao, idAdmin]
    );

    if (!solicitacao.length) {
        throw new AppError('Solicitação não encontrada', 404);
    }

    return solicitacao[0];
}












//METODOS EM TESTE PARA solicitações de alteração de ponto 
// No AdminService.js

/**
 * Obtém solicitações de alteração pendentes para uma empresa
 * @param {Number} idEmpresa - ID da empresa
 * @returns {Promise<Array>} - Lista de solicitações pendentes
 */
static async obterSolicitacoesAlteracaoPendentes(idEmpresa) {
  try {
      const sql = `
          SELECT 
              sa.id,
              sa.id_registro,
              sa.tipo_solicitacao,
              sa.motivo,
              sa.data_solicitacao,
              u.nome AS nome_funcionario,
              f.registro_emp,
              f.departamento,
              rp.tipo AS tipo_registro,
              rp.data_hora AS data_hora_original,
              rp.status AS status_registro,
              rp.foto_url,
              rp.latitude,
              rp.longitude
          FROM SOLICITACAO_ALTERACAO sa
          JOIN REGISTRO_PONTO rp ON sa.id_registro = rp.id
          JOIN FUNCIONARIO f ON sa.id_funcionario = f.id
          JOIN USUARIO u ON f.id_usuario = u.id
          WHERE f.id_empresa = ? 
          AND sa.status = 'Pendente'
          ORDER BY sa.data_solicitacao DESC
      `;

      const solicitacoes = await db.query(sql, [idEmpresa]);
      return solicitacoes;
  } catch (error) {
      console.error('[AdminService] Erro ao buscar solicitações pendentes:', error);
      throw new AppError('Erro ao buscar solicitações de alteração', 500);
  }
}

/**
* Processa uma solicitação de alteração (aprovar/rejeitar)
* @param {Number} idSolicitacao - ID da solicitação
* @param {Number} idUsuario - ID do usuário admin
* @param {String} acao - 'aprovar' ou 'rejeitar'
* @param {String} motivo - Motivo da decisão
* @returns {Promise<Object>} - Resultado da operação
*/
static async processarSolicitacaoAlteracao(idSolicitacao, idUsuario, acao, motivo) {
  return await db.transaction(async (connection) => {
      try {
          // 1. Verificar se a solicitação existe e está pendente
          const [solicitacao] = await connection.query(`
              SELECT sa.*, rp.id_funcionario, f.id_empresa, u.nome AS nome_funcionario
              FROM SOLICITACAO_ALTERACAO sa
              JOIN REGISTRO_PONTO rp ON sa.id_registro = rp.id
              JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
              JOIN USUARIO u ON f.id_usuario = u.id
              WHERE sa.id = ? AND sa.status = 'Pendente'
              FOR UPDATE
          `, [idSolicitacao]);

          if (!solicitacao.length) {
              throw new AppError('Solicitação não encontrada ou já processada', 404);
          }

          const solicitacaoData = solicitacao[0];

          // 2. Verificar se o usuário tem permissão (é admin da mesma empresa)
          const [admin] = await connection.query(`
              SELECT a.id FROM ADMIN a
              JOIN USUARIO u ON a.id_usuario = u.id
              WHERE a.id_usuario = ? AND a.id_empresa = ?
          `, [idUsuario, solicitacaoData.id_empresa]);

          if (!admin.length) {
              throw new AppError('Você não tem permissão para processar esta solicitação', 403);
          }

          const idAdmin = admin[0].id;
          const novoStatus = acao === 'aprovar' ? 'Aprovada' : 'Rejeitada';
          const statusPonto = acao === 'aprovar' ? 'Aprovado' : 'Rejeitado';

          // 3. Atualizar a solicitação
          await connection.query(`
              UPDATE SOLICITACAO_ALTERACAO 
              SET status = ?, 
                  id_admin_responsavel = ?,
                  resposta_admin = ?,
                  data_resposta = NOW()
              WHERE id = ?
          `, [novoStatus, idAdmin, motivo, idSolicitacao]);

          // 4. Atualizar o registro de ponto
          await connection.query(`
              UPDATE REGISTRO_PONTO 
              SET status = ?,
                  id_aprovador = ?,
                  justificativa = ?
              WHERE id = ?
          `, [statusPonto, idAdmin, motivo, solicitacaoData.id_registro]);

          // 5. Registrar log
          await connection.query(`
              INSERT INTO LOG_AUDITORIA 
              (id_usuario, acao, detalhe)
              VALUES (?, ?, ?)
          `, [idUsuario, `Solicitação ${novoStatus}`, `Solicitação ID ${idSolicitacao} - ${motivo}`]);

          return {
              message: `Solicitação ${novoStatus.toLowerCase()} com sucesso`,
              data: {
                  id: idSolicitacao,
                  status: novoStatus,
                  nome_funcionario: solicitacaoData.nome_funcionario
              }
          };
      } catch (error) {
          console.error('[AdminService] Erro ao processar solicitação:', error);
          throw error;
      }
  });
}
}

module.exports = AdminService;
