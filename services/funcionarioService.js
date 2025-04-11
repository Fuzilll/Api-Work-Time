// Importação do módulo de configuração do banco de dados e do erro personalizado.
const db = require('../config/db'); 
const { AppError } = require('../errors');

// A classe 'FuncionarioService' é responsável pela lógica de negócios relacionada aos funcionários,
// realizando operações no banco de dados como consulta de perfil, histórico de pontos, solicitações de alteração, etc.
class FuncionarioService {

  // Método assíncrono para obter o perfil de um funcionário
  // Contextualização: Este método busca as informações do perfil do funcionário com base no ID do funcionário.
  // Ele retorna dados como nome, email, cargo, e dados da empresa associada.
  static async obterPerfil(idFuncionario) {
    // Consulta SQL para buscar as informações do funcionário no banco de dados
    const [funcionario] = await db.query(
      `SELECT 
        u.id, u.nome, u.email, u.foto_perfil_url,
        f.registro_emp, f.funcao, f.departamento, 
        f.data_admissao, f.tipo_contrato,
        e.nome AS empresa_nome, e.id AS id_empresa
      FROM USUARIO u
      JOIN FUNCIONARIO f ON u.id = f.id_usuario
      JOIN EMPRESA e ON f.id_empresa = e.id
      WHERE u.id = ?`, // Parâmetro para buscar o ID do funcionário
      [idFuncionario]
    );

    // Verificação de erro: se o funcionário não for encontrado, lança um erro personalizado
    if (!funcionario) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Retorna os dados do funcionário, caso encontrado
    return funcionario;
  }

  // Método assíncrono para listar o histórico de pontos do funcionário
  // Contextualização: Esse método retorna os registros de ponto do funcionário, com possibilidade de filtragem por data e tipo.
  static async listarHistoricoPontos(idFuncionario, filtros = {}) {
    // Desestruturação dos filtros (dataInicio, dataFim, tipo)
    const { dataInicio, dataFim, tipo } = filtros;
    let sql = `
      SELECT 
        id, tipo, data_hora, status, 
        latitude, longitude, endereco_registro
      FROM REGISTRO_PONTO 
      WHERE id_funcionario = ?`; // Filtro básico para o ID do funcionário
    const params = [idFuncionario];

    // Adiciona filtro para 'dataInicio' se for fornecido
    if (dataInicio) {
      sql += ' AND DATE(data_hora) >= ?';
      params.push(dataInicio); // Adiciona o valor do filtro de data de início
    }

    // Adiciona filtro para 'dataFim' se for fornecido
    if (dataFim) {
      sql += ' AND DATE(data_hora) <= ?';
      params.push(dataFim); // Adiciona o valor do filtro de data de fim
    }

    // Adiciona filtro para 'tipo' se for fornecido
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo); // Adiciona o valor do filtro de tipo
    }

    // Ordena os registros por data de forma decrescente
    sql += ' ORDER BY data_hora DESC';

    // Executa a consulta SQL com os parâmetros fornecidos
    return db.query(sql, params);
  }

  // Método assíncrono para solicitar alteração de ponto
  // Contextualização: Este método permite que o funcionário solicite alteração em um registro de ponto.
  static async solicitarAlteracaoPonto(idFuncionario, dados) {
    // Desestruturação dos dados da solicitação
    const { id_registro, tipo_solicitacao, motivo } = dados;

    // Consulta para verificar se o registro de ponto realmente pertence ao funcionário
    const [registro] = await db.query(
      `SELECT id FROM REGISTRO_PONTO 
      WHERE id = ? AND id_funcionario = ?`, // Verifica o registro do ponto do funcionário
      [id_registro, idFuncionario]
    );

    // Caso o registro não seja encontrado ou não pertença ao funcionário, lança um erro
    if (!registro) {
      throw new AppError('Registro de ponto não encontrado ou não pertence ao funcionário', 404);
    }

    // Insere uma nova solicitação de alteração de ponto na tabela 'SOLICITACAO_ALTERACAO'
    const [result] = await db.query(
      `INSERT INTO SOLICITACAO_ALTERACAO (
        id_registro, id_funcionario, 
        tipo_solicitacao, motivo, status
      ) VALUES (?, ?, ?, ?, 'Pendente')`, // A solicitação começa com status 'Pendente'
      [id_registro, idFuncionario, tipo_solicitacao, motivo]
    );

    // Atualiza o status do registro de ponto para 'Pendente'
    await db.query(
      `UPDATE REGISTRO_PONTO 
      SET status = 'Pendente' 
      WHERE id = ?`, // O status do ponto também se torna 'Pendente'
      [id_registro]
    );

    // Retorna o ID da solicitação de alteração criada e o status
    return {
      id_solicitacao: result.insertId,
      status: 'Pendente'
    };
  }

  // Método assíncrono para listar todas as solicitações de alteração de ponto de um funcionário
  // Contextualização: Esse método retorna todas as solicitações de alteração feitas por um funcionário, ordenadas por data.
  static async listarSolicitacoes(idFuncionario) {
    // Consulta SQL para listar as solicitações de alteração feitas pelo funcionário
    return db.query(
      `SELECT 
        s.id, s.tipo_solicitacao, s.motivo, 
        s.data_solicitacao, s.status,
        r.tipo AS tipo_registro, r.data_hora
      FROM SOLICITACAO_ALTERACAO s
      JOIN REGISTRO_PONTO r ON s.id_registro = r.id
      WHERE s.id_funcionario = ?  // Filtro pelo ID do funcionário
      ORDER BY s.data_solicitacao DESC`, // Ordena pela data da solicitação
      [idFuncionario]
    );
  }
}

// Exporta o serviço para que seja utilizado em outras partes da aplicação
module.exports = FuncionarioService;
