// adminController.js - Controlador para gerenciar os administradores, funcionários e registros de ponto
const db = require('../config/db');

// Cadastra um novo funcionário
exports.cadastrarFuncionario = (req, res) => {
    const { nome, email, senha, nivel, cpf, registro_emp, funcao, data_admissao, id_empresa, status } = req.body;
    console.log('📥 Requisição para cadastrar funcionário:', req.body);

    // Verifica se a empresa existe
    const verificarEmpresaSQL = 'SELECT id FROM EMPRESA WHERE id = ?';
    db.query(verificarEmpresaSQL, [id_empresa], (err, results) => {
        if (err) {
            console.error('Erro ao verificar empresa:', err.message);
            return res.status(500).json({ error: 'Erro ao verificar empresa.' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Empresa não encontrada.' });
        }

        // Chama a stored procedure para cadastrar o usuário
        const cadastrarFuncionarioSQL = 'CALL SP_CADASTRAR_USUARIO(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(cadastrarFuncionarioSQL, [nome, email, senha, nivel, cpf, registro_emp, funcao, data_admissao, id_empresa, status], (err, result) => {
            if (err) {
                console.error('Erro ao cadastrar funcionário:', err.message);
                return res.status(500).json({ error: 'Erro ao cadastrar funcionário.' });
            }
            console.log('Funcionário cadastrado com sucesso:', result);
            res.json({ message: 'Funcionário cadastrado com sucesso!' });
        });
    });
};

// Aprovar ou rejeitar um registro de ponto de um funcionário
exports.aprovarRejeitarPonto = (req, res) => {
    const { pontoId, status } = req.body;
    console.log(`📥 Aprovação/Rejeição de registro de ponto para o ponto ID: ${pontoId}, Status: ${status}`);

    // Atualiza o status do ponto
    const sql = 'UPDATE registros_ponto SET status = ? WHERE id = ?';
    db.query(sql, [status, pontoId], (err, result) => {
        if (err) {
            console.error('Erro ao aprovar/rejeitar ponto:', err.message);
            return res.status(500).json({ error: 'Erro ao aprovar/rejeitar ponto.' });
        }
        console.log('Registro de ponto atualizado:', result);
        res.json({ message: `Registro de ponto ${status} com sucesso!` });
    });
};

// Exibe o resumo dos funcionários no dashboard
exports.resumoFuncionarios = (req, res) => {
    const sql = `
        SELECT COUNT(*) AS total_funcionarios, 
               SUM(CASE WHEN situacao = 'Ativo' THEN 1 ELSE 0 END) AS funcionarios_ativos, 
               SUM(CASE WHEN situacao = 'Inativo' THEN 1 ELSE 0 END) AS funcionarios_inativos 
        FROM FUNCIONARIO;
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

// Exibe o relatório de pontos no dashboard
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

// Exibe os últimos registros de ponto no dashboard
exports.ultimosRegistrosPonto = (req, res) => {
    const sql = `
            SELECT u.nome AS funcionario, rp.data AS data, rp.hora_entrada, rp.hora_saida, rp.status
            FROM registros_ponto rp
            JOIN FUNCIONARIO f ON rp.userId = f.id_usuario  -- Erro: 'userId' não existe na tabela 'registros_ponto'
            JOIN USUARIO u ON f.id_usuario = u.id
            ORDER BY rp.data DESC LIMIT 5;

    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar últimos registros de ponto:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar últimos registros de ponto.' });
        }
        console.log('Últimos registros de ponto:', results);
        res.json(results);
    });
};
