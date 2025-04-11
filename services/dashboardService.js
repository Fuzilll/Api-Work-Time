const db = require('../config/db');
const { AppError } = require('../errors');

async function obterResumoEmpresa(idEmpresa) {
  try {
    console.log("📌 ID da empresa para resumo:", idEmpresa);

    const query = `
      SELECT 
        COUNT(*) AS totalFuncionarios,
        SUM(CASE WHEN LOWER(TRIM(u.status)) = 'ativo' THEN 1 ELSE 0 END) AS funcionariosAtivos,
        SUM(CASE WHEN LOWER(TRIM(u.status)) = 'inativo' THEN 1 ELSE 0 END) AS funcionariosInativos
      FROM FUNCIONARIO f
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
    `;

    const rows = await db.query(query, [idEmpresa]); // já está certo

    console.log("🧪 Resultado bruto do SELECT resumo:", rows);
    const resultado = rows[0] || {};

    console.log("✅ Resultado totalFuncionarios:", resultado.totalFuncionarios);

    return {
      totalFuncionarios: Number(resultado.totalFuncionarios) || 0,
      funcionariosAtivos: Number(resultado.funcionariosAtivos) || 0,
      funcionariosInativos: Number(resultado.funcionariosInativos) || 0
    };
  } catch (error) {
    console.error('❌ Erro ao obter resumo da empresa:', error);
    throw new AppError('Erro ao carregar resumo de funcionários', 500);
  }
}


async function obterRelatorioPontos(idEmpresa) {
  try {
    const query = `
      SELECT 
        COUNT(*) as totalPontos,
        SUM(CASE WHEN rp.status = 'Aprovado' THEN 1 ELSE 0 END) as pontosAprovados,
        SUM(CASE WHEN rp.status = 'Pendente' THEN 1 ELSE 0 END) as pontosPendentes
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      WHERE f.id_empresa = ?`;

    const [result] = await db.query(query, [idEmpresa]);

    if (!result) {
      throw new Error('Nenhum dado encontrado para o relatório');
    }

    return {
      totalPontos: result.totalPontos || 0,
      pontosAprovados: result.pontosAprovados || 0,
      pontosPendentes: result.pontosPendentes || 0
    };
  } catch (error) {
    console.error('Erro em obterRelatorioPontos:', error);
    throw new AppError('Falha ao gerar relatório de pontos', 500);
  }
}

async function obterRegistrosRecentes(idEmpresa) {
  try {
    // 1. Verificar se a empresa existe
    const [empresa] = await db.query('SELECT id FROM EMPRESA WHERE id = ?', [idEmpresa]);
    if (!empresa || empresa.length === 0) {
      throw new AppError(`Empresa com ID ${idEmpresa} não encontrada`, 404);
    }

    // 2. Verificar se existem funcionários na empresa
    const [funcionarios] = await db.query('SELECT id FROM FUNCIONARIO WHERE id_empresa = ?', [idEmpresa]);
    if (!funcionarios || funcionarios.length === 0) {
      console.log(`Nenhum funcionário encontrado para empresa ${idEmpresa}`);
      return [];
    }

    // 3. Buscar registros de ponto
    const query = `
      SELECT 
        u.nome AS usuario,
        rp.data_hora,
        rp.tipo,
        rp.status,
        rp.justificativa,
        rp.id AS registro_id
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
      ORDER BY rp.data_hora DESC
      LIMIT 10;
    `;

    const resultado = await db.query(query, [idEmpresa]);

    // DEBUG: Mostra o resultado bruto
    console.log('Resultado bruto:', resultado);

    // Tratamento universal do resultado
    let registros = [];

    if (Array.isArray(resultado)) {
      // Se for array (pode ser array de arrays ou array de objetos)
      if (resultado.length > 0 && Array.isArray(resultado[0])) {
        // Caso [[registros], metadata] (formato comum do mysql2)
        registros = resultado[0];
      } else {
        // Caso [registros] direto
        registros = resultado;
      }
    } else if (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) {
      // Se for um objeto único (como no seu exemplo)
      registros = [resultado]; // Transforma em array
    }

    // Filtra valores nulos/undefined
    registros = registros.filter(Boolean);

    // DEBUG: Mostra os registros processados
    console.log('Registros processados:', registros);
    console.log('É array?', Array.isArray(registros));
    console.log('Quantidade:', registros.length);

    if (registros.length === 0) {
      console.log(`Nenhum registro de ponto encontrado para empresa ${idEmpresa}`);
      return [];
    }
    return registros.map(reg => ({
      nomeFuncionario: reg.usuario || 'N/A',
      dataHora: reg.data_hora ? new Date(reg.data_hora).toISOString() : null,
      tipo: reg.tipo || 'N/A',
      status: reg.status || 'Pendente',
      justificativa: reg.justificativa || null,
      registro_id: reg.registro_id || null
    }));
  } catch (error) {
    console.error('Erro em obterRegistrosRecentes:', {
      message: error.message,
      stack: error.stack,
      query: error.sql,
      parameters: error.values
    });
    throw new AppError('Erro ao carregar registros recentes: ' + error.message, 500);
  }
}


async function atualizarStatusPonto(id, status, observacao, idAdmin, idEmpresa) {
  try {
    const verificaQuery = `
      SELECT rp.id 
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      WHERE rp.id = ?
      AND f.id_empresa = ?
    `;
    const [registro] = await db.query(verificaQuery, [id, idEmpresa]);
    if (!registro || registro.length === 0) {
      throw new AppError('Registro não encontrado ou não pertence à sua empresa', 404);
    }

    const updateQuery = `
      UPDATE REGISTRO_PONTO 
      SET 
        status = ?,
        id_aprovador = ?,
        justificativa = ?
      WHERE id = ?
    `;
    await db.query(updateQuery, [status, idAdmin, observacao, id]);
  } catch (error) {
    throw error;
  }
}

async function obterEstatisticasMensais(idEmpresa, ano) {
  try {
    const query = `
      SELECT 
        MONTH(rp.data_hora) AS mes,
        COUNT(*) AS total_registros,
        SUM(CASE WHEN rp.status = 'Aprovado' THEN 1 ELSE 0 END) AS aprovados,
        SUM(CASE WHEN rp.status = 'Pendente' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN rp.status = 'Rejeitado' THEN 1 ELSE 0 END) AS rejeitados,
        COUNT(DISTINCT rp.id_funcionario) AS funcionarios_ativos
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      WHERE f.id_empresa = ?
      AND YEAR(rp.data_hora) = ?
      GROUP BY MONTH(rp.data_hora)
      ORDER BY mes
    `;
    const [dados] = await db.query(query, [idEmpresa, ano || new Date().getFullYear()]);
    return dados;
  } catch (error) {
    throw new AppError('Erro ao carregar estatísticas', 500);
  }
}

async function obterFuncionariosComPendentes(idEmpresa) {
  try {
    const query = `
      SELECT 
        u.nome AS funcionario,
        COUNT(rp.id) AS pendentes,
        f.funcao,
        d.nome AS departamento
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      LEFT JOIN DEPARTAMENTO d ON f.id_departamento = d.id
      WHERE f.id_empresa = ?
      AND rp.status = 'Pendente'
      GROUP BY rp.id_funcionario
      ORDER BY pendentes DESC
      LIMIT 5
    `;
    const [funcionarios] = await db.query(query, [idEmpresa]);
    return funcionarios;
  } catch (error) {
    throw new AppError('Erro ao carregar funcionários com pendências', 500);
  }
}

module.exports = {
  obterResumoEmpresa,
  obterRelatorioPontos,
  obterRegistrosRecentes,
  atualizarStatusPonto,
  obterEstatisticasMensais,
  obterFuncionariosComPendentes
};
