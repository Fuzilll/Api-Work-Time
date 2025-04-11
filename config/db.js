// Importa o módulo mysql2 com suporte a Promises
const mysql = require('mysql2/promise');

// Carrega variáveis de ambiente a partir de um arquivo .env
require('dotenv').config();

// Classe responsável por encapsular toda a lógica de conexão e operação com o banco de dados
class Database {
    constructor() {
        // Cria um pool de conexões com as configurações definidas nas variáveis de ambiente
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,           // Endereço do servidor do banco de dados
            user: process.env.DB_USER,           // Nome do usuário do banco
            password: process.env.DB_PASSWORD,   // Senha do usuário
            database: process.env.DB_DATABASE,   // Nome do banco de dados a ser utilizado
            waitForConnections: true,            // Espera pela liberação de conexões se todas estiverem em uso
            connectionLimit: 10,                 // Número máximo de conexões simultâneas
            queueLimit: 0,                       // Sem limite de requisições na fila
            timezone: 'Z',                     // Define o fuso horário para Z (padroniza datas)
            charset: 'utf8mb4',
            supportBigNumbers: true,             // Suporte a valores numéricos grandes (BigInt)
            bigNumberStrings: true               // Retorna BigInt como string para evitar perda de precisão
        });

        // Testa a conexão assim que a instância é criada
        this.testConnection();
    }

    /**
     * Método privado usado para verificar se a conexão com o banco foi estabelecida corretamente.
     * Caso não consiga conectar, o processo é encerrado com erro.
     */
    async testConnection() {
        try {
            const conn = await this.pool.getConnection(); // Tenta obter uma conexão do pool
            console.log('✅ Conectado ao MySQL');         // Conexão bem-sucedida
            conn.release();                               // Libera a conexão de volta para o pool
        } catch (err) {
            console.error('❌ Erro ao conectar no MySQL:', err.message); // Loga o erro
            process.exit(1);                                            // Encerra a aplicação com erro
        }
    }

    /**
     * Método genérico para realizar consultas (SELECT) no banco de dados.
     * @param {string} sql - A query SQL com placeholders (?)
     * @param {Array} params - Os parâmetros para substituir os placeholders
     * @param {object|null} conn - Conexão opcional (para uso em transações)
     * @returns {Promise<Array>} - Resultado da consulta (array de linhas)
     */
/**
 *     async query(sql, params, conn = null) {
        const connection = conn || await this.pool.getConnection(); // Usa a conexão fornecida ou pega uma nova do pool
        try {
            const [rows] = await connection.query(sql, params);     // Executa a consulta
            return rows;                                            // Retorna os resultados
        } finally {
            if (!conn) connection.release(); // Libera a conexão se ela foi criada aqui (evita liberar em transações)
        }
    }
 */
    async query(sql, params) {
        try {
            const [rows] = await this.pool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Erro na query:', sql, params);
            console.error('Detalhes do erro:', error);
            throw error;
        }
    }

    /**
     * Método genérico para executar comandos que alteram dados (INSERT, UPDATE, DELETE).
     * @param {string} sql - A query SQL com placeholders (?)
     * @param {Array} params - Os parâmetros para substituir os placeholders
     * @param {object|null} conn - Conexão opcional (para uso em transações)
     * @returns {Promise<object>} - Resultado da execução (inclui insertId, affectedRows, etc.)
     */
    async execute(sql, params, conn = null) {
        const connection = conn || await this.pool.getConnection();
        try {
            const [result] = await connection.execute(sql, params); // Executa o comando
            return result;                                          // Retorna metadados do resultado
        } finally {
            if (!conn) connection.release();
        }
    }

    /**
     * Método para realizar transações no banco de dados.
     * @param {function} callback - Função assíncrona contendo as operações a serem feitas dentro da transação
     * @returns {Promise<any>} - Resultado retornado pela função callback
     */
    async transaction(callback) {
        const conn = await this.pool.getConnection(); // Pega uma nova conexão do pool
        try {
            await conn.beginTransaction();           // Inicia a transação
            const result = await callback(conn);     // Executa as operações passando a conexão
            await conn.commit();                     // Comita se tudo deu certo
            return result;
        } catch (err) {
            await conn.rollback();                   // Faz rollback em caso de erro
            throw err;                               // Propaga o erro para ser tratado externamente
        } finally {
            conn.release();                          // Libera a conexão independente do resultado
        }
    }
}

// Exporta uma instância única da classe Database (Singleton)
// Assim, ela pode ser reutilizada em todo o projeto mantendo um pool de conexões único
module.exports = new Database();
