const db = require('../config/db');

// Cadastrar Empresa
exports.cadastrarEmpresa = (req, res) => {
    const { nome, cnpj, cidade, cep, rua, numero, id_estado, ramo_de_atuacao, email} = req.body;
    
    console.log(`Cadastrando empresa: ${nome}, CNPJ: ${cnpj}`);  // Depuração

    const sql = 'INSERT INTO EMPRESA (nome, cnpj, cidade, cep, rua, numero, id_estado, ramo_de_atuacao, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [nome, cnpj, cidade, cep, rua, numero, id_estado, ramo_de_atuacao, email], (err) => {
        if (err) {
            console.log('Erro ao cadastrar empresa:', err); 
            return res.status(500).json({ error: err.message });
        }
        console.log('Empresa cadastrada com sucesso!');  
        res.json({ message: 'Empresa cadastrada com sucesso!' });
    });
};

// Remover Empresa
exports.removerEmpresa = (req, res) => {
    const { id } = req.params;

    console.log(`Removendo empresa com ID: ${id}`);  // Depuração

    const sql = 'DELETE FROM EMPRESA WHERE id = ?';
    
    // A consulta SQL deleta a empresa com o ID informado
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log('Erro ao remover empresa:', err.message); // Depuração
            return res.status(500).json({ error: err.message });
        }
        
        console.log('Resultado da remoção:', result); // Depuração
        if (result.affectedRows === 0) {
            console.log('Empresa não encontrada'); // Depuração
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }
        
        console.log('Empresa removida com sucesso!');  // Depuração
        res.json({ message: 'Empresa removida com sucesso!' });
    });
};

// Cadastrar Administrador
exports.cadastrarAdmin = (req, res) => {
    const { nome, email, senha, id_empresa } = req.body;

    console.log(`Cadastrando administrador: ${nome}, Empresa ID: ${id_empresa}`); 

    if (!id_empresa) {
        return res.status(400).json({ error: "ID da empresa é obrigatório." });
    }

    const sqlUsuario = 'INSERT INTO USUARIO (nome, email, senha, nivel, status) VALUES (?, ?, ?, "ADMIN", "Ativo")';
    
    db.query(sqlUsuario, [nome, email, senha], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).json({ error: err.message });
        }

        const id_usuario = result.insertId;
        console.log(`Usuário cadastrado com ID: ${id_usuario}`);

        const sqlAdmin = 'INSERT INTO ADMIN (id_usuario, id_empresa) VALUES (?, ?)';

        db.query(sqlAdmin, [id_usuario, id_empresa], (err) => {
            if (err) {
                console.error('Erro ao cadastrar administrador:', err);
                return res.status(500).json({ error: err.message });
            }

            console.log('Administrador cadastrado com sucesso!');
            res.json({ message: 'Administrador cadastrado com sucesso!' });
        });
    });
};


// Remover Administrador
exports.removerAdmin = (req, res) => {
    const { id } = req.params;
    
    console.log(`Removendo administrador com ID: ${id}`);  // Depuração

    const sql = 'DELETE FROM USUARIO WHERE id = ? AND nivel = "ADMIN"';
    
    // A consulta SQL deleta o administrador com o ID informado
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log('Erro ao remover administrador:', err); // Depuração
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            console.log('Administrador não encontrado'); // Depuração
            return res.status(404).json({ message: 'Administrador não encontrado' });
        }

        console.log('Administrador removido com sucesso!');  // Depuração
        res.json({ message: 'Administrador removido com sucesso!' });
    });
};

// Listar Empresas
exports.listarEmpresas = (req, res) => {
    console.log('Listando todas as empresas');  // Depuração
    
    const query = 'SELECT id, nome, email, ramo_de_atuacao, status FROM EMPRESA';
    
    db.query(query, (error, results) => {
        if (error) {
            console.log('Erro ao buscar empresas:', error);  // Depuração
            return res.status(500).json({ error: 'Erro ao buscar empresas', details: error.message });
        }
        
        if (results.length === 0) {
            console.log('Nenhuma empresa encontrada'); // Depuração
            return res.status(404).json({ message: 'Nenhuma empresa encontrada' });
        }
        
        console.log(`Empresas encontradas: ${results.length}`);  // Depuração
        res.status(200).json(results);
    });
};

//alterando status
exports.alternarStatusEmpresa = (req, res) => {
    const { id } = req.params;

    console.log(`Alternando status da empresa com ID: ${id}`); // Depuração

    const sql = 'UPDATE EMPRESA SET status = IF(status = "Ativo", "Inativo", "Ativo") WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Erro ao alternar status da empresa:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            console.log('Empresa não encontrada');
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }

        console.log('Status da empresa atualizado com sucesso!');
        res.json({ message: 'Status atualizado com sucesso!' });
    });
};