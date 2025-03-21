const db = require('../config/db');

exports.cadastrarEmpresa = (req, res) => {
    const { nome, cnpj, cidade, cep, rua, numero, estado, ramo_de_atuacao, email, id_it_support } = req.body;

    const sql = 'INSERT INTO EMPRESA (nome, cnpj, cidade, cep, rua, numero, estado, ramo_de_atuacao, email, id_it_support) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [nome, cnpj, cidade, cep, rua, numero, estado, ramo_de_atuacao, email, id_it_support], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Empresa cadastrada com sucesso!' });
    });
};

exports.cadastrarAdmin = (req, res) => {
    const { nome, email, senha, id_empresa, id_perfil_acesso } = req.body;

    const sql = 'INSERT INTO ADMIN (nome, email, senha, id_empresa, id_perfil_acesso) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [nome, email, senha, id_empresa, id_perfil_acesso], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Administrador cadastrado com sucesso!' });
    });
};
