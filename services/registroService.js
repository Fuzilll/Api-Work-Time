// Importa a configuração do banco de dados
const db = require('../config/db');
// Importa o erro personalizado para tratamento de exceções
const { AppError } = require('../errors');
const CloudinaryService = require('./CloudinaryService');
const EmailService = require('./emailService');

class RegistroService {
// Método refatorado para cadastrar um novo registro de ponto usando ID do usuário
static async cadastrarRegistro(dados) {
  try {
    const {
      id_funcionario,  
      tipo,
      foto_url,
      foto,
      latitude,
      longitude,
      precisao_geolocalizacao,
      dispositivo
    } = dados;

    // Validação dos dados
    if (!id_funcionario || !tipo) {
      throw new AppError('ID do usuário e tipo de registro são obrigatórios', 400);
    }

    // Busca informações do usuário e funcionário
    const [usuario] = await db.query(
      `SELECT 
        u.id as id_usuario,
        u.nome, 
        u.email,
        f.id as id_funcionario,
        e.nome as empresa_nome,
        e.id as id_empresa
      FROM USUARIO u
      LEFT JOIN FUNCIONARIO f ON f.id_usuario = u.id
      LEFT JOIN EMPRESA e ON f.id_empresa = e.id
      WHERE u.id = ?`, 
      [id_funcionario]
    );

    if (!usuario || !id_funcionario) {
      throw new AppError('Usuário não é um funcionário válido ou não encontrado', 404);
    }

    // Processamento da foto
    let fotoUrl = foto_url || '';
    if (!fotoUrl && foto) {
      const uploadResult = await CloudinaryService.uploadImage(foto, {
        public_id: `ponto_${usuario.id_funcionario}_${Date.now()}`,
        folder: 'pontos',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      fotoUrl = uploadResult.secure_url;
    }

    // Registra no banco de dados usando a procedure
    const [resultados] = await db.query(
      `CALL registrarPonto(?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.id_usuario,  // Passando o ID do usuário para a procedure
        tipo,
        fotoUrl,
        latitude,
        longitude,
        precisao_geolocalizacao,
        dispositivo
      ]
    );

    // Envio de email assíncrono e não bloqueante usando dados do usuário
    if (process.env.EMAIL_ENABLED === 'true' && usuario.email) {
      this.enviarEmailConfirmacao(usuario, tipo, dispositivo, fotoUrl).catch(error => {
        console.error('Falha no envio de email:', error);
      });
    }

    return {
      success: true,
      data: {
        id_funcionario: usuario.id_funcionario,
        id_usuario: usuario.id_usuario,
        tipo,
        data_hora: new Date(),
        foto_url: fotoUrl || null,
        latitude,
        longitude,
        dispositivo
      },
      message: 'Ponto registrado com sucesso'
    };

  } catch (error) {
    console.error('Erro no cadastro de registro:', error);
    throw error instanceof AppError ? error : new AppError('Erro ao registrar ponto', 500);
  }
}

// Método refatorado para enviar email de confirmação usando dados do usuário
static async enviarEmailConfirmacao(usuario, tipo, dispositivo, fotoUrl) {
  const emailData = {
    nome: usuario.nome,
    tipo: tipo,
    dataHora: new Date(),
    dispositivo: dispositivo,
    fotoUrl: fotoUrl,
    empresa: usuario.empresa_nome,
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
  };

  await EmailService.enviarEmailRegistroPonto(usuario.email, emailData);
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

