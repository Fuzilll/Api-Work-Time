const db = require('../config/db');

// Middleware para verificar permissões do admin
const verificarPermissaoAdmin = (permissao) => {
    return (req, res, next) => {
        const id_admin = req.user.id; // ID do admin obtido do token JWT

        db.query(
            `SELECT permissoes FROM ADMIN WHERE id_usuario = ?`,
            [id_admin],
            (err, results) => {
                if (err) {
                    console.error('Erro ao verificar permissões:', err);
                    return res.status(500).json({ error: 'Erro ao verificar permissões' });
                }

                if (results.length === 0) {
                    return res.status(403).json({ error: 'Administrador não encontrado' });
                }

                try {
                    const permissoes = JSON.parse(results[0].permissoes);
                    
                    if (!permissoes[permissao]) {
                        return res.status(403).json({ 
                            error: 'Acesso negado: permissão insuficiente',
                            permissaoRequerida: permissao
                        });
                    }

                    next();
                } catch (e) {
                    console.error('Erro ao parsear permissões:', e);
                    res.status(500).json({ error: 'Erro ao interpretar permissões' });
                }
            }
        );
    };
};

// Cadastrar Funcionário com verificação de permissão
exports.cadastrarFuncionario = [
    verificarPermissaoAdmin('cadastrar_funcionario'),
    (req, res) => {
        const { 
            nome, 
            email, 
            senha, 
            cpf, 
            registro_emp, 
            funcao, 
            data_admissao,
            departamento = null,
            salario_base = null,
            tipo_contrato = 'CLT'
        } = req.body;
        
        // Obter id_empresa do admin (assumindo que está no token)
        const id_empresa = req.user.id_empresa;

        console.log(`Cadastrando funcionário: ${nome}, Empresa ID: ${id_empresa}`);

        // Validações
        if (!nome || !email || !senha || !cpf || !registro_emp || !funcao || !data_admissao) {
            return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos." });
        }

        // Iniciar transação
        db.beginTransaction(err => {
            if (err) {
                console.error('Erro ao iniciar transação:', err);
                return res.status(500).json({ error: 'Erro ao iniciar transação' });
            }

            // 1. Cadastrar usuário
            db.query(
                `INSERT INTO USUARIO (
                    nome, email, senha, nivel, cpf, status
                ) VALUES (?, ?, SHA2(?, 256), 'FUNCIONARIO', ?, 'Ativo')`,
                [nome, email, senha, cpf],
                (err, usuarioResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao cadastrar usuário:', err);
                            if (err.code === 'ER_DUP_ENTRY') {
                                res.status(400).json({ error: 'Email ou CPF já cadastrado!' });
                            } else {
                                res.status(500).json({ error: 'Erro ao cadastrar usuário' });
                            }
                        });
                    }

                    const id_usuario = usuarioResult.insertId;

                    // 2. Cadastrar funcionário
                    db.query(
                        `INSERT INTO FUNCIONARIO (
                            id_usuario, registro_emp, funcao, departamento, 
                            data_admissao, id_empresa, salario_base, tipo_contrato
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [id_usuario, registro_emp, funcao, departamento, 
                         data_admissao, id_empresa, salario_base, tipo_contrato],
                        (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Erro ao cadastrar funcionário:', err);
                                    res.status(500).json({ error: 'Erro ao cadastrar funcionário' });
                                });
                            }

                            // 3. Cadastrar horário padrão
                            db.query(
                                `INSERT INTO HORARIO_TRABALHO (
                                    id_funcionario, dia_semana, hora_entrada, hora_saida, 
                                    intervalo_inicio, intervalo_fim
                                ) VALUES (?, 'Segunda', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
                                 (?, 'Terca', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
                                 (?, 'Quarta', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
                                 (?, 'Quinta', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
                                 (?, 'Sexta', '09:00:00', '18:00:00', '12:00:00', '13:00:00')`,
                                [id_usuario, id_usuario, id_usuario, id_usuario, id_usuario],
                                (err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error('Erro ao cadastrar horário:', err);
                                            res.status(500).json({ error: 'Erro ao cadastrar horário padrão' });
                                        });
                                    }

                                    // Commit da transação
                                    db.commit(err => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Erro ao commitar transação:', err);
                                                res.status(500).json({ error: 'Erro ao finalizar cadastro' });
                                            });
                                        }

                                        console.log('Funcionário cadastrado com sucesso!');
                                        res.status(201).json({ 
                                            message: 'Funcionário cadastrado com sucesso!',
                                            id: id_usuario
                                        });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
];

// Resumo de funcionários no dashboard
exports.resumoFuncionarios = [
    verificarPermissaoAdmin('visualizar_relatorios'),
    (req, res) => {
        const id_empresa = req.user.id_empresa;

        const sql = `
            SELECT 
                COUNT(*) AS total_funcionarios,
                SUM(CASE WHEN u.status = 'Ativo' THEN 1 ELSE 0 END) AS funcionarios_ativos,
                SUM(CASE WHEN u.status = 'Inativo' THEN 1 ELSE 0 END) AS funcionarios_inativos,
                SUM(CASE WHEN f.tipo_contrato = 'CLT' THEN 1 ELSE 0 END) AS funcionarios_clt,
                SUM(CASE WHEN f.tipo_contrato = 'PJ' THEN 1 ELSE 0 END) AS funcionarios_pj
            FROM FUNCIONARIO f
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE f.id_empresa = ?
        `;

        db.query(sql, [id_empresa], (err, results) => {
            if (err) {
                console.error('Erro ao buscar resumo de funcionários:', err);
                return res.status(500).json({ error: 'Erro ao buscar resumo de funcionários' });
            }

            res.json(results[0]);
        });
    }
];

// Relatório de pontos
exports.relatorioPontos = [
    verificarPermissaoAdmin('visualizar_relatorios'),
    (req, res) => {
        const id_empresa = req.user.id_empresa;
        const { data_inicio, data_fim } = req.query;

        let sql = `
            SELECT 
                COUNT(*) AS total_pontos,
                SUM(CASE WHEN rp.status = 'Aprovado' THEN 1 ELSE 0 END) AS pontos_aprovados,
                SUM(CASE WHEN rp.status = 'Pendente' THEN 1 ELSE 0 END) AS pontos_pendentes,
                SUM(CASE WHEN rp.status = 'Rejeitado' THEN 1 ELSE 0 END) AS pontos_rejeitados
            FROM REGISTRO_PONTO rp
            JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
            WHERE f.id_empresa = ?
        `;

        const params = [id_empresa];

        // Adicionar filtro por data se fornecido
        if (data_inicio && data_fim) {
            sql += ` AND DATE(rp.data_hora) BETWEEN ? AND ?`;
            params.push(data_inicio, data_fim);
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error('Erro ao buscar relatório de pontos:', err);
                return res.status(500).json({ error: 'Erro ao buscar relatório de pontos' });
            }

            res.json(results[0]);
        });
    }
];

// Últimos registros de ponto
exports.ultimosRegistrosPonto = [
    verificarPermissaoAdmin('visualizar_pontos'),
    (req, res) => {
        const id_empresa = req.user.id_empresa;

        const sql = `
            SELECT 
                u.nome AS funcionario, 
                rp.data_hora AS data, 
                rp.tipo,
                rp.status,
                rp.foto_url,
                rp.latitude,
                rp.longitude
            FROM REGISTRO_PONTO rp
            JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE f.id_empresa = ?
            ORDER BY rp.data_hora DESC 
            LIMIT 10
        `;

        db.query(sql, [id_empresa], (err, results) => {
            if (err) {
                console.error('Erro ao buscar últimos registros de ponto:', err);
                return res.status(500).json({ error: 'Erro ao buscar últimos registros de ponto' });
            }

            // Formatar datas
            const registrosFormatados = results.map(registro => ({
                ...registro,
                data: new Date(registro.data).toLocaleString('pt-BR')
            }));

            res.json(registrosFormatados);
        });
    }
];

// Buscar pontos com filtros
exports.buscarPontos = [
    verificarPermissaoAdmin('visualizar_pontos'),
    (req, res) => {
        const id_empresa = req.user.id_empresa;
        const { filtro, status, data_inicio, data_fim } = req.query;

        let sql = `
            SELECT 
                rp.id, 
                u.nome AS funcionario, 
                rp.data_hora AS data,
                rp.tipo,
                rp.status,
                rp.foto_url
            FROM REGISTRO_PONTO rp
            JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE f.id_empresa = ?
        `;

        const params = [id_empresa];

        // Aplicar filtros
        if (filtro) {
            sql += ` AND (u.nome LIKE ? OR u.email LIKE ? OR f.registro_emp LIKE ?)`;
            params.push(`%${filtro}%`, `%${filtro}%`, `%${filtro}%`);
        }

        if (status) {
            sql += ` AND rp.status = ?`;
            params.push(status);
        }

        if (data_inicio && data_fim) {
            sql += ` AND DATE(rp.data_hora) BETWEEN ? AND ?`;
            params.push(data_inicio, data_fim);
        }

        sql += ` ORDER BY rp.data_hora DESC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error('Erro ao buscar pontos:', err);
                return res.status(500).json({ error: 'Erro ao buscar pontos' });
            }

            // Formatar datas
            const pontosFormatados = results.map(ponto => ({
                ...ponto,
                data: new Date(ponto.data).toLocaleString('pt-BR')
            }));

            res.json(pontosFormatados);
        });
    }
];

// Atualizar status do ponto
exports.atualizarStatusPonto = [
    verificarPermissaoAdmin('aprovar_pontos'),
    (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const id_aprovador = req.user.id;

        if (!['Aprovado', 'Rejeitado'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const sql = `
            UPDATE REGISTRO_PONTO 
            SET status = ?, id_aprovador = ?
            WHERE id = ?
        `;

        db.query(sql, [status, id_aprovador, id], (err, result) => {
            if (err) {
                console.error('Erro ao atualizar status do ponto:', err);
                return res.status(500).json({ error: 'Erro ao atualizar status do ponto' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Ponto não encontrado' });
            }

            res.json({ 
                message: `Ponto ${status.toLowerCase()} com sucesso!`,
                novoStatus: status
            });
        });
    }
];

// Carregar pontos pendentes
exports.carregarPontosPendentes = [
    verificarPermissaoAdmin('aprovar_pontos'),
    (req, res) => {
        const id_empresa = req.user.id_empresa;

        const sql = `
            SELECT 
                rp.id, 
                u.nome AS funcionario, 
                rp.data_hora AS data,
                rp.tipo,
                rp.foto_url,
                rp.justificativa
            FROM REGISTRO_PONTO rp
            JOIN FUNCIONARIO f ON rp.id_funcionario = f.id
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE rp.status = 'Pendente' AND f.id_empresa = ?
            ORDER BY rp.data_hora DESC
        `;

        db.query(sql, [id_empresa], (err, results) => {
            if (err) {
                console.error('Erro ao buscar pontos pendentes:', err);
                return res.status(500).json({ error: 'Erro ao buscar pontos pendentes' });
            }

            // Formatar datas
            const pontosFormatados = results.map(ponto => ({
                ...ponto,
                data: new Date(ponto.data).toLocaleString('pt-BR')
            }));

            res.json(pontosFormatados);
        });
    }
];

// Desativar funcionário
exports.desativarFuncionario = [
    verificarPermissaoAdmin('desativar_funcionario'),
    (req, res) => {
        const { id } = req.params;
        const id_empresa = req.user.id_empresa;

        // Verificar se o funcionário pertence à mesma empresa do admin
        const sqlVerificacao = `
            SELECT f.id 
            FROM FUNCIONARIO f
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Ativo'
        `;

        db.query(sqlVerificacao, [id, id_empresa], (err, results) => {
            if (err) {
                console.error('Erro ao verificar funcionário:', err);
                return res.status(500).json({ error: 'Erro ao verificar funcionário' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Funcionário ativo não encontrado nesta empresa' });
            }

            // Atualizar status do usuário para inativo
            const sqlAtualizacao = `
                UPDATE USUARIO u
                JOIN FUNCIONARIO f ON u.id = f.id_usuario
                SET u.status = 'Inativo', u.data_atualizacao = CURRENT_TIMESTAMP
                WHERE f.id = ?
            `;

            db.query(sqlAtualizacao, [id], (err, result) => {
                if (err) {
                    console.error('Erro ao desativar funcionário:', err);
                    return res.status(500).json({ error: 'Erro ao desativar funcionário' });
                }

                if (result.affectedRows === 0) {
                    return res.status(500).json({ error: 'Nenhum registro atualizado' });
                }

                res.json({ message: 'Funcionário desativado com sucesso!' });
            });
        });
    }
];

// Excluir funcionário (apenas se inativo)
exports.excluirFuncionario = [
    verificarPermissaoAdmin('excluir_funcionario'),
    (req, res) => {
        const { id } = req.params;
        const id_empresa = req.user.id_empresa;

        // Verificar se o funcionário pertence à empresa e está inativo
        const sqlVerificacao = `
            SELECT f.id 
            FROM FUNCIONARIO f
            JOIN USUARIO u ON f.id_usuario = u.id
            WHERE f.id = ? AND f.id_empresa = ? AND u.status = 'Inativo'
        `;

        db.query(sqlVerificacao, [id, id_empresa], (err, results) => {
            if (err) {
                console.error('Erro ao verificar funcionário:', err);
                return res.status(500).json({ error: 'Erro ao verificar funcionário' });
            }

            if (results.length === 0) {
                return res.status(400).json({ 
                    error: 'Funcionário não encontrado ou ainda está ativo. Desative-o primeiro.'
                });
            }

            // Iniciar transação para exclusão segura
            db.beginTransaction(err => {
                if (err) {
                    console.error('Erro ao iniciar transação:', err);
                    return res.status(500).json({ error: 'Erro ao iniciar transação' });
                }

                // 1. Excluir horários de trabalho
                db.query(
                    'DELETE FROM HORARIO_TRABALHO WHERE id_funcionario = ?',
                    [id],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Erro ao excluir horários:', err);
                                res.status(500).json({ error: 'Erro ao excluir horários' });
                            });
                        }

                        // 2. Excluir registros de ponto
                        db.query(
                            'DELETE FROM REGISTRO_PONTO WHERE id_funcionario = ?',
                            [id],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Erro ao excluir registros de ponto:', err);
                                        res.status(500).json({ error: 'Erro ao excluir registros de ponto' });
                                    });
                                }

                                // 3. Excluir funcionário
                                db.query(
                                    'DELETE FROM FUNCIONARIO WHERE id = ?',
                                    [id],
                                    (err, result) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Erro ao excluir funcionário:', err);
                                                res.status(500).json({ error: 'Erro ao excluir funcionário' });
                                            });
                                        }

                                        // 4. Excluir usuário (cascata)
                                        db.query(
                                            'DELETE FROM USUARIO WHERE id = ?',
                                            [results[0].id_usuario],
                                            (err) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('Erro ao excluir usuário:', err);
                                                        res.status(500).json({ error: 'Erro ao excluir usuário' });
                                                    });
                                                }

                                                // Commit da transação
                                                db.commit(err => {
                                                    if (err) {
                                                        return db.rollback(() => {
                                                            console.error('Erro ao commitar transação:', err);
                                                            res.status(500).json({ error: 'Erro ao finalizar exclusão' });
                                                        });
                                                    }

                                                    res.json({ message: 'Funcionário excluído com sucesso!' });
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    }
];