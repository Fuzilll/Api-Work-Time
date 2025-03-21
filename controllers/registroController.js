const db = require('../config/db');

// Cadastra um novo registro de ponto
exports.cadastrarRegistro = (req, res) => {
    const { userId, latitude, longitude, fotoBase64 } = req.body;
    console.log('Req recebida:', req.body); 

    // Verifica se o usuário existe no banco
    const verificarUsuarioSQL = 'SELECT id FROM usuarios WHERE id = ?';
    db.query(verificarUsuarioSQL, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao verificar usuário:', err.message); 
            return res.status(500).json({ error: 'Erro ao verificar usuário.' });
        }
        if (results.length === 0) {
            console.warn(`Usuário não encontrado: ${userId}`);  
            return res.status(400).json({ error: 'Usuário não encontrado.' });
        }

        // Insere o novo registro de ponto
        const sql = 'INSERT INTO registros_ponto (userId, latitude, longitude, fotoBase64) VALUES (?, ?, ?, ?)';
        db.query(sql, [userId, latitude, longitude, fotoBase64], (err, result) => {
            if (err) {
                console.error('Erro ao cadastrar registro de ponto:', err.message);  
                return res.status(500).json({ error: 'Erro ao cadastrar registro de ponto.' });
            }
            console.log('Registro de ponto cadastrado com sucesso:', result);  
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
        }
        console.log(`Resposta enviada com ${results.length} registros.`); 
    });
};
