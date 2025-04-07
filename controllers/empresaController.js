const db = require('../config/db');

exports.cadastrarEmpresa = (req, res) => {
    const { 
        nome, 
        cnpj, 
        cidade, 
        cep, 
        rua, 
        numero, 
        id_estado, 
        ramo_atuacao, 
        email,
        telefone
    } = req.body;

    // Validação completa
    if (!nome || !cnpj || !cidade || !cep || !rua || !numero || !id_estado || !ramo_atuacao || !email || !telefone) {
        return res.status(400).json({ 
            error: 'Todos os campos obrigatórios devem ser preenchidos!',
            camposObrigatorios: ['nome', 'cnpj', 'cidade', 'cep', 'rua', 'numero', 'id_estado', 'ramo_atuacao', 'email','telefone']
        });
    }

    // Validação específica do ramo de atuação
    if (ramo_atuacao.length < 2) {
        return res.status(400).json({ 
            error: 'O ramo de atuação deve ter pelo menos 2 caracteres!'
        });
    }

    // Formatar CNPJ (remover caracteres não numéricos)
    const cnpjFormatado = cnpj.replace(/\D/g, '');

    // Query SQL com todos os campos, incluindo telefone
    const sql = `
        INSERT INTO EMPRESA (
            nome, cnpj, cidade, cep, rua, numero, 
            id_estado, ramo_atuacao, email, telefone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        nome, 
        cnpjFormatado, 
        cidade, 
        cep, 
        rua, 
        numero, 
        id_estado, 
        ramo_atuacao, 
        email, 
        telefone
    ], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar empresa:', err);
            
            if (err.code === 'ER_DUP_ENTRY') {
                const field = err.message.includes('cnpj') ? 'CNPJ' : 'Email';
                return res.status(400).json({ 
                    error: `${field} já cadastrado!`,
                    campoDuplicado: field.toLowerCase()
                });
            }
            
            return res.status(500).json({ 
                error: 'Erro ao cadastrar empresa',
                detalhes: err.message 
            });
        }

        res.status(201).json({ 
            message: 'Empresa cadastrada com sucesso!',
            id: result.insertId,
            nome,
            cnpj: cnpjFormatado
        });
    });
};

// Listar Empresas (com callback)
exports.listarEmpresas = (req, res) => {
    db.query(`
        SELECT e.*, es.nome as estado_nome 
        FROM EMPRESA e
        JOIN ESTADO es ON e.id_estado = es.id
    `, (err, empresas) => {
        if (err) {
            console.error('Erro ao buscar empresas:', err);
            return res.status(500).json({ error: 'Erro ao buscar empresas' });
        }

        if (empresas.length === 0) {
            return res.status(404).json({ message: 'Nenhuma empresa encontrada' });
        }
        
        res.status(200).json(empresas);
    });
};

// Remover Empresa (com callback)
exports.removerEmpresa = (req, res) => {
    const { id } = req.params;
    
    // Verificar se existe funcionários primeiro
    db.query('SELECT id FROM FUNCIONARIO WHERE id_empresa = ?', [id], (err, funcionarios) => {
        if (err) {
            console.error('Erro ao verificar funcionários:', err);
            return res.status(500).json({ error: 'Erro ao verificar funcionários' });
        }

        if (funcionarios.length > 0) {
            return res.status(400).json({ error: 'Empresa possui funcionários vinculados' });
        }

        // Se não tiver funcionários, pode remover
        db.query('DELETE FROM EMPRESA WHERE id = ?', [id], (err, result) => {
            if (err) {
                console.error('Erro ao remover empresa:', err);
                return res.status(500).json({ error: 'Erro ao remover empresa' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Empresa não encontrada' });
            }

            res.json({ message: 'Empresa removida com sucesso!' });
        });
    });
};
// Cadastrar Administrador com Permissões Específicas
exports.cadastrarAdmin = (req, res) => {
    const { 
        nome, 
        email, 
        senha, 
        id_empresa,
        cpf = null,
        foto_perfil_url = null,
        permissoes = {
            fechar_ponto: true,
            cadastrar_funcionario: true,
            aprovar_pontos: true,
            excluir_funcionario: true,
            desativar_funcionario: true
            ,visualizar_relatorios:true
        }
    } = req.body;
    
    console.log(`Cadastrando administrador: ${nome}, Empresa ID: ${id_empresa}`);

    // Validações básicas
    if (!nome || !email || !senha || !id_empresa) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando!' });
    }

    // 1. Verificar se empresa existe
    db.query('SELECT id FROM EMPRESA WHERE id = ?', [id_empresa], (err, empresaResult) => {
        if (err) {
            console.error('Erro ao verificar empresa:', err);
            return res.status(500).json({ error: 'Erro ao verificar empresa' });
        }

        if (empresaResult.length === 0) {
            return res.status(400).json({ error: 'Empresa não encontrada!' });
        }

        // 2. Verificar email único
        db.query('SELECT id FROM USUARIO WHERE email = ?', [email], (err, emailResult) => {
            if (err) {
                console.error('Erro ao verificar email:', err);
                return res.status(500).json({ error: 'Erro ao verificar email' });
            }

            if (emailResult.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado!' });
            }

            // 3. Inserir usuário
            db.query(
                `INSERT INTO USUARIO (
                    nome, email, senha, nivel, cpf, foto_perfil_url, status
                ) VALUES (?, ?, SHA2(?, 256), 'ADMIN', ?, ?, 'Ativo')`,
                [nome, email, senha, cpf, foto_perfil_url],
                (err, usuarioResult) => {
                    if (err) {
                        console.error('Erro ao cadastrar usuário:', err);
                        return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
                    }

                    // 4. Inserir admin com permissões
                    const permissoesJSON = JSON.stringify(permissoes);
                    db.query(
                        `INSERT INTO ADMIN (
                            id_usuario, id_empresa, permissoes
                        ) VALUES (?, ?, ?)`,
                        [usuarioResult.insertId, id_empresa, permissoesJSON],
                        (err) => {
                            if (err) {
                                console.error('Erro ao cadastrar administrador:', err);
                                return res.status(500).json({ error: 'Erro ao cadastrar administrador' });
                            }

                            res.status(201).json({ 
                                message: 'Administrador cadastrado com sucesso!',
                                id: usuarioResult.insertId,
                                permissoes: permissoes
                            });
                        }
                    );
                }
            );
        });
    });
};

// Alternar Status Empresa (com callback)
exports.alternarStatusEmpresa = (req, res) => {
    const { id } = req.params;

    // 1. Primeiro obter o status atual
    db.query('SELECT id, status FROM EMPRESA WHERE id = ?', [id], (err, empresaResult) => {
        if (err) {
            console.error('Erro ao buscar empresa:', err);
            return res.status(500).json({ error: 'Erro ao buscar empresa' });
        }

        if (empresaResult.length === 0) {
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }

        const novoStatus = empresaResult[0].status === 'Ativo' ? 'Inativo' : 'Ativo';

        // 2. Atualizar o status
        db.query(
            'UPDATE EMPRESA SET status = ? WHERE id = ?',
            [novoStatus, id],
            (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar status:', err);
                    return res.status(500).json({ error: 'Erro ao atualizar status' });
                }

                res.json({ 
                    message: 'Status atualizado com sucesso!',
                    novoStatus 
                });
            }
        );
    });
};

//metodos para serem implementados futuramente

// Obter Permissões do Administrador
exports.obterPermissoesAdmin = (req, res) => {
    const { id_admin } = req.params;

    db.query(
        'SELECT permissoes FROM ADMIN WHERE id = ?',
        [id_admin],
        (err, results) => {
            if (err) {
                console.error('Erro ao obter permissões:', err);
                return res.status(500).json({ error: 'Erro ao obter permissões' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Administrador não encontrado' });
            }

            try {
                const permissoes = JSON.parse(results[0].permissoes);
                res.json({ permissoes });
            } catch (e) {
                console.error('Erro ao parsear permissões:', e);
                res.status(500).json({ error: 'Erro ao interpretar permissões' });
            }
        }
    );
};

// Middleware de verificação de permissões
function verificarPermissao(permissaoRequerida) {
    return (req, res, next) => {
        const id_admin = req.user.id; // Supondo que o ID do admin está no token JWT

        db.query(
            'SELECT permissoes FROM ADMIN WHERE id_usuario = ?',
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
                    
                    if (permissoes[permissaoRequerida] !== true) {
                        return res.status(403).json({ 
                            error: 'Acesso negado: permissão insuficiente',
                            permissaoRequerida
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
}