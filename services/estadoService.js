const db = require('../config/db');
const { AppError } = require('../errors');

class EstadoService {
  static async listarEstados() {
    try {
      const query = `
        SELECT id, sigla, nome
        FROM ESTADO
        ORDER BY nome ASC
      `;

      const estados = await db.query(query); // Aqui já vem como array direto

      if (!Array.isArray(estados)) {
        console.warn("Resultado inesperado ao consultar estados:", estados);
        return [];
      }

      console.log("📋 Estados carregados:");
      estados.forEach((estado, index) => {
        console.log(`${index + 1}. ${estado.nome} (${estado.sigla}) - ID: ${estado.id}`);
      });

      return estados;
    } catch (err) {
      console.error("❌ Erro ao listar estados:", err);
      if (err.code) {
        throw new AppError(`Erro no banco de dados: ${err.code} - ${err.sqlMessage || ''}`, 500);
      }
      throw new AppError('Erro interno ao listar estados', 500);
    }
  }
}

module.exports = EstadoService;
