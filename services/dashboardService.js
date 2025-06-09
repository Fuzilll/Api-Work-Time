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
    console.log('[DASHBOARD SERVICE] Iniciando obterRegistrosRecentes para empresa:', idEmpresa);

    // 1. Verificar se a empresa existe
    console.log('[DASHBOARD SERVICE] Verificando existência da empresa...');
    const [empresa] = await db.query('SELECT id FROM EMPRESA WHERE id = ?', [idEmpresa]);
    if (!empresa || empresa.length === 0) {
      console.error('[DASHBOARD SERVICE] Empresa não encontrada');
      throw new AppError(`Empresa com ID ${idEmpresa} não encontrada`, 404);
    }
    console.log('[DASHBOARD SERVICE] Empresa validada');

    // 2. Verificar se existem funcionários na empresa
    console.log('[DASHBOARD SERVICE] Verificando funcionários da empresa...');
    const [funcionarios] = await db.query('SELECT id FROM FUNCIONARIO WHERE id_empresa = ?', [idEmpresa]);
    if (!funcionarios || funcionarios.length === 0) {
      console.log(`[DASHBOARD SERVICE] Nenhum funcionário encontrado para empresa ${idEmpresa}`);
      return [];
    }
    console.log(`[DASHBOARD SERVICE] ${funcionarios.length} funcionários encontrados`);

    // 3. Buscar registros de ponto
    const query = `
      SELECT 
        u.nome AS usuario,
        rp.id,
        rp.data_hora,
        rp.tipo,
        rp.status,
        rp.justificativa,
        rp.id AS registro_id,
        rp.foto_url,
        u.foto_perfil_url AS foto_perfil
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?
      ORDER BY rp.data_hora DESC
      LIMIT 10;
    `;

    console.log('[DASHBOARD SERVICE] Executando query:', query.replace(/\s+/g, ' ').trim());
    
    const resultado = await db.query(query, [idEmpresa]);
    console.log('[DASHBOARD SERVICE] Resultado bruto da query:', resultado);

    // Tratamento universal do resultado
    let registros = [];

    if (Array.isArray(resultado)) {
      if (resultado.length > 0 && Array.isArray(resultado[0])) {
        console.log('[DASHBOARD SERVICE] Resultado no formato [[registros], metadata]');
        registros = resultado[0];
      } else {
        console.log('[DASHBOARD SERVICE] Resultado no formato [registros] direto');
        registros = resultado;
      }
    } else if (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) {
      console.log('[DASHBOARD SERVICE] Resultado no formato de objeto único');
      registros = [resultado];
    }

    // Filtra valores nulos/undefined
    registros = registros.filter(Boolean);
    console.log('[DASHBOARD SERVICE] Registros após filtro:', registros);

    // Log detalhado da estrutura dos dados
    if (registros.length > 0) {
      console.log('[DASHBOARD SERVICE] Campos disponíveis no primeiro registro:', Object.keys(registros[0]));
      console.log('[DASHBOARD SERVICE] Exemplo de registro completo:', registros[0]);
      
      // Verificar URLs de imagem
      registros.forEach((reg, index) => {
        console.log(`[DASHBOARD SERVICE] Registro ${index + 1} - Dados de imagem:`, {
          foto_url: reg.foto_url,
          foto_perfil: reg.foto_perfil,
          possuiFotoUrl: !!reg.foto_url,
          possuiFotoPerfil: !!reg.foto_perfil,
          tipoFotoUrl: typeof reg.foto_url,
          tipoFotoPerfil: typeof reg.foto_perfil
        });
      });
    }

    if (registros.length === 0) {
      console.log(`[DASHBOARD SERVICE] Nenhum registro de ponto encontrado para empresa ${idEmpresa}`);
      return [];
    }

    // Mapear para o formato final
    const registrosFormatados = registros.map(reg => {
      // Prioriza foto_url do registro, depois foto_perfil do usuário
      const foto = reg.foto_url || reg.foto_perfil || null;
      
      console.log(`[DASHBOARD SERVICE] Processando registro ${reg.id} - Foto selecionada:`, foto);

      return {
        id: reg.id,
        nomeFuncionario: reg.usuario || 'N/A',
        dataHora: reg.data_hora ? new Date(reg.data_hora).toISOString() : null,
        tipo: reg.tipo || 'N/A',
        status: reg.status || 'Pendente',
        justificativa: reg.justificativa || null,
        registro_id: reg.registro_id || null,
        foto_url: reg.foto_url || null,
        foto_perfil: reg.foto_perfil || null,
        foto: foto  // Campo unificado para o frontend
      };
    });

    console.log('[DASHBOARD SERVICE] Registros formatados para retorno:', registrosFormatados);
    return registrosFormatados;

  } catch (error) {
    console.error('[DASHBOARD SERVICE] Erro em obterRegistrosRecentes:', {
      message: error.message,
      stack: error.stack,
      query: error.sql,
      parameters: error.values,
      timestamp: new Date().toISOString()
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
