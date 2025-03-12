
// usuarioController.js - Controlador responsável pelos usuários
const db = require('../config/db');

// Cadastra um novo usuário
exports.cadastrarUsuario = (req, res) => {
    const { nome, email, senha } = req.body;
    console.log('Cadastro de usuário:', req.body);

    const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
    db.query(sql, [nome, email, senha], (err) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário cadastrado com sucesso!' });
    });
};

// Realiza login
exports.login = (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login:', req.body);

    const sql = 'SELECT * FROM usuarios WHERE email = ? AND senha = ?';
    db.query(sql, [email, senha], (err, results) => {
        if (err) {
            console.error('Erro no login:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (results.length > 0) {
            console.log('Login realizado com sucesso!', results[0]);
            res.json({ message: 'Login realizado com sucesso!', usuario: results[0] });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos!' });
        }
    });
};