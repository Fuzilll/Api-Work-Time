// Importa a configuração do banco de dados
const db = require('../config/db'); 
// Importa o erro personalizado para tratamento de exceções
const { AppError } = require('../errors');
const CloudinaryService = require('./CloudinaryService');

class RegistroService {
  // Método para cadastrar um novo registro de ponto
  static async cadastrarRegistro(dados) {
    try {
      const { 
        id_funcionario, 
        tipo, 
        foto, 
        latitude, 
        longitude, 
        precisao_geolocalizacao, 
        dispositivo 
      } = dados;

      // Verificar se o funcionário existe
      const [funcionario] = await db.query(
        'SELECT id, id_empresa FROM FUNCIONARIO WHERE id = ?',
        [id_funcionario]
      );

      if (!funcionario) {
        throw new AppError('Funcionário não encontrado', 404);
      }

      // Verificar configurações da empresa
      const [config] = await db.query(
        `SELECT requer_foto, requer_geolocalizacao 
         FROM CONFIGURACAO_PONTO 
         WHERE id_empresa = ?`,
        [funcionario.id_empresa]
      );

      // Validações
      if (config) {
        if (config.requer_foto && !foto) {
          throw new AppError('Foto é obrigatória para registro de ponto', 400);
        }
        
        if (config.requer_geolocalizacao && (!latitude || !longitude)) {
          throw new AppError('Geolocalização é obrigatória para registro de ponto', 400);
        }
      }

      // Fazer upload da foto para o Cloudinary
      let fotoUrl = '';
      if (foto) {
        const uploadResult = await CloudinaryService.uploadImage(foto, {
          public_id: `ponto_${id_funcionario}_${Date.now()}`,
          folder: 'pontos'
        });
        fotoUrl = uploadResult.secure_url;
      }

      // Inserir registro no banco
      const [result] = await db.query(
        `INSERT INTO REGISTRO_PONTO (
          id_funcionario, tipo, foto_url, latitude, longitude,
          precisao_geolocalizacao, dispositivo, hash_registro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, SHA2(CONCAT(?, ?, ?, ?, ?, NOW()), 256))`,
        [
          id_funcionario, 
          tipo, 
          fotoUrl, 
          latitude, 
          longitude,
          precisao_geolocalizacao, 
          dispositivo,
          id_funcionario, 
          tipo, 
          fotoUrl, 
          latitude, 
          longitude
        ]
      );

      return {
        id: result.insertId,
        status: 'Pendente',
        data_hora: new Date(),
        foto_url: fotoUrl
      };

    } catch (error) {
      console.error('Erro no RegistroService.cadastrarRegistro:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Método para buscar os registros de ponto de um funcionário específico
  static async buscarRegistrosFuncionario(idFuncionario) {
    // Verifica se o funcionário existe no banco de dados
    const [funcionario] = await db.query(
      'SELECT id FROM FUNCIONARIO WHERE id = ?',
      [idFuncionario] // Passa o ID do funcionário como parâmetro
    );

    // Se o funcionário não for encontrado, lança um erro com status 404
    if (!funcionario) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Retorna os registros de ponto do funcionário ordenados pela data e hora (decrescente)
    return db.query(
      `SELECT 
        rp.id, rp.tipo, rp.foto_url, rp.latitude, rp.longitude,
        rp.endereco_registro, rp.data_hora, rp.status,
        rp.precisao_geolocalizacao, rp.dispositivo
      FROM REGISTRO_PONTO rp
      WHERE rp.id_funcionario = ?
      ORDER BY rp.data_hora DESC`,
      [idFuncionario] // Passa o ID do funcionário para buscar seus registros
    );
  }

  // Método para buscar os registros de ponto de uma empresa, com filtros opcionais
  static async buscarRegistrosEmpresa(idEmpresa, filtros = {}) {
    // Desestrutura os filtros recebidos, se existirem
    const { dataInicio, dataFim, status, idFuncionario } = filtros;

    // Cria a consulta SQL base para buscar os registros
    let sql = `
      SELECT 
        rp.id, rp.tipo, rp.data_hora, rp.status,
        u.nome AS nome_funcionario, f.registro_emp
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      WHERE f.id_empresa = ?`;

    // Cria um array de parâmetros que será preenchido conforme os filtros
    const params = [idEmpresa];

    // Adiciona filtros de ID de funcionário, status e data ao SQL, caso os filtros sejam fornecidos
    if (idFuncionario) {
      sql += ' AND rp.id_funcionario = ?';
      params.push(idFuncionario);
    }

    if (status) {
      sql += ' AND rp.status = ?';
      params.push(status);
    }

    if (dataInicio && dataFim) {
      sql += ' AND DATE(rp.data_hora) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }

    // Ordena os registros pela data de registro (decrescente)
    sql += ' ORDER BY rp.data_hora DESC';

    // Executa a consulta com os parâmetros montados
    return db.query(sql, params);
  }

  // Método para buscar todos os registros de ponto com filtros
  static async buscarTodosRegistros(filtros = {}) {
    // Desestrutura os filtros recebidos, se existirem
    const { dataInicio, dataFim, status, idEmpresa, idFuncionario } = filtros;

    // Cria a consulta SQL base para buscar todos os registros de ponto
    let sql = `
      SELECT 
        rp.id, rp.tipo, rp.data_hora, rp.status,
        u.nome AS nome_funcionario, f.registro_emp,
        e.nome AS nome_empresa
      FROM REGISTRO_PONTO rp
      JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
      JOIN USUARIO u ON f.id_usuario = u.id
      JOIN EMPRESA e ON f.id_empresa = e.id
      WHERE 1=1`;  // A condição "1=1" é uma técnica para facilitar a adição de filtros

    // Cria um array de parâmetros que será preenchido conforme os filtros
    const params = [];

    // Adiciona filtros de ID de funcionário, ID da empresa, status e data ao SQL, caso os filtros sejam fornecidos
    if (idFuncionario) {
      sql += ' AND rp.id_funcionario = ?';
      params.push(idFuncionario);
    }

    if (idEmpresa) {
      sql += ' AND f.id_empresa = ?';
      params.push(idEmpresa);
    }

    if (status) {
      sql += ' AND rp.status = ?';
      params.push(status);
    }

    if (dataInicio && dataFim) {
      sql += ' AND DATE(rp.data_hora) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    }

    // Ordena os registros pela data de registro (decrescente)
    sql += ' ORDER BY rp.data_hora DESC';

    // Executa a consulta com os parâmetros montados
    return db.query(sql, params);
  }
}

// Exporta o serviço de registro para ser utilizado em outras partes da aplicação
module.exports = RegistroService;

