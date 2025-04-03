const db = require('../config/db');

// Cadastrar Funcionário
exports.cadastrarFuncionario = (req, res) => {
    const { nome, email, senha, cpf, registro_emp, funcao, data_admissao } = req.body;
    const id_empresa = 1; // Id fixado para testar vou muda depois

    console.log(`Cadastrando funcionário: ${nome}, Empresa ID: ${id_empresa}`);

    if (!cpf || !registro_emp || !funcao || !data_admissao) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const sqlUsuario = 'INSERT INTO USUARIO (nome, email, senha, nivel, status) VALUES (?, ?, ?, "FUNCIONARIO", "Ativo")';
    
    db.query(sqlUsuario, [nome, email, senha], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
        }

        const id_usuario = result.insertId;
        console.log(`Usuário cadastrado com ID: ${id_usuario}`);

        const sqlFuncionario = 'INSERT INTO FUNCIONARIO (id_usuario, cpf, registro_emp, funcao, data_admissao, id_empresa) VALUES (?, ?, ?, ?, ?, ?)';

        db.query(sqlFuncionario, [id_usuario, cpf, registro_emp, funcao, data_admissao, id_empresa], (err) => {
            if (err) {
                console.error('Erro ao cadastrar funcionário:', err);
                return res.status(500).json({ error: 'Erro ao cadastrar funcionário.' });
            }

            console.log('Funcionário cadastrado com sucesso!');
            return res.status(200).json({ message: 'Funcionário cadastrado com sucesso!' });
        });
    });
};



// Resumo de funcionários no dashboard
exports.resumoFuncionarios = (req, res) => {
    const sql = `
        SELECT COUNT(*) AS total_funcionarios, 
               SUM(CASE WHEN u.status = 'Ativo' THEN 1 ELSE 0 END) AS funcionarios_ativos, 
               SUM(CASE WHEN u.status = 'Inativo' THEN 1 ELSE 0 END) AS funcionarios_inativos 
        FROM USUARIO u
        JOIN FUNCIONARIO f ON u.id = f.id_usuario;
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar resumo de funcionários:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar resumo de funcionários.' });
        }
        console.log('Resumo de funcionários:', results);
        res.json(results[0]);
    });
};

// Relatório de pontos no dashboard
exports.relatorioPontos = (req, res) => {
    const sql = `
        SELECT COUNT(*) AS total_pontos, 
               SUM(CASE WHEN status = 'Aprovado' THEN 1 ELSE 0 END) AS pontos_aprovados, 
               SUM(CASE WHEN status = 'Pendente' THEN 1 ELSE 0 END) AS pontos_pendentes
        FROM registros_ponto;
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar relatório de pontos:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar relatório de pontos.' });
        }
        console.log('Relatório de pontos:', results);
        res.json(results[0]);
    });
};

// Últimos registros de ponto no dashboard
exports.ultimosRegistrosPonto = (req, res) => {
    const sql = `
        SELECT u.nome AS funcionario, rp.data_ponto AS data, rp.foto_url, rp.latitude, rp.longitude, rp.status
        FROM registros_ponto rp
        JOIN FUNCIONARIO f ON rp.funcionario_id = f.id
        JOIN USUARIO u ON f.id_usuario = u.id
        ORDER BY rp.data_ponto DESC LIMIT 5;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar últimos registros de ponto:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar últimos registros de ponto.' });
        }

        // (dd/MM/yyyy HH:mm:ss)
        const registrosFormatados = results.map(registro => ({
            ...registro,
            data: new Date(registro.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
        }));

        console.log('Últimos registros de ponto:', registrosFormatados);
        res.json(registrosFormatados);
    });
};
exports.buscarPontos = async (req, res) => {
    try {
        const filtro = `%${req.query.filtro || ''}%`;
        const params = req.id_empresa ? [filtro, req.id_empresa] : [filtro];

        const query = `SELECT p.id, u.nome as funcionario, p.data_ponto, p.status 
                       FROM registros_ponto p 
                       JOIN funcionario f ON f.id = p.funcionario_id 
                       JOIN usuario u ON u.id = f.id_usuario
                       WHERE u.nome LIKE ? ${req.id_empresa ? 'AND f.id_empresa = ?' : ''}`;
        
        const [rows] = await db.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar os pontos' });
    }
};

exports.atualizarStatusPonto = async (req, res) => {
    try {
        const { id, status } = req.params;
        const query = `UPDATE registros_ponto SET status = ? WHERE id = ?`;
        
        await db.promise().query(query, [status.charAt(0).toUpperCase() + status.slice(1), id]);
        res.status(200).json({ success: true, message: `Ponto ${status} com sucesso!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: `Erro ao ${status} ponto` });
    }
};
// Carregar todos os pontos pendentes
exports.carregarPontosPendentes = (req, res) => {
    const sql = `
        SELECT p.id, u.nome as funcionario, p.data_ponto, p.status 
        FROM registros_ponto p 
        JOIN funcionario f ON f.id = p.funcionario_id 
        JOIN usuario u ON u.id = f.id_usuario
        WHERE p.status = 'Pendente'`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar pontos pendentes:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar pontos pendentes.' });
        }
        console.log('Pontos pendentes encontrados:', results);
        res.json(results);
    });
};