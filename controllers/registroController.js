
// registroController.js - Controlador responsável pelos registros de ponto
const db = require('../config/db');

// Cadastra um novo registro de ponto
exports.cadastrarRegistro = (req, res) => {
    const { userId, latitude, longitude, fotoBase64 } = req.body;
    console.log('📥 Requisição recebida:', req.body); // Log para Insomnia

    // Verifica se o usuário existe no banco
    const verificarUsuarioSQL = 'SELECT id FROM usuarios WHERE id = ?';
    db.query(verificarUsuarioSQL, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao verificar usuário:', err.message);
            return res.status(500).json({ error: 'Erro ao verificar usuário.' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Usuário não encontrado.' });
        }

        // Insere o novo registro de ponto
        const sql = 'INSERT INTO registros_ponto (userId, latitude, longitude, fotoBase64) VALUES (?, ?, ?, ?)';
        db.query(sql, [userId, latitude, longitude, fotoBase64], (err, result) => {
            if (err) {
                console.error('Erro ao cadastrar registro de ponto:', err.message);
                return res.status(500).json({ error: 'Erro ao cadastrar registro de ponto.' });
            }
            console.log('Registro de ponto cadastrado:', result);
            res.json({ message: 'Registro de ponto cadastrado com sucesso!', id: result.insertId });
        });
    });
};

// Busca todos os registros de ponto de um usuário
exports.buscarRegistrosDoUsuario = (req, res) => {
    const { userId } = req.params;
    console.log(`Buscando registros do usuário: ${userId}`);

    const sql = 'SELECT * FROM registros_ponto WHERE userId = ? ORDER BY dataHora DESC';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar registros:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Resposta enviada:', results);
        res.json(results);
    });
};