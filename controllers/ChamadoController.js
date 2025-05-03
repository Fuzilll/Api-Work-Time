const ChamadoService = require('../services/ChamadoService');
const { AppError } = require('../errors');

class ChamadoController {
    
    static async criarChamado(req, res, next) {
        try {
            const { id: usuario_id } = req.usuario;
            const { empresa_id, assunto, categoria, descricao, prioridade = 'media' } = req.body;
    
            if (!assunto || !descricao) {
                throw new AppError('Assunto e descrição são obrigatórios', 400);
            }
    
            const prioridadeNormalizada = prioridade.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            const prioridadesValidas = ['baixa', 'media', 'alta', 'critica'];
            if (!prioridadesValidas.includes(prioridadeNormalizada)) {
                throw new AppError('Prioridade inválida. Valores aceitos: baixa, media, alta, critica', 400);
            }
    
            const chamado = await ChamadoService.criarChamado({
                usuario_id,
                empresa_id: empresa_id || null,
                assunto,
                categoria: categoria || 'outros',
                descricao,
                prioridade: prioridadeNormalizada
            });
    
            res.status(201).json({
                success: true,
                data: chamado
            });
    
        } catch (err) {
            console.error('Erro no ChamadoController.criarChamado:', {
                error: err.stack,
                body: req.body,
                user: req.usuario.id,
                timestamp: new Date().toISOString()
            });
            next(err);
        }
    }


    // Listar todos os chamados (com filtros opcionais)
    static async listarChamados(req, res, next) {
        try {
            const { status, prioridade, empresa_id } = req.query;
            const { id: usuario_id, nivel } = req.usuario;

            const filtros = {
                status,
                prioridade,
                empresa_id,
                usuario_id: nivel === 'FUNCIONARIO' ? usuario_id : null
            };

            const chamados = await ChamadoService.listarChamados(filtros);

            res.json({
                success: true,
                data: chamados
            });
        } catch (err) {
            next(err);
        }
    }

    // Obter detalhes de um chamado específico
    static async obterChamado(req, res, next) {
        try {
            const { id } = req.params;
            const { id: usuario_id, nivel } = req.usuario;

            const chamado = await ChamadoService.obterChamado(id, usuario_id, nivel);

            res.json({
                success: true,
                data: chamado
            });
        } catch (err) {
            next(err);
        }
    }

    // Atualizar um chamado
    static async atualizarChamado(req, res, next) {
        try {
            const { id } = req.params;
            const { id: usuario_id } = req.usuario;
            const dadosAtualizacao = req.body;

            const chamado = await ChamadoService.atualizarChamado(id, usuario_id, dadosAtualizacao);

            res.json({
                success: true,
                data: chamado
            });
        } catch (err) {
            next(err);
        }
    }

    // Adicionar anexo/foto ao chamado
    static async adicionarAnexo(req, res, next) {
        try {
            const { id } = req.params;
            const { id: usuario_id } = req.usuario;
            const { tipo, url } = req.body; // 'anexo' ou 'foto'

                    //   Anexo das imagem aos chamados implementar depois
                        if (!tipo || !url) {
                         throw new AppError('Tipo e URL são obrigatórios', 400);
                       }

            const campo = tipo === 'anexo' ? 'anexo_url' : 'foto_url';
            const chamado = await ChamadoService.adicionarAnexo(id, usuario_id, campo, url);

            res.json({
                success: true,
                data: chamado
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = ChamadoController;