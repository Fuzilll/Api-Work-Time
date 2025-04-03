const db = require('../config/db');

// Listar histórico de pontos do funcionário
exports.listarHistoricoPontos = (req, res) => {
    const id_funcionario = req.session.id_usuario;

    if (!id_funcionario) {
        console.log('ID do funcionário não encontrado na sessão.');
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    console.log(`Buscando histórico de pontos para o funcionário com ID: ${id_funcionario}`);

    const sql = 'SELECT * FROM registros_ponto WHERE funcionario_id = ? ORDER BY data_ponto DESC';

    db.query(sql, [id_funcionario], (err, results) => {
        if (err) {
            console.error('Erro ao buscar histórico de pontos:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            console.log('Nenhum ponto encontrado para o funcionário');
            return res.status(404).json({ message: 'Nenhum ponto encontrado' });
        }

        console.log(`Registros de ponto encontrados: ${results.length}`);
        res.json(results);
    });
};

// Carregar dados do perfil do funcionário
exports.carregarPerfil = (req, res) => {
    const id_funcionario = req.session.id_usuario;

    if (!id_funcionario) {
        console.log('ID do funcionário não encontrado na sessão.');
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    console.log(`Buscando dados do perfil para o funcionário com ID: ${id_funcionario}`);

    const sql = `SELECT U.nome, U.email, F.cpf, F.registro_emp, F.funcao, F.data_admissao, E.nome AS empresa_nome
                 FROM USUARIO U
                 JOIN FUNCIONARIO F ON U.id = F.id_usuario
                 JOIN EMPRESA E ON F.id_empresa = E.id
                 WHERE U.id = ?`;

    db.query(sql, [id_funcionario], (err, results) => {
        if (err) {
            console.error('Erro ao carregar perfil do funcionário:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            console.log('Funcionário não encontrado');
            return res.status(404).json({ message: 'Funcionário não encontrado' });
        }

        console.log('Perfil do funcionário carregado com sucesso');
        res.json(results[0]);
    });
};
