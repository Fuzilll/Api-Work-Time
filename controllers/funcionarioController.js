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

/**
 * Solicitar alteração/correção em registro de ponto
  * @param {Object} req - Requisição HTTP (deve conter id_registro, tipo_solicitacao, motivo)
  * @param {Object} res - Resposta HTTP
  */
exports.solicitarAlteracaoPonto = (req, res) => {
    const id_funcionario = req.session.id_usuario;
    const { id_registro, tipo_solicitacao, motivo } = req.body;

    // Validações básicas
    if (!id_funcionario) {
        console.log('ID do funcionário não encontrado na sessão.');
        return res.status(401).json({ 
            error: 'Usuário não autenticado',
            code: 'UNAUTHORIZED'
        });
    }

    if (!id_registro || !tipo_solicitacao || !motivo) {
        console.log('Dados obrigatórios não fornecidos.');
        return res.status(400).json({ 
            error: 'Todos os campos são obrigatórios (id_registro, tipo_solicitacao, motivo)',
            code: 'MISSING_FIELDS'
        });
    }

    if (!['Correcao', 'Justificativa'].includes(tipo_solicitacao)) {
        console.log('Tipo de solicitação inválido:', tipo_solicitacao);
        return res.status(400).json({ 
            error: 'Tipo de solicitação inválido. Deve ser "Correcao" ou "Justificativa"',
            code: 'INVALID_REQUEST_TYPE'
        });
    }

    console.log(`Solicitação de ${tipo_solicitacao} para registro ${id_registro} pelo funcionário ${id_funcionario}`);

    // 1. Verificar se o registro de ponto pertence ao funcionário
    const sqlVerificaRegistro = `
        SELECT id FROM REGISTRO_PONTO 
        WHERE id = ? AND id_funcionario = ?
    `;

    db.query(sqlVerificaRegistro, [id_registro, id_funcionario], (err, results) => {
        if (err) {
            console.error('Erro ao verificar registro de ponto:', err);
            return res.status(500).json({ 
                error: 'Erro ao verificar registro de ponto',
                code: 'DB_ERROR'
            });
        }

        if (results.length === 0) {
            console.log('Registro de ponto não encontrado ou não pertence ao funcionário');
            return res.status(404).json({ 
                error: 'Registro de ponto não encontrado ou você não tem permissão para acessá-lo',
                code: 'RECORD_NOT_FOUND'
            });
        }

        // 2. Inserir a solicitação de alteração
        const sqlInsereSolicitacao = `
            INSERT INTO SOLICITACAO_ALTERACAO (
                id_registro, 
                id_funcionario, 
                tipo_solicitacao, 
                motivo,
                status
            ) VALUES (?, ?, ?, ?, 'Pendente')
        `;

        db.query(sqlInsereSolicitacao, 
            [id_registro, id_funcionario, tipo_solicitacao, motivo], 
            (err, result) => {
                if (err) {
                    console.error('Erro ao registrar solicitação:', err);
                    return res.status(500).json({ 
                        error: 'Erro ao registrar solicitação',
                        code: 'DB_ERROR'
                    });
                }

                console.log('Solicitação registrada com ID:', result.insertId);
                
                // 3. (Opcional) Atualizar status do registro de ponto para "Pendente"
                const sqlAtualizaStatus = `
                    UPDATE REGISTRO_PONTO 
                    SET status = 'Pendente' 
                    WHERE id = ?
                `;

                db.query(sqlAtualizaStatus, [id_registro], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar status do registro (não crítico):', err);
                        // Não falha a operação por causa disso, apenas registra
                    }

                    res.status(201).json({
                        message: 'Solicitação registrada com sucesso!',
                        id_solicitacao: result.insertId,
                        status: 'Pendente'
                    });
                });
            }
        );
    });
};