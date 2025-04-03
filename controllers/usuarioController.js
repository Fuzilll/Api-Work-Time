const db = require('../config/db');

// Cadastrar Usuário
exports.cadastrarUsuario = (req, res) => {
    const { nome, email, senha, nivel, id_empresa } = req.body;
    console.log(`Cadastrando usuário: ${nome}, Nível: ${nivel}, Empresa ID: ${id_empresa || 'N/A'}`);  

    const sql = 'INSERT INTO USUARIOS (nome, email, senha, nivel, id_empresa) VALUES (?, ?, ?, ?, ?)';
    
    // A consulta SQL insere o novo usuário
    db.query(sql, [nome, email, senha, nivel, id_empresa || null], (err, result) => {
        if (err) {
            console.log('Erro ao cadastrar usuário:', err); 
            return res.status(500).json({ error: err.message });
        }

        const id_usuario = result.insertId;
        console.log(`Usuário cadastrado com ID: ${id_usuario}`); 
        
        let tabela, sqlInsert, valores;

        switch (nivel) {
            case 'IT_SUPPORT':
                tabela = 'IT_SUPPORT';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email) VALUES (?, ?, ?)`;
                valores = [id_usuario, nome, email];
                break;
            case 'ADMIN':
                tabela = 'ADMIN';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email, id_empresa) VALUES (?, ?, ?, ?)`;
                valores = [id_usuario, nome, email, id_empresa];
                break;
            case 'FUNCIONARIO':
                tabela = 'FUNCIONARIO';
                sqlInsert = `INSERT INTO ${tabela} (id_usuario, nome, email, id_empresa) VALUES (?, ?, ?, ?)`;
                valores = [id_usuario, nome, email, id_empresa];
                break;
            default:
                console.log('Nível de usuário inválido!'); 
                return res.status(400).json({ error: 'Nível de usuário inválido!' });
        }

        db.query(sqlInsert, valores, (err) => {
            if (err) {
                console.log('Erro ao cadastrar em tabela de nível:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`Usuário ${nome} cadastrado com sucesso!`);  
            res.json({ message: 'Usuário cadastrado com sucesso!' });
        });
    });
}

// Realiza login Web
exports.loginWeb = (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login web:', req.body);

    // Busca os dados do usuário pelo email
    const sql = 'SELECT id, email, senha, nivel FROM USUARIO WHERE email = ?';

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

        // Comparação direta da senha (NÃO RECOMENDADO EM PRODUÇÃO)
        if (senha !== usuario.senha) {
            console.warn('Senha incorreta para:', email);
            return res.status(401).json({ message: 'Email ou senha inválidos!' });
        }

        console.log('Login web bem-sucedido:', usuario);

        // Armazena ID do usuário na sessão
        req.session.id_usuario = usuario.id;
        req.session.email = usuario.email;

        return res.json({
            message: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                email: usuario.email,
                nivel: usuario.nivel,
                id_empresa: usuario.id_empresa
            },
            nivel: usuario.nivel
        });
    });
};


// Realiza login Mobile
exports.login = (req, res) => {
    const { email, senha } = req.body;
    console.log('Tentativa de login mobile:', req.body);  

    const sql = 'SELECT * FROM usuarios WHERE email = ? AND senha = ?';
    db.query(sql, [email, senha], (err, results) => {
        if (err) {
            console.error('Erro no login mobile:', err.message);  
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            console.log('Login mobile realizado com sucesso:', results[0]);  
            res.json({ message: 'Login realizado com sucesso!', usuario: results[0] });
        } else {
            console.warn('Tentativa de login com credenciais inválidas (mobile):', email); 
            res.status(401).json({ message: 'Email ou senha inválidos!' });
        }
    });
};
