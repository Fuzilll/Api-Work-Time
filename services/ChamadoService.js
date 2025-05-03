const db = require('../config/db');
const { AppError } = require('../errors');

class ChamadoService {
    // Criar um novo chamado
    static async criarChamado(dados) {
        const { usuario_id, empresa_id, assunto, categoria, descricao, prioridade } = dados;
    
        const prioridadeMap = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'critica': 'Crítica'
        };
    
        if (!prioridadeMap[prioridade]) {
            throw new AppError('Prioridade inválida no serviço', 400);
        }
        const prioridadeBanco = prioridadeMap[prioridade];
    
        try {
            // Verificar se o usuário existe
            const usuarioRows = await db.query('SELECT id FROM USUARIO WHERE id = ?', [usuario_id]);
            if (usuarioRows.length === 0) {
                throw new AppError('Usuário não encontrado', 404);
            }
    
            // Verificar se a empresa existe (se fornecida)
            if (empresa_id) {
                const empresaRows = await db.query('SELECT id FROM EMPRESA WHERE id = ?', [empresa_id]);
                if (empresaRows.length === 0) {
                    throw new AppError('Empresa não encontrada', 404);
                }
            }
    
            // Inserir no banco de dados
            const insertResult = await db.query(
                `INSERT INTO CHAMADOS (
                    usuario_id, empresa_id, assunto, categoria, descricao, prioridade, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'Aberto')`,
                [usuario_id, empresa_id || null, assunto, categoria, descricao, prioridadeBanco]
            );
    
            // Obter o chamado criado
            const chamadoRows = await db.query(
                `SELECT * FROM CHAMADOS WHERE id = ?`,
                [insertResult.insertId]
            );
    
            if (chamadoRows.length === 0) {
                throw new AppError('Falha ao recuperar chamado criado', 500);
            }
    
            return chamadoRows[0];
    
        } catch (err) {
            console.error('Erro no ChamadoService.criarChamado:', {
                message: err.message,
                stack: err.stack,
                code: err.code,
                sqlState: err.sqlState
            });
    
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new AppError('Usuário ou empresa inválido', 400);
            }
            if (err.code === 'ER_DATA_TOO_LONG') {
                throw new AppError('Dados muito longos para as colunas do banco de dados', 400);
            }
    
            throw new AppError('Erro interno ao criar chamado', 500);
        }
    }
    // Listar chamados com filtros
    static async listarChamados(filtros = {}) {
        const { status, prioridade, empresa_id, usuario_id } = filtros;
        let query = `SELECT c.*, u.nome as usuario_nome, e.nome as empresa_nome 
                     FROM CHAMADOS c
                     JOIN USUARIO u ON c.usuario_id = u.id
                     LEFT JOIN EMPRESA e ON c.empresa_id = e.id
                     WHERE 1=1`;
        const params = [];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (prioridade) {
            query += ' AND c.prioridade = ?';
            params.push(prioridade);
        }

        if (empresa_id) {
            query += ' AND c.empresa_id = ?';
            params.push(empresa_id);
        }

        if (usuario_id) {
            query += ' AND c.usuario_id = ?';
            params.push(usuario_id);
        }

        query += ' ORDER BY c.criado_em DESC';

        const [chamados] = await db.query(query, params);
        return chamados;
    }

    // Obter um chamado por ID
    static async obterChamado(id, usuario_id, nivel) {
        const [chamado] = await db.query(
            `SELECT c.*, u.nome as usuario_nome, e.nome as empresa_nome 
             FROM CHAMADOS c
             JOIN USUARIO u ON c.usuario_id = u.id
             LEFT JOIN EMPRESA e ON c.empresa_id = e.id
             WHERE c.id = ?`,
            [id]
        );

        if (!chamado) {
            throw new AppError('Chamado não encontrado', 404);
        }

        // Verificar se o usuário tem permissão para ver o chamado
        if (nivel === 'FUNCIONARIO' && chamado.usuario_id !== usuario_id) {
            throw new AppError('Você não tem permissão para acessar este chamado', 403);
        }

        return chamado;
    }

    // Atualizar um chamado
    static async atualizarChamado(id, usuario_id, dados) {
        const camposPermitidos = ['status', 'prioridade', 'descricao', 'categoria'];
        const camposParaAtualizar = {};

        // Filtrar apenas os campos permitidos
        for (const campo of camposPermitidos) {
            if (dados[campo] !== undefined) {
                camposParaAtualizar[campo] = dados[campo];
            }
        }

        if (Object.keys(camposParaAtualizar).length === 0) {
            throw new AppError('Nenhum campo válido para atualização', 400);
        }

        // Verificar se o chamado existe e pertence ao usuário (se for funcionário)
        const [chamado] = await db.query(
            'SELECT usuario_id FROM CHAMADOS WHERE id = ?',
            [id]
        );

        if (!chamado) {
            throw new AppError('Chamado não encontrado', 404);
        }

        // Verificar se o usuário é o criador do chamado ou tem permissão (IT_SUPPORT/ADMIN)
        const [usuario] = await db.query(
            'SELECT nivel FROM USUARIO WHERE id = ?',
            [usuario_id]
        );

        if (usuario.nivel === 'FUNCIONARIO' && chamado.usuario_id !== usuario_id) {
            throw new AppError('Você não tem permissão para atualizar este chamado', 403);
        }

        // Construir a query de atualização
        let query = 'UPDATE CHAMADOS SET ';
        const params = [];
        const setClauses = [];

        for (const [campo, valor] of Object.entries(camposParaAtualizar)) {
            setClauses.push(`${campo} = ?`);
            params.push(valor);
        }

        query += setClauses.join(', ') + ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        // Retornar o chamado atualizado
        return await this.obterChamadoPorId(id);
    }

    // Adicionar anexo ou foto ao chamado
    static async adicionarAnexo(id, usuario_id, campo, url) {
        if (campo !== 'anexo_url' && campo !== 'foto_url') {
            throw new AppError('Tipo de anexo inválido', 400);
        }

        // Verificar se o chamado existe
        const [chamado] = await db.query(
            'SELECT usuario_id FROM CHAMADOS WHERE id = ?',
            [id]
        );

        if (!chamado) {
            throw new AppError('Chamado não encontrado', 404);
        }

        // Verificar se o usuário é o criador do chamado
        if (chamado.usuario_id !== usuario_id) {
            throw new AppError('Você não tem permissão para modificar este chamado', 403);
        }

        await db.query(
            `UPDATE CHAMADOS SET ${campo} = ? WHERE id = ?`,
            [url, id]
        );

        return await this.obterChamadoPorId(id);
    }

    // Método auxiliar para obter chamado por ID
    static async obterChamadoPorId(id) {
        const [chamado] = await db.query(
            `SELECT c.*, u.nome as usuario_nome, e.nome as empresa_nome 
             FROM CHAMADOS c
             JOIN USUARIO u ON c.usuario_id = u.id
             LEFT JOIN EMPRESA e ON c.empresa_id = e.id
             WHERE c.id = ?`,
            [id]
        );

        return chamado;
    }
}

module.exports = ChamadoService;