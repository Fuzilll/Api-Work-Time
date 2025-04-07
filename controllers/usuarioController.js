const db = require('../config/db');
/**
 * Cadastra um novo usuário no sistema (IT Support, Admin ou Funcionário)
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.cadastrarUsuario = (req, res) => {
    const { 
        nome, 
        email, 
        senha, 
        nivel, 
        cpf,
        status = 'Ativo',
        foto_perfil_url = null,
        // Campos específicos de funcionário
        registro_emp = null,
        funcao = null,
        data_admissao = null,
        id_empresa = null
    } = req.body;

    console.log(`Cadastrando usuário: ${nome}, Nível: ${nivel}, Empresa ID: ${id_empresa || 'N/A'}`);

    // Hash da senha usando SHA-256 (64 caracteres)
    const senhaHash = `SHA2('${senha}', 256)`; // Será processado pelo MySQL

    // Validações básicas
    if (!nome || !email || !senha || !nivel) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando!' });
    }

    if (nivel !== 'IT_SUPPORT' && !id_empresa) {
        return res.status(400).json({ error: 'Empresa é obrigatória para Admin/Funcionário!' });
    }

    if (nivel === 'FUNCIONARIO' && (!registro_emp || !funcao || !data_admissao)) {
        return res.status(400).json({ error: 'Dados incompletos para funcionário!' });
    }

    // Chamada para a stored procedure do MySQL
    const sql = `CALL SP_CADASTRAR_USUARIO(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [
        nome, 
        email, 
        senha, 
        nivel, 
        cpf,
        registro_emp,
        funcao,
        data_admissao,
        id_empresa,
        status,
        foto_perfil_url
    ], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).json({ 
                error: 'Erro ao cadastrar usuário',
                details: err.message 
            });
        }

        console.log(`Usuário ${nome} cadastrado com sucesso!`);
        res.json({ 
            message: 'Usuário cadastrado com sucesso!',
            userId: result.insertId 
        });
    });
};

/**
 * Realiza login no sistema via Web
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.loginWeb = (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login web:', email);

    // Hash da senha para comparação
    const senhaHash = `SHA2('${senha}', 256)`; // Será processado pelo MySQL

    const sql = `
        SELECT 
            u.id, 
            u.email, 
            u.nivel, 
            u.nome,
            u.status,
            u.foto_perfil_url,
            CASE 
                WHEN u.nivel = 'ADMIN' THEN a.id_empresa
                WHEN u.nivel = 'FUNCIONARIO' THEN f.id_empresa
                ELSE NULL
            END AS id_empresa
        FROM USUARIO u
        LEFT JOIN ADMIN a ON u.id = a.id_usuario AND u.nivel = 'ADMIN'
        LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario AND u.nivel = 'FUNCIONARIO'
        WHERE u.email = ? AND u.senha = ${senhaHash}
    `;

    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Erro no login web:', err);
            return res.status(500).json({ message: 'Erro interno do servidor' });
        }

        if (results.length === 0) {
            console.warn('Tentativa de login com credenciais inválidas:', email);
            return res.status(401).json({ message: 'Email ou senha inválidos!' });
        }

        const usuario = results[0];

        // Verificar se usuário está ativo
        if (usuario.status !== 'Ativo') {
            console.warn('Tentativa de login de usuário inativo:', email);
            return res.status(403).json({ message: 'Sua conta está inativa. Contate o administrador.' });
        }

        console.log('Login web bem-sucedido:', usuario.email);

        // Armazena dados do usuário na sessão
        req.session.id_usuario = usuario.id;
        req.session.email = usuario.email;
        req.session.nivel = usuario.nivel;
        req.session.id_empresa = usuario.id_empresa;

        return res.json({
            message: 'Login realizado com sucesso!',
            nivel: usuario.nivel, // Adicionando o nível aqui também
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                nivel: usuario.nivel,
                id_empresa: usuario.id_empresa,
                foto_perfil_url: usuario.foto_perfil_url
            }
        });
    });
};

/**
 * Realiza login no sistema via Mobile
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.loginMobile = (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login mobile:', email);

    // Hash da senha para comparação
    const senhaHash = `SHA2('${senha}', 256)`; // Será processado pelo MySQL

    const sql = `
        SELECT 
            u.id, 
            u.email, 
            u.nivel, 
            u.nome,
            u.status,
            u.foto_perfil_url,
            f.id AS id_funcionario,
            f.id_empresa,
            f.registro_emp,
            f.funcao
        FROM USUARIO u
        LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
        WHERE u.email = ? AND u.senha = ${senhaHash} AND u.nivel = 'FUNCIONARIO'
    `;

    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Erro no login mobile:', err);
            return res.status(500).json({ message: 'Erro interno do servidor' });
        }

        if (results.length === 0) {
            console.warn('Tentativa de login mobile com credenciais inválidas:', email);
            return res.status(401).json({ message: 'Email ou senha inválidos ou conta não é de funcionário!' });
        }

        const usuario = results[0];

        // Verificar se usuário está ativo
        if (usuario.status !== 'Ativo') {
            console.warn('Tentativa de login mobile de usuário inativo:', email);
            return res.status(403).json({ message: 'Sua conta está inativa. Contate o administrador.' });
        }

        console.log('Login mobile bem-sucedido:', usuario.email);

        return res.json({
            message: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                id_funcionario: usuario.id_funcionario,
                nome: usuario.nome,
                email: usuario.email,
                id_empresa: usuario.id_empresa,
                registro_emp: usuario.registro_emp,
                funcao: usuario.funcao,
                foto_perfil_url: usuario.foto_perfil_url
            }
        });
    });
};

/**
 * Solicita recuperação de senha
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.solicitarRecuperacaoSenha = (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório!' });
    }

    // 1. Verificar se o email existe
    const sqlCheckEmail = 'SELECT id FROM USUARIO WHERE email = ?';
    db.query(sqlCheckEmail, [email], (err, results) => {
        if (err) {
            console.error('Erro ao verificar email:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Email não encontrado' });
        }

        const userId = results[0].id;
        
        // 2. Gerar token de recuperação (válido por 1 hora)
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = new Date(Date.now() + 3600000); // 1 hora
        
        // 3. Salvar token no banco
        const sqlSaveToken = 'UPDATE USUARIO SET reset_token = ?, reset_token_expires = ? WHERE id = ?';
        db.query(sqlSaveToken, [token, expiration, userId], (err) => {
            if (err) {
                console.error('Erro ao salvar token:', err);
                return res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
            }
            
            // 4. Enviar email com o token (simulado)
            console.log(`Token de recuperação para ${email}: ${token}`);
            
            return res.json({ 
                message: 'Instruções de recuperação enviadas para seu email',
                token // Em produção, não enviar o token na resposta
            });
        });
    });
};

/**
 * Reseta a senha do usuário
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.resetarSenha = (req, res) => {
    const { token, novaSenha } = req.body;
    
    if (!token || !novaSenha) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios!' });
    }

    // 1. Verificar token válido e não expirado
    const sqlCheckToken = 'SELECT id FROM USUARIO WHERE reset_token = ? AND reset_token_expires > NOW()';
    db.query(sqlCheckToken, [token], (err, results) => {
        if (err) {
            console.error('Erro ao verificar token:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Token inválido ou expirado' });
        }

        const userId = results[0].id;
        const senhaHash = `SHA2('${novaSenha}', 256)`;
        
        // 2. Atualizar senha e limpar token
        const sqlUpdatePassword = 'UPDATE USUARIO SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
        db.query(sqlUpdatePassword, [senhaHash, userId], (err) => {
            if (err) {
                console.error('Erro ao atualizar senha:', err);
                return res.status(500).json({ error: 'Erro ao resetar senha' });
            }
            
            return res.json({ message: 'Senha alterada com sucesso!' });
        });
    });
};

/**
 * Obtém o perfil do usuário logado
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.obterPerfil = (req, res) => {
    const userId = req.usuario.id; // Assumindo que o authMiddleware adiciona o usuário na requisição
    
    const sql = `
        SELECT 
            u.id, u.nome, u.email, u.nivel, u.cpf, u.foto_perfil_url,
            f.registro_emp, f.funcao, f.data_admissao, f.id_empresa
        FROM USUARIO u
        LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
        WHERE u.id = ?
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao obter perfil:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        return res.json(results[0]);
    });
};

/**
 * Atualiza o perfil do usuário
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.atualizarPerfil = (req, res) => {
    const userId = req.usuario.id;
    const { nome, cpf, foto_perfil_url } = req.body;
    
    const sql = 'UPDATE USUARIO SET nome = ?, cpf = ?, foto_perfil_url = ? WHERE id = ?';
    db.query(sql, [nome, cpf, foto_perfil_url, userId], (err) => {
        if (err) {
            console.error('Erro ao atualizar perfil:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        return res.json({ message: 'Perfil atualizado com sucesso!' });
    });
};

/**
 * Altera a senha do usuário logado
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.alterarSenha = (req, res) => {
    const userId = req.usuario.id;
    const { senhaAtual, novaSenha } = req.body;
    
    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias!' });
    }
    
    // 1. Verificar senha atual
    const sqlCheckPassword = `SELECT id FROM USUARIO WHERE id = ? AND senha = SHA2('${senhaAtual}', 256)`;
    db.query(sqlCheckPassword, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao verificar senha:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        
        // 2. Atualizar senha
        const senhaHash = `SHA2('${novaSenha}', 256)`;
        const sqlUpdatePassword = 'UPDATE USUARIO SET senha = ? WHERE id = ?';
        db.query(sqlUpdatePassword, [senhaHash, userId], (err) => {
            if (err) {
                console.error('Erro ao atualizar senha:', err);
                return res.status(500).json({ error: 'Erro ao alterar senha' });
            }
            
            return res.json({ message: 'Senha alterada com sucesso!' });
        });
    });
};

/**
 * Lista todos os usuários (apenas para IT Support)
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.listarUsuarios = (req, res) => {
    const sql = `
        SELECT 
            u.id, u.nome, u.email, u.nivel, u.status, u.foto_perfil_url,
            f.id_empresa, e.nome AS nome_empresa
        FROM USUARIO u
        LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario
        LEFT JOIN EMPRESA e ON f.id_empresa = e.id
        ORDER BY u.nome
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao listar usuários:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        return res.json(results);
    });
};

/**
 * Altera o status de um usuário (apenas para IT Support)
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
exports.alterarStatusUsuario = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Ativo', 'Inativo'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido! Deve ser "Ativo" ou "Inativo"' });
    }
    
    const sql = 'UPDATE USUARIO SET status = ? WHERE id = ?';
    db.query(sql, [status, id], (err) => {
        if (err) {
            console.error('Erro ao alterar status:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        return res.json({ message: `Status do usuário alterado para ${status}` });
    });
};