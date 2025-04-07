const db = require('../config/db');

// Cadastra um novo registro de ponto
exports.cadastrarRegistro = (req, res) => {
    const { id_funcionario, tipo, foto_url, latitude, longitude, precisao_geolocalizacao, dispositivo } = req.body;
    console.log('Req recebida:', req.body);

    // Verifica se o funcionário existe no banco
    const verificarFuncionarioSQL = 'SELECT id FROM FUNCIONARIO WHERE id = ?';
    db.query(verificarFuncionarioSQL, [id_funcionario], (err, results) => {
        if (err) {
            console.error('Erro ao verificar funcionário:', err.message);
            return res.status(500).json({ error: 'Erro ao verificar funcionário.' });
        }
        if (results.length === 0) {
            console.warn(`Funcionário não encontrado: ${id_funcionario}`);
            return res.status(400).json({ error: 'Funcionário não encontrado.' });
        }

        // Verifica configurações da empresa para ver o que é obrigatório
        const verificarConfigSQL = `
            SELECT cp.requer_foto, cp.requer_geolocalizacao 
            FROM CONFIGURACAO_PONTO cp
            JOIN FUNCIONARIO f ON f.id_empresa = cp.id_empresa
            WHERE f.id = ?`;
        
        db.query(verificarConfigSQL, [id_funcionario], (err, configResults) => {
            if (err) {
                console.error('Erro ao verificar configurações:', err.message);
                return res.status(500).json({ error: 'Erro ao verificar configurações da empresa.' });
            }

            if (configResults.length > 0) {
                const config = configResults[0];
                
                // Validações conforme configuração da empresa
                if (config.requer_foto && !foto_url) {
                    return res.status(400).json({ error: 'Foto é obrigatória para registro de ponto nesta empresa.' });
                }
                
                if (config.requer_geolocalizacao && (!latitude || !longitude)) {
                    return res.status(400).json({ error: 'Geolocalização é obrigatória para registro de ponto nesta empresa.' });
                }
            }

            // Insere o novo registro de ponto
            const sql = `
                INSERT INTO REGISTRO_PONTO 
                (id_funcionario, tipo, foto_url, latitude, longitude, precisao_geolocalizacao, dispositivo, hash_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, SHA2(CONCAT(?, ?, ?, ?, ?, NOW()), 256))`;
            
            db.query(sql, [
                id_funcionario, 
                tipo, 
                foto_url, 
                latitude, 
                longitude, 
                precisao_geolocalizacao, 
                dispositivo,
                id_funcionario,
                tipo,
                foto_url,
                latitude,
                longitude
            ], (err, result) => {
                if (err) {
                    console.error('Erro ao cadastrar registro de ponto:', err.message);
                    return res.status(500).json({ error: 'Erro ao cadastrar registro de ponto.' });
                }
                
                console.log('Registro de ponto cadastrado com sucesso:', result);
                res.json({ 
                    message: 'Registro de ponto cadastrado com sucesso!', 
                    id: result.insertId,
                    status: 'Pendente' // Status inicial conforme definição da tabela
                });
            });
        });
    });
}

// Busca todos os registros de ponto de um funcionário
exports.buscarRegistrosDoUsuario = (req, res) => {
    const { id_funcionario } = req.params;
    console.log(`Buscando registros do funcionário: ${id_funcionario}`);

    // Verifica se o funcionário existe
    const verificarFuncionarioSQL = 'SELECT id FROM FUNCIONARIO WHERE id = ?';
    db.query(verificarFuncionarioSQL, [id_funcionario], (err, results) => {
        if (err) {
            console.error('Erro ao verificar funcionário:', err.message);
            return res.status(500).json({ error: 'Erro ao verificar funcionário.' });
        }
        if (results.length === 0) {
            console.warn(`Funcionário não encontrado: ${id_funcionario}`);
            return res.status(400).json({ error: 'Funcionário não encontrado.' });
        }

        // Busca os registros de ponto
        const sql = `
            SELECT 
                rp.id,
                rp.tipo,
                rp.foto_url,
                rp.latitude,
                rp.longitude,
                rp.endereco_registro,
                rp.data_hora,
                rp.status,
                rp.precisao_geolocalizacao,
                rp.dispositivo,
                u.nome AS nome_funcionario
            FROM REGISTRO_PONTO rp
            JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE rp.id_funcionario = ?
            ORDER BY rp.data_hora DESC`;
        
        db.query(sql, [id_funcionario], (err, results) => {
            if (err) {
                console.error('Erro ao buscar registros:', err.message);
                return res.status(500).json({ error: 'Erro ao buscar registros de ponto.' });
            }
            
            console.log(`Resposta enviada com ${results.length} registros.`);
            res.json(results);
        });
    });
};