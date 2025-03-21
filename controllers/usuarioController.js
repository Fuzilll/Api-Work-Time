
// usuarioController.js - Controlador responsável pelos usuários
const db = require('../config/db');

exports.cadastrarUsuario = (req, res) => {
    const { nome, email, senha, nivel, id_empresa } = req.body;
    const sql = 'INSERT INTO USUARIOS (nome, email, senha, nivel, id_empresa) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [nome, email, senha, nivel, id_empresa || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const id_usuario = result.insertId;
        let tabela;
        let sqlInsert;
        let valores;

        switch (nivel) {
            case 'IT_SUPPORT':
                tabela = 'IT_SUPPORT';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email) VALUES (?, ?, ?)`;
                valores = [id_usuario, nome, email];
                break;
            case 'ADMIN':
                tabela = 'ADMIN';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email, id_empresa) VALUES (?, ?, ?, ?)`;
                valores = [id_usuario, nome, email, id_empresa];
                break;
            case 'FUNCIONARIO':
                tabela = 'FUNCIONARIO';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email, id_empresa) VALUES (?, ?, ?, ?)`;
                valores = [id_usuario, nome, email, id_empresa];
                break;
            default:
                return res.status(400).json({ error: 'Nível de usuário inválido!' });
        }

        db.query(sqlInsert, valores, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Usuário cadastrado com sucesso!' });
        });
    });
};

exports.login = (req, res) => {
    const { email, senha } = req.body;
    const sql = 'SELECT * FROM USUARIO WHERE email = ? AND senha = ?';

    db.query(sql, [email, senha], (err, results) => {
        if (err) {
            console.error('Erro no login:', err);
            return res.status(500).json({ message: 'Erro interno do servidor' });
        }

        if (results.length > 0) {
            const usuario = results[0];
            console.log('Login bem-sucedido:', usuario);

            return res.json({ 
                message: 'Login realizado com sucesso!', 
                usuario: usuario,
                nivel: usuario.nivel
            });
        } else {
            console.warn('Tentativa de login com credenciais inválidas:', email);
            return res.status(401).json({ message: 'Email ou senha inválidos!' });
        }
    });
};

/*
// Cadastra um novo usuário
exports.cadastrarUsuario = (req, res) => {
    const { nome, email, senha, nivel, id_empresa } = req.body;

    // O ID da empresa é opcional (para IT_SUPPORT, será NULL)
    const sql = 'INSERT INTO USUARIOS (nome, email, senha, nivel, id_empresa) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [nome, email, senha, nivel, id_empresa || null], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuário cadastrado com sucesso!' });
    });
};

// Realiza login Mobile
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

// Login Web 
exports.loginWeb = (req, res) => {
    const { email, senha } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE email = ? AND senha = ?';
    db.query(sql, [email, senha], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            const usuario = results[0];
            res.json({ 
                message: 'Login realizado com sucesso!', 
                nivel: usuario.nivel,
                token: "TOKEN_EXEMPLO" 
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos!' });
        }
    });
};

exports.loginWeb = (req, res) => {
    const { email, senha } = req.body;

    const sql = 'SELECT * FROM USUARIOS WHERE email = ? AND senha = ?';
    db.query(sql, [email, senha], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            const usuario = results[0];
            res.json({ 
                message: 'Login realizado!', 
                usuario: usuario,
                nivel: usuario.nivel
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos!' });
        }
    });
};

*/