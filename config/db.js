// db.js - Configuração da conexão com o banco de dados MySQL
const mysql = require('mysql2');
require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

// Criação da conexão com o banco de dados
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Conecta ao banco de dados
connection.connect(err => {
    if (err) {
        console.error('Erro ao conectar no MySQL:', err.message);
        process.exit(1); // Encerra o processo em caso de erro
    }
    console.log('Conectado ao MySQL');
});

module.exports = connection;
