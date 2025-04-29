const db = require('../config/db');
const { AppError } = require('../errors');
const geolib = require('geolib');
const { DateTime } = require('luxon');

class FuncionarioService {
  static async carregarDashboard(idUsuario) {
    try {
      const [funcionario] = await db.query(
        `SELECT f.id FROM FUNCIONARIO f WHERE f.id_usuario = ?`,
        [idUsuario]
      );

      if (!funcionario || funcionario.length === 0) {
        throw new AppError('Funcionário não encontrado', 404);
      }

      const idFuncionario = funcionario.id;
      const hoje = DateTime.now().toUTC().toISODate();

      console.log('id do Funcionario:', idFuncionario)
      const [resumo, pontosHoje, ultimosPontos] = await Promise.all([
        this.obterResumoPontos(idFuncionario),
        this.listarPontos(idFuncionario, { dataInicio: hoje, dataFim: hoje }),
        this.listarPontos(idFuncionario, { limit: 5 })
      ]);
      console.log('Data hoje (Luxon):', DateTime.now().toISODate());
      console.log('Data no banco:', await db.query(`SELECT DATE(data_hora) FROM REGISTRO_PONTO LIMIT 1`));
      return {
        resumo,
        pontosHoje,
        ultimosPontos
      };
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      throw new AppError('Erro ao carregar dashboard', 500);
    }
  }

  /**
   * Solicita alteração em um registro de ponto
   * @param {number} idFuncionario - ID do funcionário
   * @param {number} idRegistroPonto - ID do registro de ponto
   * @param {string} motivo - Motivo da alteração
   * @param {string|null} novoTipo - Novo tipo de ponto (opcional)
   * @param {string|null} novaDataHora - Nova data/hora (opcional)
   * @returns {Promise<Object>} Dados da solicitação criada
   * @throws {AppError} Em caso de erro na solicitação
   */
  static async solicitarAlteracaoPonto(
    idFuncionario,
    idRegistroPonto,
    motivo,
    novoTipo = null,
    novaDataHora = null,
    transaction = null
  ) {
    const connection = transaction || await db.getConnection();

    try {
      console.log('[PontoService] Iniciando processo de alteração', {
        funcionario: idFuncionario,
        registro: idRegistroPonto,
        tipoAlteracao: novoTipo ? 'Correcao' : 'Justificativa'
      });

      // 1. Verificar integridade do registro de ponto
      const ponto = await this.verificarPontoDoFuncionario(idRegistroPonto, idFuncionario, connection);

      // 2. Verificar se já existe solicitação pendente
      const solicitacaoExistente = await this.verificarSolicitacaoPendente(idRegistroPonto, connection);
      if (solicitacaoExistente) {
        throw new AppError('Já existe uma solicitação pendente para este registro', 400);
      }

      // 3. Obter admin responsável
      const adminResponsavel = await this.obterAdminResponsavel(idFuncionario, connection);
      if (!adminResponsavel) {
        throw new AppError('Nenhum administrador disponível para aprovar esta solicitação', 404);
      }

      // 4. Determinar tipo de solicitação
      const tipoSolicitacao = novoTipo || novaDataHora ? 'Correcao' : 'Justificativa';

      // 5. Criar solicitação no banco de dados
      const solicitacao = await this.criarSolicitacao(
        idRegistroPonto,
        idFuncionario,
        tipoSolicitacao,
        motivo,
        adminResponsavel.id,
        connection
      );

      // 6. Atualizar status do ponto
      await this.atualizarStatusPonto(idRegistroPonto, 'Em Revisão', connection);

      // 7. Registrar log de auditoria
      await this.registrarLogAuditoria(
        idFuncionario,
        'Solicitação de Alteração',
        `Solicitação ID ${solicitacao.id} para o ponto ${idRegistroPonto}`,
        connection
      );

      if (!transaction) {
        await connection.commit();
      }

      console.log('[PontoService] Solicitação criada com sucesso', {
        solicitacaoId: solicitacao.id
      });

      return solicitacao;

    } catch (error) {
      if (!transaction) {
        await connection.rollback();
      }
      console.error('[PontoService] Erro no processo:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      if (!transaction) {
        connection.release();
      }
    }
  }

  // Métodos auxiliares do Service
  static async verificarSolicitacaoPendente(idRegistroPonto, connection) {
    const [solicitacoes] = await connection.query(
      `SELECT id FROM SOLICITACAO_ALTERACAO 
         WHERE id_registro = ? AND status = 'Pendente' LIMIT 1`,
      [idRegistroPonto]
    );
    return solicitacoes.length > 0 ? solicitacoes[0] : null;
  }

  static async obterAdminResponsavel(idFuncionario, connection) {
    const [admins] = await connection.query(
      `SELECT a.id 
         FROM ADMIN a
         JOIN FUNCIONARIO f ON a.id_empresa = f.id_empresa
         WHERE f.id = ? LIMIT 1`,
      [idFuncionario]
    );
    return admins.length > 0 ? admins[0] : null;
  }

  static async criarSolicitacao(idRegistro, idFuncionario, tipo, motivo, idAdmin, connection) {
    const [result] = await connection.query(
      `INSERT INTO SOLICITACAO_ALTERACAO 
         (id_registro, id_funcionario, tipo_solicitacao, motivo, id_admin_responsavel)
         VALUES (?, ?, ?, ?, ?)`,
      [idRegistro, idFuncionario, tipo, motivo, idAdmin]
    );

    const [solicitacao] = await connection.query(
      `SELECT * FROM SOLICITACAO_ALTERACAO WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return solicitacao[0];
  }

  static async atualizarStatusPonto(idRegistro, status, connection) {
    await connection.query(
      `UPDATE REGISTRO_PONTO 
         SET status = ?
         WHERE id = ?`,
      [status, idRegistro]
    );
  }

  static async registrarLogAuditoria(idUsuario, acao, detalhe, connection) {
    await connection.query(
      `INSERT INTO LOG_AUDITORIA (id_usuario, acao, detalhe) 
         VALUES (?, ?, ?)`,
      [idUsuario, acao, detalhe]
    );
  }

  /**
   * Obtém um funcionário pelo ID do usuário
   * @param {number} idUsuario - ID do usuário
   * @returns {Promise<Object>} Objeto com dados do funcionário
   * @throws {AppError} Se o funcionário não for encontrado
   */
  static async obterFuncionarioPorUsuario(idUsuario) {
    try {
      console.log('[SERVICE] Buscando funcionário para usuário:', idUsuario);

      // Usar db.execute() em vez de db.query() para maior consistência
      const [rows] = await db.execute(
        `SELECT 
                f.id, 
                f.id_empresa, 
                f.registro_emp, 
                f.funcao,
                f.departamento,
                f.tipo_contrato,
                e.nome AS empresa_nome
             FROM FUNCIONARIO f
             JOIN EMPRESA e ON f.id_empresa = e.id
             WHERE f.id_usuario = ? LIMIT 1`,
        [idUsuario]
      );

      console.log('[SERVICE] Resultado bruto da query:', rows);

      if (!rows || rows.length === 0) {
        console.error('[SERVICE] Nenhum funcionário encontrado para usuário:', idUsuario);
        throw new AppError('Funcionário não encontrado', 404);
      }

      const funcionario = rows[0];
      console.log('[SERVICE] Funcionário formatado:', funcionario);

      return funcionario;
    } catch (error) {
      console.error('[SERVICE] Erro ao buscar funcionário:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
     * Verifica se um ponto pertence a um funcionário
     * @param {number} idRegistroPonto - ID do registro de ponto
     * @param {number} idFuncionario - ID do funcionário
     * @returns {Promise<Object>} Dados do registro de ponto
     * @throws {AppError} Se o ponto não for encontrado ou não pertencer ao funcionário
     */
  static async verificarPontoDoFuncionario(idRegistroPonto, idFuncionario) {
    try {
      console.log('[SERVICE] Verificando ponto:', { idRegistroPonto, idFuncionario });

      const [pontos] = await db.query(
        `SELECT 
                  id, 
                  tipo, 
                  data_hora,
                  status
              FROM REGISTRO_PONTO 
              WHERE id = ? AND id_funcionario = ? LIMIT 1`,
        [idRegistroPonto, idFuncionario]
      );

      if (!pontos || pontos.length === 0) {
        console.error('[SERVICE] Ponto não encontrado ou não pertence ao funcionário');
        throw new AppError('Ponto não encontrado ou não pertence ao funcionário', 404);
      }

      return pontos[0];
    } catch (error) {
      console.error('[SERVICE] Erro ao verificar ponto:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao verificar ponto', 500);
    }
  }


  static async registrarPonto(idUsuario, dados) {
    return await db.transaction(async (connection) => {
      const [funcionario] = await connection.query(
        `SELECT f.id, f.id_empresa 
         FROM FUNCIONARIO f 
         WHERE f.id_usuario = ?`,
        [idUsuario]
      );

      if (!funcionario) {
        throw new AppError('Funcionário não encontrado', 404);
      }

      const { latitude, longitude } = dados;
      if (!this.validarGeolocalizacao(latitude, longitude, funcionario.id_empresa)) {
        throw new AppError('Localização fora do raio permitido', 400);
      }

      const [result] = await connection.query(
        `INSERT INTO REGISTRO_PONTO 
         (id_funcionario, tipo, foto_url, data_hora, latitude, longitude, status) 
         VALUES (?, ?, ?, NOW(), ?, ?, 'Pendente')`,
        [funcionario.id, dados.tipo, dados.fotoUrl, latitude, longitude]
      );

      const [ponto] = await connection.query(
        `SELECT * FROM REGISTRO_PONTO WHERE id = ?`,
        [result.insertId]
      );

      return ponto[0];
    });
  }

  static async listarPontos(idFuncionario, filtros = {}) {
    const { dataInicio, dataFim, limit } = filtros;

    let sql = `
      SELECT 
        id, tipo, data_hora, status, 
        latitude, longitude, justificativa
      FROM REGISTRO_PONTO
      WHERE id_funcionario = ?
    `;

    const params = [idFuncionario];

    if (dataInicio && dataFim) {
      sql += ` AND DATE(data_hora) BETWEEN ? AND ?`;
      params.push(dataInicio, dataFim);
    }

    sql += ` ORDER BY data_hora DESC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    const [pontos] = await db.query(sql, params);
    return pontos;
  }

  static async listarHistoricoPontos(idUsuario, filtros = {}) {
    try {
      const [funcionario] = await db.query(
        `SELECT id FROM FUNCIONARIO WHERE id_usuario = ?`,
        [idUsuario]
      );

      if (!funcionario) {
        throw new AppError('Funcionário não encontrado', 404);
      }

      const { dataInicio, dataFim } = filtros;
      let sql = `
        SELECT 
          id, 
          tipo, 
          data_hora as data_ponto, 
          status,
          justificativa
        FROM REGISTRO_PONTO
        WHERE id_funcionario = ?
      `;

      const params = [funcionario.id];

      if (dataInicio && dataFim) {
        sql += ` AND data_hora >= ? AND data_hora < ?`;

        // Ajusta dataFim para o próximo dia (exclusivo)
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        const dataFimExclusivo = fim.toISOString().split('T')[0];

        params.push(dataInicio, dataFimExclusivo);
      }

      sql += ` ORDER BY data_hora DESC`;

      const resultadoQuery = await db.query(sql, params);
      console.log('Resultado da query completo:', resultadoQuery);
      console.log('Resultado da query completo:', resultadoQuery);
      return resultadoQuery;
    } catch (error) {
      console.error('Erro ao listar histórico de pontos:', error);
      throw new AppError('Erro ao listar histórico de pontos', 500);
    }
  }


  static async detalhesPonto(idPonto, idUsuario) {
    const [ponto] = await db.query(
      `SELECT 
        rp.*, 
        e.nome AS empresa_nome
       FROM REGISTRO_PONTO rp
       JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
       JOIN EMPRESA e ON f.id_empresa = e.id
       WHERE rp.id = ? AND f.id_usuario = ?`,
      [idPonto, idUsuario]
    );

    if (!ponto || ponto.length === 0) {
      throw new AppError('Ponto não encontrado', 404);
    }

    return ponto[0];
  }

  static async listarHorarios(idUsuario) {
    const [horarios] = await db.query(
      `SELECT 
        ht.dia_semana, 
        ht.hora_entrada, 
        ht.hora_saida,
        ht.intervalo_inicio,
        ht.intervalo_fim
       FROM HORARIO_TRABALHO ht
       JOIN FUNCIONARIO f ON ht.id_funcionario = f.id
       WHERE f.id_usuario = ?
       ORDER BY 
         CASE ht.dia_semana
           WHEN 'Segunda' THEN 1
           WHEN 'Terca' THEN 2
           WHEN 'Quarta' THEN 3
           WHEN 'Quinta' THEN 4
           WHEN 'Sexta' THEN 5
           WHEN 'Sabado' THEN 6
           WHEN 'Domingo' THEN 7
         END`,
      [idUsuario]
    );

    return horarios;
  }

  static async obterResumoPontos(idFuncionario) {
    const hoje = DateTime.now().toUTC().toISODate();

    console.log(`[DEBUG] Data usada na query: ${hoje}`);

    const [rows] = await db.query(
      `SELECT 
        COUNT(*) AS total_pontos,
        SUM(CASE WHEN DATE(CONVERT_TZ(data_hora, '+00:00', @@session.time_zone)) = ? THEN 1 ELSE 0 END) AS pontos_hoje,
        SUM(CASE WHEN status = 'Aprovado' THEN 1 ELSE 0 END) AS pontos_aprovados,
        SUM(CASE WHEN status = 'Pendente' THEN 1 ELSE 0 END) AS pontos_pendentes,
        SUM(CASE WHEN status = 'Rejeitado' THEN 1 ELSE 0 END) AS pontos_rejeitados
       FROM REGISTRO_PONTO
       WHERE id_funcionario = ?`,
      [hoje, idFuncionario]
    );

    console.log('[DEBUG] Resultado bruto da query:', rows);

    // Verifica se rows é um array e pega o primeiro elemento
    const resultado = Array.isArray(rows) ? rows[0] : rows;

    console.log('[DEBUG] Resultado processado:', resultado);

    // Converte os valores de string para número
    return {
      total_pontos: parseInt(resultado?.total_pontos || 0),
      pontos_hoje: parseInt(resultado?.pontos_hoje || 0),
      pontos_aprovados: parseInt(resultado?.pontos_aprovados || 0),
      pontos_pendentes: parseInt(resultado?.pontos_pendentes || 0),
      pontos_rejeitados: parseInt(resultado?.pontos_rejeitados || 0)
    };
  }

  static async validarGeolocalizacao(latitude, longitude, idEmpresa) {
    try {
      const [empresa] = await db.query(
        `SELECT latitude, longitude, raio_geolocalizacao 
       FROM EMPRESA WHERE id = ?`,
        [idEmpresa]
      );

      if (!empresa || empresa.length === 0) {
        throw new Error('Empresa não encontrada');
      }

      if (empresa.latitude === null || empresa.longitude === null) {
        // Se a empresa não tem localização definida, permitir o registro
        return true;
      }

      const localizacaoEmpresa = {
        latitude: parseFloat(empresa.latitude),
        longitude: parseFloat(empresa.longitude)
      };

      const distancia = geolib.getDistance(
        { latitude, longitude },
        localizacaoEmpresa
      );

      const raioPermitido = empresa.raio_geolocalizacao || 100; // metros
      return distancia <= raioPermitido;
    } catch (error) {
      console.error('Erro ao validar geolocalização:', error);
      throw new Error('Erro ao validar localização');
    }
  }

  // Adicione este método ao FuncionarioService
  static async carregarPerfil(idUsuario) {
    try {
      // Primeiro buscamos os dados do usuário (nome, email)
      const usuario = await db.query(`
          SELECT nome, email 
          FROM USUARIO 
          WHERE id = ?
      `, [idUsuario]);

      if (!usuario || usuario.length === 0) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Depois buscamos os dados do funcionário
      const funcionario = await db.query(`
          SELECT 
              f.registro_emp,
              f.funcao,
              f.departamento,
              f.data_admissao,
              f.tipo_contrato,
              e.nome AS empresa_nome
          FROM FUNCIONARIO f
          JOIN EMPRESA e ON f.id_empresa = e.id
          WHERE f.id_usuario = ?
      `, [idUsuario]);

      if (!funcionario || funcionario.length === 0) {
        throw new AppError('Funcionário não encontrado', 404);
      }
      console.log('Teste de funcionario e usuario Perfil', usuario, funcionario)
      // Combinamos os dados
      return {
        nome: usuario[0].nome,
        email: usuario[0].email,
        ...funcionario[0]
      };
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      throw error;
    }
  }
}

module.exports = FuncionarioService;
