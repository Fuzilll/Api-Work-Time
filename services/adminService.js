// Importa a instância de conexão com o banco de dados (MySQL, MariaDB ou similar)
const db = require('../config/db');

// Importa classe de erro personalizada para controle padronizado de exceções
const { AppError } = require('../errors');

class AdminService {
  /**
   * Cadastra um novo funcionário e seu usuário associado
   * - Envolve múltiplas tabelas: USUARIO, FUNCIONARIO, HORARIO_TRABALHO
   * - Protegido por transação para garantir consistência em caso de falha
   */
  static async cadastrarFuncionario(idEmpresa, dados) {
    const {
      nome, email, senha, cpf, registro_emp, funcao,
      data_admissao, departamento, salario_base, tipo_contrato
    } = dados;

    // Verifica se já existe usuário com mesmo email ou CPF
    const [existente] = await db.query(
      `SELECT id FROM USUARIO 
       WHERE email = ? OR cpf = ?`,
      [email, cpf]
    );

    if (existente) {
      throw new AppError('Email ou CPF já cadastrado', 409);
    }

    // Inicia uma transação para garantir atomicidade
    await db.beginTransaction();

    try {
      // 1. Insere usuário básico na tabela USUARIO
      const [usuarioResult] = await db.query(
        `INSERT INTO USUARIO (
          nome, email, senha, nivel, cpf, status
        ) VALUES (?, ?, SHA2(?, 256), 'FUNCIONARIO', ?, 'Ativo')`,
        [nome, email, senha, cpf]
      );

      const idUsuario = usuarioResult.insertId;

      // 2. Cria entrada correspondente em FUNCIONARIO
      await db.query(
        `INSERT INTO FUNCIONARIO (
          id_usuario, registro_emp, funcao, departamento, 
          data_admissao, id_empresa, salario_base, tipo_contrato
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idUsuario, registro_emp, funcao, departamento,
         data_admissao, idEmpresa, salario_base, tipo_contrato]
      );

      // 3. Define horários padrões de segunda a sexta (09h-18h com intervalo)
      await db.query(
        `INSERT INTO HORARIO_TRABALHO (
          id_funcionario, dia_semana, hora_entrada, hora_saida, 
          intervalo_inicio, intervalo_fim
        ) VALUES 
          (?, 'Segunda', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
          (?, 'Terca', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
          (?, 'Quarta', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
          (?, 'Quinta', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
          (?, 'Sexta', '09:00:00', '18:00:00', '12:00:00', '13:00:00')`,
        [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]
      );

      // Finaliza a transação se tudo ocorrer corretamente
      await db.commit();

      // Retorna dados básicos do funcionário criado
      return { id: idUsuario, nome, email };
    } catch (err) {
      // Reverte todas as alterações em caso de erro
      await db.rollback();
      throw err;
    }
  }

  
  /**
   * Gera resumo estatístico dos funcionários da empresa
   * - Útil para dashboards gerenciais
   */
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

  /**
   * Retorna estatísticas de registros de ponto por status
   * - Permite filtrar por período com dataInicio e dataFim
   */
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

    // Adiciona filtro de datas se fornecido
    if (dataInicio && dataFim) {
      sql += ' AND DATE(rp.data_hora) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }

    const [relatorio] = await db.query(sql, params);
    return relatorio;
  }

  /**
   * Lista registros de ponto com base em filtros diversos
   * - Filtros: status, datas, nome/email/código do funcionário
   */
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

  /**
   * Atualiza o status de um ponto (ex: aprovado/rejeitado)
   * - Inclui envio de notificação por e-mail
   */
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

    // Busca informações do ponto atualizado para notificar o funcionário
    const [registro] = await db.query(
      `SELECT rp.*, u.email, u.nome 
       FROM REGISTRO_PONTO rp
       JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
       JOIN USUARIO u ON f.id_usuario = u.id
       WHERE rp.id = ?`,
      [idPonto]
    );

    if (registro) {
      await emailService.enviarEmailNotificacaoPonto(registro.email, {
        nome: registro.nome,
        tipo: registro.tipo,
        dataHora: registro.data_hora,
        status: status
      });
    }

    return { status };
  }

  /**
   * Lista pontos pendentes de validação para uma empresa
   * - Foco em exibição em painel administrativo
   */
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

  /**
   * Marca um funcionário como "Inativo"
   * - Soft delete: mantém histórico, mas bloqueia acesso
   */
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

  /**
   * Exclui completamente um funcionário e seus dados associados
   * - Somente se estiver inativo (evita perda de dados acidental)
   * - Exclui em ordem reversa de dependência (para evitar FK errors)
   */
  static async excluirFuncionario(idFuncionario, idEmpresa) {
    // Verifica se funcionário está inativo
    const [funcionario] = await db.query(`
      SELECT f.id_usuario 
      FROM FUNCIONARIO f
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Inativo'
    `, [idFuncionario, idEmpresa]);

    if (!funcionario) {
      throw new AppError('Funcionário não encontrado ou ainda ativo', 400);
    }

    await db.beginTransaction();

    try {
      // 1. Excluir horários
      await db.query(
        'DELETE FROM HORARIO_TRABALHO WHERE id_funcionario = ?',
        [idFuncionario]
      );

      // 2. Excluir registros de ponto
      await db.query(
        'DELETE FROM REGISTRO_PONTO WHERE id_funcionario = ?',
        [idFuncionario]
      );

      // 3. Excluir funcionário
      await db.query(
        'DELETE FROM FUNCIONARIO WHERE id = ?',
        [idFuncionario]
      );

      // 4. Excluir usuário
      await db.query(
        'DELETE FROM USUARIO WHERE id = ?',
        [funcionario.id_usuario]
      );

      await db.commit();

      return { message: 'Funcionário excluído com sucesso' };
    } catch (err) {
      await db.rollback();
      throw err;
    }
  }
}



// Exporta a classe para ser usada em controllers
module.exports = AdminService;
