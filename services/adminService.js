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
    const [updateResult] = await db.query(`
    UPDATE USUARIO u
    JOIN FUNCIONARIO f ON u.id = f.id_usuario
    SET u.status = 'Inativo'
    WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Ativo'
  `, [idFuncionario, idEmpresa]);

    if (updateResult.affectedRows === 0) {
      throw new AppError('Funcionário ativo não encontrado nesta empresa', 404);
    }

    return { message: 'Funcionário desativado com sucesso' };
  }

  static async reativarFuncionario(idFuncionario, idEmpresa) {
    const [updateResult] = await db.query(`
    UPDATE USUARIO u
    JOIN FUNCIONARIO f ON u.id = f.id_usuario
    SET u.status = 'Ativo'
    WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Inativo'
  `, [idFuncionario, idEmpresa]);

    if (updateResult.affectedRows === 0) {
      throw new AppError('Funcionário inativo não encontrado nesta empresa', 404);
    }

    return { message: 'Funcionário reativado com sucesso' };
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

  /**
   * Reativa um funcionário previamente desativado
   */
  static async reativarFuncionario(idFuncionario, idEmpresa) {
    const [result] = await db.query(`
      UPDATE USUARIO u
      JOIN FUNCIONARIO f ON u.id = f.id_usuario
      SET u.status = 'Ativo'
      WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Inativo'
  `, [idFuncionario, idEmpresa]);

    if (result.affectedRows === 0) {
      throw new AppError('Funcionário inativo não encontrado nesta empresa', 404);
    }

    return { message: 'Funcionário reativado com sucesso' };
  }

  /**
  * Verifica se um funcionário existe e pertence à empresa
  */
  static async verificarFuncionarioExistente(idFuncionario) {
    const [funcionario] = await db.query(
      'SELECT id FROM FUNCIONARIO WHERE id = ?',
      [idFuncionario]
    );

    if (!funcionario.length) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    return funcionario[0];
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
      console.log('[AdminService] Solicitações aaaaaaaaaaa', solicitacoes)
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
  static async listarFuncionarios(idEmpresa, filtros = {}) {
    let sql = `
      SELECT 
          f.id,
          u.nome,
          u.email,
          u.status,
          f.registro_emp,
          f.funcao,
          f.departamento,
          f.data_admissao,
          f.tipo_contrato,
          COUNT(rp.id) AS total_registros
      FROM FUNCIONARIO f
      JOIN USUARIO u ON f.id_usuario = u.id
      LEFT JOIN REGISTRO_PONTO rp ON f.id = rp.id_funcionario
      WHERE f.id_empresa = ?
  `;

    const params = [idEmpresa];

    if (filtros.status) {
      sql += ` AND u.status = ?`;
      params.push(filtros.status);
    }

    if (filtros.departamento) {
      sql += ` AND f.departamento = ?`;
      params.push(filtros.departamento);
    }

    if (filtros.nome) {
      sql += ` AND u.nome LIKE ?`;
      params.push(`%${filtros.nome}%`);
    }

    if (filtros.registro_emp) {
      sql += ` AND f.registro_emp LIKE ?`;
      params.push(`%${filtros.registro_emp}%`);
    }

    sql += ` GROUP BY f.id ORDER BY u.nome`;

    return await db.query(sql, params);
  }
  static async obterHorariosFuncionario(idFuncionario) {
    const sql = `
      SELECT 
          dia_semana,
          hora_entrada,
          hora_saida,
          intervalo_inicio,
          intervalo_fim
      FROM HORARIO_TRABALHO
      WHERE id_funcionario = ?
      ORDER BY 
          CASE dia_semana
              WHEN 'Segunda' THEN 1
              WHEN 'Terca' THEN 2
              WHEN 'Quarta' THEN 3
              WHEN 'Quinta' THEN 4
              WHEN 'Sexta' THEN 5
              WHEN 'Sabado' THEN 6
              WHEN 'Domingo' THEN 7
          END
  `;

    return await db.query(sql, [idFuncionario]);
  }
  static async atualizarHorariosFuncionario(idFuncionario, horarios) {
    return await db.transaction(async (connection) => {
      // 1. Remover horários existentes
      await connection.query(
        'DELETE FROM HORARIO_TRABALHO WHERE id_funcionario = ?',
        [idFuncionario]
      );

      // 2. Inserir novos horários
      if (horarios && horarios.length > 0) {
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
                    id_funcionario, dia_semana, hora_entrada, 
                    hora_saida, intervalo_inicio, intervalo_fim
                ) VALUES ?`,
          [values]
        );
      }

      // 3. Retornar os horários atualizados
      return await this.obterHorariosFuncionario(idFuncionario);
    });
  }
  static async listarDepartamentos(idEmpresa) {
    const resultado = await db.query(
      `SELECT DISTINCT departamento 
     FROM FUNCIONARIO 
     WHERE id_empresa = ? AND departamento IS NOT NULL
     ORDER BY departamento`,
      [idEmpresa]
    );

    // Verifica se é um array
    if (!Array.isArray(resultado)) {
      throw new Error('Resultado inesperado da query: não é um array');
    }

    // Se for array de objetos, mapeia corretamente
    return resultado.map(d => d.departamento);
  }

  static async obterFuncionario(idFuncionario, idEmpresa) {
    const sql = `
        SELECT 
            f.id,
            u.nome,
            u.email,
            u.cpf,
            u.status,
            f.registro_emp,
            f.funcao,
            f.departamento,
            f.data_admissao,
            f.salario_base,
            f.tipo_contrato
        FROM FUNCIONARIO f
        JOIN USUARIO u ON f.id_usuario = u.id
        WHERE f.id = ? AND f.id_empresa = ?
    `;

    const [funcionario] = await db.query(sql, [idFuncionario, idEmpresa]);

    if (!funcionario) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Obter horários do funcionário
    const horarios = await this.obterHorariosFuncionario(idFuncionario);

    return {
      ...funcionario,
      horarios
    };
  }
  static async atualizarFuncionario(idFuncionario, idEmpresa, dadosAtualizacao) {
    return await db.transaction(async (connection) => {
      // 1. Verificar se o funcionário existe e pertence à empresa
      const [funcionario] = await connection.query(
        `SELECT f.id, f.id_usuario 
             FROM FUNCIONARIO f 
             WHERE f.id = ? AND f.id_empresa = ?`,
        [idFuncionario, idEmpresa]
      );

      if (!funcionario.length) {
        throw new AppError('Funcionário não encontrado nesta empresa', 404);
      }

      const idUsuario = funcionario[0].id_usuario;

      // 2. Atualizar dados na tabela USUARIO
      if (dadosAtualizacao.nome || dadosAtualizacao.email || dadosAtualizacao.status) {
        const camposUsuario = {};
        if (dadosAtualizacao.nome) camposUsuario.nome = dadosAtualizacao.nome;
        if (dadosAtualizacao.email) camposUsuario.email = dadosAtualizacao.email;
        if (dadosAtualizacao.status) camposUsuario.status = dadosAtualizacao.status;

        await connection.query(
          `UPDATE USUARIO SET ? WHERE id = ?`,
          [camposUsuario, idUsuario]
        );
      }

      // 3. Atualizar dados na tabela FUNCIONARIO
      const camposFuncionario = { ...dadosAtualizacao };
      delete camposFuncionario.nome;
      delete camposFuncionario.email;
      delete camposFuncionario.status;

      if (Object.keys(camposFuncionario).length > 0) {
        await connection.query(
          `UPDATE FUNCIONARIO SET ? WHERE id = ?`,
          [camposFuncionario, idFuncionario]
        );
      }

      // 4. Retornar os dados atualizados
      const [funcionarioAtualizado] = await connection.query(
        `SELECT 
                f.id,
                u.nome,
                u.email,
                u.status,
                f.registro_emp,
                f.funcao,
                f.departamento,
                f.data_admissao,
                f.salario_base,
                f.tipo_contrato
             FROM FUNCIONARIO f
             JOIN USUARIO u ON f.id_usuario = u.id
             WHERE f.id = ?`,
        [idFuncionario]
      );

      return funcionarioAtualizado[0];
    });
  }

// No AdminService.js

static async ultimosRegistrosPonto(idEmpresa, limite = 5) {
  try {
    const [registros] = await db.query(`
      SELECT 
        rp.id,
        u.nome AS nome_completo,
        rp.foto_url AS foto_registro,
        rp.data_hora,
        rp.tipo,
        u.foto_perfil_url AS foto_perfil
      FROM 
        REGISTRO_PONTO rp
      JOIN 
        FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN 
        USUARIO u ON f.id_usuario = u.id
      WHERE 
        f.id_empresa = ?
      ORDER BY 
        rp.data_hora DESC
      LIMIT ?
    `, [idEmpresa, limite]);

    // Processar URLs das fotos
    return registros.map(registro => ({
      id: registro.id,
      nomeFuncionario: registro.nome_completo,
      foto: registro.foto_registro || registro.foto_perfil || '/assets/images/default-profile.png',
      dataHora: registro.data_hora,
      tipo: this.formatarTipoRegistro(registro.tipo)
    }));
  } catch (error) {
    console.error('[AdminService] Erro ao buscar últimos registros:', error);
    throw new AppError('Erro ao buscar últimos registros de ponto', 500);
  }
}

static async funcionariosStatusJornada(idEmpresa) {
  try {
    const [result] = await db.query(`
      SELECT 
        f.id,
        u.nome AS nome_completo,
        u.foto_perfil_url AS foto_perfil,
        MAX(rp.foto_url) AS ultima_foto_registro,
        f.carga_horaria_diaria,
        MAX(rp.data_hora) AS ultima_acao_data,
        (
          SELECT rp2.tipo 
          FROM REGISTRO_PONTO rp2 
          WHERE rp2.id_funcionario = f.id 
          AND DATE(rp2.data_hora) = CURDATE()
          ORDER BY rp2.data_hora DESC 
          LIMIT 1
        ) AS ultima_acao_tipo,
        SEC_TO_TIME(
          SUM(
            CASE 
              WHEN rp.tipo = 'Entrada' THEN 
                  TIMESTAMPDIFF(SECOND, rp.data_hora, 
                      (SELECT MIN(rp3.data_hora) 
                       FROM REGISTRO_PONTO rp3 
                       WHERE rp3.id_funcionario = f.id 
                       AND rp3.tipo IN ('Saida', 'Intervalo') 
                       AND DATE(rp3.data_hora) = CURDATE()
                       AND rp3.data_hora > rp.data_hora))
              ELSE 0 
            END
          )
        ) AS horas_trabalhadas
      FROM 
        FUNCIONARIO f
      JOIN 
        USUARIO u ON f.id_usuario = u.id
      LEFT JOIN 
        REGISTRO_PONTO rp ON f.id = rp.id_funcionario AND DATE(rp.data_hora) = CURDATE()
      WHERE 
        f.id_empresa = ?
      GROUP BY 
        f.id
      ORDER BY 
        u.nome
      LIMIT 10
    `, [idEmpresa]);

    return result.map(funcionario => {
      const status = this.determinarStatusJornada(
        funcionario.ultima_acao_tipo,
        funcionario.ultima_acao_data,
        funcionario.horas_trabalhadas,
        funcionario.carga_horaria_diaria
      );

      return {
        id_funcionario: funcionario.id,
        nome_completo: funcionario.nome_completo,
        foto: funcionario.ultima_foto_registro || funcionario.foto_perfil || '/assets/images/default-profile.png',
        ultima_acao: funcionario.ultima_acao_data ? 
          this.formatarHora(funcionario.ultima_acao_data) : 'N/A',
        ultima_acao_tipo: funcionario.ultima_acao_tipo,
        horas_trabalhadas: funcionario.horas_trabalhadas || '00:00:00',
        status_jornada: status.status,
        cor_status: status.cor
      };
    });
  } catch (error) {
    console.error('[AdminService] Erro ao buscar status da jornada:', error);
    throw new AppError('Erro ao buscar status da jornada dos funcionários', 500);
  }
}

static determinarStatusJornada(ultimoTipo, ultimaData, horasTrabalhadas, cargaHoraria) {
  const agora = new Date();
  const ultimaAcaoDate = ultimaData ? new Date(ultimaData) : null;
  
  if (!ultimoTipo) {
    return { status: 'Sem registros hoje', cor: 'cinza' };
  }

  if (ultimoTipo === 'Entrada' || ultimoTipo === 'Retorno') {
    const minutosDesdeUltimaAcao = ultimaAcaoDate ? 
      Math.floor((agora - ultimaAcaoDate) / (1000 * 60)) : 0;
    
    return {
      status: 'Em jornada',
      cor: minutosDesdeUltimaAcao > 120 ? 'vermelho' : 'verde'
    };
  }

  if (ultimoTipo === 'Intervalo') {
    return { status: 'Em intervalo', cor: 'amarelo' };
  }

  if (ultimoTipo === 'Saida') {
    // Verificar se cumpriu a carga horária
    const [horas, minutos] = (horasTrabalhadas || '00:00:00').split(':');
    const totalMinutosTrabalhados = parseInt(horas) * 60 + parseInt(minutos);
    const [horasCarga, minutosCarga] = (cargaHoraria || '08:00').split(':');
    const totalMinutosCarga = parseInt(horasCarga) * 60 + parseInt(minutosCarga);

    return {
      status: 'Jornada concluída',
      cor: totalMinutosTrabalhados >= totalMinutosCarga ? 'verde' : 'vermelho'
    };
  }

  return { status: 'Status desconhecido', cor: 'cinza' };
}

static formatarHora(dataHora) {
  if (!dataHora) return 'N/A';
  const date = new Date(dataHora);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

static formatarTipoRegistro(tipo) {
  const tipos = {
    'Entrada': 'Entrada',
    'Saida': 'Saída',
    'Intervalo': 'Intervalo',
    'Retorno': 'Retorno'
  };
  return tipos[tipo] || tipo;
}

static async notificacoesPendentes(idEmpresa) {
  try {
    const [notificacoes] = await db.query(`
      SELECT 
        n.id,
        n.tipo,
        n.mensagem,
        n.data_hora,
        n.prioridade,
        u.nome AS nome_funcionario,
        u.foto_perfil_url AS foto_funcionario
      FROM 
        NOTIFICACAO n
      JOIN 
        FUNCIONARIO f ON n.id_funcionario = f.id
      JOIN 
        USUARIO u ON f.id_usuario = u.id
      WHERE 
        n.resolvida = FALSE
        AND f.id_empresa = ?
      ORDER BY 
        CASE n.prioridade
          WHEN 'Alta' THEN 1
          WHEN 'Média' THEN 2
          WHEN 'Baixa' THEN 3
        END,
        n.data_hora DESC
      LIMIT 10
    `, [idEmpresa]);

    return notificacoes.map(notificacao => ({
      id: notificacao.id,
      tipo: notificacao.tipo,
      mensagem: this.formatarMensagemNotificacao(
        notificacao.tipo, 
        notificacao.mensagem, 
        notificacao.nome_funcionario,
        notificacao.data_hora
      ),
      data_hora: notificacao.data_hora,
      prioridade: notificacao.prioridade,
      foto: notificacao.foto_funcionario || '/assets/images/default-profile.png',
      resolvida: false
    }));
  } catch (error) {
    console.error('[AdminService] Erro ao buscar notificações:', error);
    throw new AppError('Erro ao buscar notificações pendentes', 500);
  }
}

static formatarMensagemNotificacao(tipo, mensagemPadrao, nomeFuncionario, dataHora) {
  const agora = new Date();
  const dataNotificacao = new Date(dataHora);
  const minutosDesdeNotificacao = Math.floor((agora - dataNotificacao) / (1000 * 60));

  switch (tipo) {
    case 'FALTA_REGISTRO_SAIDA':
      return `${nomeFuncionario} não registrou saída (há ${minutosDesdeNotificacao} min)`;
    case 'INTERVALO_LONGO':
      return `${nomeFuncionario} está com intervalo prolongado (há ${minutosDesdeNotificacao} min)`;
    case 'ATRASO_ENTRADA':
      return `${nomeFuncionario} chegou atrasado (há ${minutosDesdeNotificacao} min)`;
    default:
      return mensagemPadrao || 'Nova notificação';
  }
}



static async aprovarFechamento(idFechamento, idUsuarioAprovador, justificativa = null) {
  return await db.transaction(async (conn) => {
    // 1. Verificar se o fechamento existe e travar para edição
    const [fechamento] = await conn.query(
      `SELECT 
         ff.id AS id_fechamento, 
         ff.id_empresa, 
         ff.status,
         ff.mes_referencia,
         ff.ano_referencia,
         f.id_empresa
       FROM FECHAMENTO_FOLHA ff
       JOIN FUNCIONARIO f ON ff.id_funcionario = f.id
       WHERE ff.id = ? FOR UPDATE`,
      [idFechamento]
    );

    if (!fechamento?.length) {
      throw new AppError('Fechamento não encontrado', 404);
    }

    const fechamentoData = fechamento[0];

    // 2. Buscar informações do usuário aprovador
    const [usuarioRows] = await conn.query(
      `SELECT 
         u.id,
         u.nome,
         u.nivel,
         a.id AS admin_id,
         a.id_empresa
       FROM USUARIO u
       LEFT JOIN ADMIN a ON u.id = a.id_usuario
       WHERE u.id = ?`,
      [idUsuarioAprovador]
    );

    if (!usuarioRows?.length) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const user = usuarioRows[0];

    // 3. Verificar permissões
    if (user.nivel === 'IT_SUPPORT') {
      // Verificar se o IT_SUPPORT tem acesso à empresa do fechamento
      const [itSupportAccess] = await conn.query(
        `SELECT 1 FROM IT_SUPPORT 
         WHERE id_usuario = ? AND id_empresa = ?`,
        [idUsuarioAprovador, fechamentoData.id_empresa]
      );
      
      if (!itSupportAccess?.length) {
        throw new AppError('Você não tem permissão para aprovar este fechamento', 403);
      }
    } else if (user.nivel === 'ADMIN') {
      if (user.id_empresa !== fechamentoData.id_empresa) {
        throw new AppError('Você não tem permissão para aprovar este fechamento', 403);
      }
    } else {
      throw new AppError('Usuário não autorizado para aprovar fechamentos', 403);
    }

    // 4. Verificar se o fechamento já está aprovado
    if (fechamentoData.status === 'Aprovado') {
      throw new AppError('Este fechamento já está aprovado', 400);
    }

    // 5. Atualizar status do fechamento
    await conn.query(
      `UPDATE FECHAMENTO_FOLHA 
       SET status = 'Aprovado', 
           data_aprovacao = NOW(),
           id_admin_responsavel = ?,
           observacoes = ?
       WHERE id = ?`,
      [user.admin_id, justificativa, idFechamento]
    );

    // 6. Inserir log de auditoria
    const acao = 'Aprovação de Fechamento de Folha';
    const detalhe = `Fechamento ID ${idFechamento} aprovado para o período ${fechamentoData.mes_referencia}/${fechamentoData.ano_referencia}`;
    await conn.query(
      `INSERT INTO LOG_AUDITORIA (id_usuario, acao, detalhe) VALUES (?, ?, ?)`,
      [idUsuarioAprovador, acao, detalhe]
    );

    // 7. Retornar dados atualizados do fechamento
    const [fechamentoAtualizadoRows] = await conn.query(
      `SELECT 
         ff.*, 
         u.nome as nome_admin_responsavel,
         e.nome_fantasia as empresa_nome,
         func.nome as funcionario_nome
       FROM FECHAMENTO_FOLHA ff
       JOIN FUNCIONARIO f ON ff.id_funcionario = f.id
       JOIN USUARIO func ON f.id_usuario = func.id
       JOIN EMPRESA e ON f.id_empresa = e.id_empresa
       LEFT JOIN ADMIN a ON ff.id_admin_responsavel = a.id
       LEFT JOIN USUARIO u ON a.id_usuario = u.id
       WHERE ff.id = ?`,
      [idFechamento]
    );

    return fechamentoAtualizadoRows[0];
  });
}

static async obterDetalhesFechamento(idFechamento) {
  return await db.transaction(async (conn) => {
    // 1. Buscar informações básicas do fechamento
    const [fechamentoRows] = await conn.query(
      `SELECT 
         ff.*,
         uf.nome as funcionario_nome,
         f.registro_emp,
         f.funcao,
         e.nome_fantasia as empresa_nome,
         ua.nome as admin_responsavel_nome
       FROM FECHAMENTO_FOLHA ff
       JOIN FUNCIONARIO f ON ff.id_funcionario = f.id
       JOIN USUARIO uf ON f.id_usuario = uf.id
       JOIN EMPRESA e ON f.id_empresa = e.id_empresa
       LEFT JOIN ADMIN a ON ff.id_admin_responsavel = a.id
       LEFT JOIN USUARIO ua ON a.id_usuario = ua.id
       WHERE ff.id = ?`,
      [idFechamento]
    );

    if (!fechamentoRows?.length) {
      throw new AppError('Fechamento não encontrado', 404);
    }

    const fechamento = fechamentoRows[0];

    // 2. Buscar horas trabalhadas relacionadas ao período do fechamento
    const [horasRows] = await conn.query(
      `SELECT 
         ht.*
       FROM HORAS_TRABALHADAS ht
       WHERE ht.id_funcionario = ?
         AND MONTH(ht.data) = ?
         AND YEAR(ht.data) = ?
         AND ht.status = 'Validado'
       ORDER BY ht.data`,
      [fechamento.id_funcionario, fechamento.mes_referencia, fechamento.ano_referencia]
    );

    // 3. Buscar ocorrências relacionadas ao período do fechamento
    const [ocorrenciasRows] = await conn.query(
      `SELECT 
         o.*
       FROM OCORRENCIA o
       WHERE o.id_funcionario = ?
         AND MONTH(o.data_ocorrencia) = ?
         AND YEAR(o.data_ocorrencia) = ?
         AND o.status = 'Aprovada'
       ORDER BY o.data_ocorrencia`,
      [fechamento.id_funcionario, fechamento.mes_referencia, fechamento.ano_referencia]
    );

    return {
      ...fechamento,
      horas_trabalhadas: horasRows || [],
      ocorrencias: ocorrenciasRows || []
    };
  });
}

static async listarFechamentosPendentes(filtros = {}) {
  const { nomeEmpresa, mes, ano, page = 1, limit = 10 } = filtros;
  const parsedLimit = parseInt(limit);
  const parsedPage = parseInt(page);
  const offset = (parsedPage - 1) * parsedLimit;

  let query = `
    SELECT 
      ff.id,
      ff.id_funcionario,
      ff.mes_referencia,
      ff.ano_referencia,
      ff.status,
      ff.data_fechamento,
      e.nome AS empresa_nome,
      u.nome AS funcionario_nome,
      f.funcao,
      COUNT(*) OVER() AS total_count
    FROM FECHAMENTO_FOLHA ff
    JOIN FUNCIONARIO f ON ff.id_funcionario = f.id
    JOIN USUARIO u ON f.id_usuario = u.id
    JOIN EMPRESA e ON f.id_empresa = e.id
    WHERE ff.status = 'Pendente'
  `;

  const params = [];

  if (nomeEmpresa) {
    query += ` AND e.nome LIKE ?`;
    params.push(`%${nomeEmpresa}%`);
  }

  if (mes) {
    query += ` AND ff.mes_referencia = ?`;
    params.push(mes);
  }

  if (ano) {
    query += ` AND ff.ano_referencia = ?`;
    params.push(ano);
  }

  query += `
    ORDER BY ff.data_fechamento DESC
    LIMIT ? OFFSET ?
  `;
  params.push(parsedLimit, offset);

  const [rows] = await db.query(query, params);

  return {
    data: rows,
    total: rows[0]?.total_count || 0,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil((rows[0]?.total_count || 0) / parsedLimit)
  };
}

}

module.exports = AdminService;
