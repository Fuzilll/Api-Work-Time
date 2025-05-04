const db = require('../config/db');
const { AppError } = require('../errors');
const CloudinaryService = require('./CloudinaryService');

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
    static async listarEmpresas() {
        try {
            return await db.query('SELECT id, nome FROM EMPRESA WHERE status = "Ativo" ORDER BY nome');
        } catch (err) {
            console.error('Erro ao listar empresas:', err);
            throw new AppError('Erro ao listar empresas', 500);
        }

    }
    // Adicione este método no ChamadoService
    static async listarEmpresasAtivas() {
        try {
            const empresas = await db.query(
                'SELECT id, nome FROM EMPRESA WHERE status = "Ativo" ORDER BY nome'
            );

            // Verificar se há resultados
            if (!empresas || empresas.length === 0) {
                return [];
            }

            return empresas;
        } catch (err) {
            console.error('Erro no ChamadoService.listarEmpresasAtivas:', {
                message: err.message,
                stack: err.stack,
                code: err.code,
                sqlState: err.sqlState
            });
            throw new AppError('Erro ao listar empresas ativas', 500);
        }
    }

    static async listarChamados(filtros = {}) {
        try {
            console.log('[SERVICE] Executando query com filtros:', filtros);
            const { status, prioridade, empresa_id, usuario_id, page = 1, limit = 10 } = filtros;

            // Validação dos parâmetros
            if (isNaN(page) || isNaN(limit)) {
                throw new AppError('Parâmetros de paginação inválidos', 400);
            }

            const offset = (page - 1) * limit;

            let query = `SELECT SQL_CALC_FOUND_ROWS 
                        c.id, c.assunto, c.categoria, c.prioridade, c.status,
                        c.criado_em, c.descricao, c.foto_url, c.anexo_url,
                        u.nome as usuario_nome, 
                        e.nome as empresa_nome 
                     FROM CHAMADOS c
                     JOIN USUARIO u ON c.usuario_id = u.id
                     LEFT JOIN EMPRESA e ON c.empresa_id = e.id
                     WHERE 1=1`;

            const params = [];

            console.log('[SERVICE] Query final:', query);
            console.log('[SERVICE] Parâmetros:', params);

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

            query += ' ORDER BY c.criado_em DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            // Execução da query com tratamento de erros
            const chamados = await db.query(query, params);

            // Obter total de registros
            const [totalResult] = await db.query('SELECT FOUND_ROWS() as total');
            const total = totalResult[0]?.total || 0;
            const pages = Math.ceil(total / limit);

            console.log('[SERVICE] Resultado do banco:', chamados);
            return {
                chamados: Array.isArray(chamados) ? chamados : [],
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages
            };
        } catch (err) {
            console.error('Erro no ChamadoService.listarChamados:', {
                message: err.message,
                stack: err.stack,
                sqlMessage: err.sqlMessage,
                code: err.code
            });
            throw new AppError('Erro ao buscar chamados no banco de dados', 500);
        }
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

    static async adicionarMidiaChamado(id, usuario_id, tipo, file) {
        try {
            // Verificar se o tipo é válido
            if (!['foto', 'anexo'].includes(tipo)) {
                throw new AppError('Tipo de mídia inválido', 400);
            }

            // Verificar se o arquivo foi fornecido
            if (!file || !file.buffer) {
                throw new AppError('Arquivo não fornecido', 400);
            }

            // Verificar se o chamado existe e pertence ao usuário
            const [chamado] = await db.query(
                'SELECT usuario_id FROM CHAMADOS WHERE id = ?',
                [id]
            );

            if (!chamado) {
                throw new AppError('Chamado não encontrado', 404);
            }

            // Verificar permissão (usuário deve ser o criador ou IT_SUPPORT/ADMIN)
            const [usuario] = await db.query(
                'SELECT nivel FROM USUARIO WHERE id = ?',
                [usuario_id]
            );

            if (usuario.nivel === 'FUNCIONARIO' && chamado.usuario_id !== usuario_id) {
                throw new AppError('Você não tem permissão para modificar este chamado', 403);
            }

            // Fazer upload para o Cloudinary
            const uploadResult = await CloudinaryService.uploadImage(file.buffer, {
                public_id: `chamado_${id}_${tipo}_${Date.now()}`,
                transformation: tipo === 'foto' ? { quality: 'auto', fetch_format: 'auto' } : {}
            });

            // Atualizar o chamado com a URL
            const campo = tipo === 'foto' ? 'foto_url' : 'anexo_url';
            await db.query(
                `UPDATE CHAMADOS SET ${campo} = ? WHERE id = ?`,
                [uploadResult.secure_url, id]
            );

            // Retornar o chamado atualizado
            return await this.obterChamadoPorId(id);
        } catch (error) {
            console.error('Erro no ChamadoService.adicionarMidiaChamado:', error);
            throw error;
        }
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