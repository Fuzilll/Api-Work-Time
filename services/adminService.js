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

  static async atualizarStatusPonto(idPonto, status, idAprovador) {
    const [result] = await db.query(
      `UPDATE REGISTRO_PONTO 
       SET status = ?, id_aprovador = ?
       WHERE id = ?`,
      [status, idAprovador, idPonto]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Ponto não encontrado', 404);
    }

    const [registro] = await db.query(
      `SELECT rp.*, u.email, u.nome 
       FROM REGISTRO_PONTO rp
       JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
       JOIN USUARIO u ON f.id_usuario = u.id
       WHERE rp.id = ?`,
      [idPonto]
    );

    if (registro) {
      // await emailService.enviarEmailNotificacaoPonto(...);
    }

    return { status };
  }

  static async carregarPontosPendentes(idEmpresa) {
    return db.query(`
      SELECT 
        rp.id, u.nome AS funcionario, rp.data_hora, 
        rp.tipo, rp.foto_url, rp.justificativa
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE rp.status = 'Pendente' AND f.id_empresa = ?
      ORDER BY rp.data_hora DESC
    `, [idEmpresa]);
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
}

module.exports = AdminService;
