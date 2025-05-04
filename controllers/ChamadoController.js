const ChamadoService = require('../services/ChamadoService');
const { AppError } = require('../errors');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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


    static async listarEmpresas(req, res, next) {
        try {
            const empresas = await ChamadoService.listarEmpresasAtivas();

            res.json({
                success: true,
                data: empresas
            });
        } catch (err) {
            console.error('Erro no ChamadoController.listarEmpresas:', {
                error: err.stack,
                user: req.usuario?.id,
                timestamp: new Date().toISOString()
            });
            next(err);
        }
    }

    // No seu ChamadoController, adicione logs:
    static async listarChamados(req, res, next) {
        try {
            console.log('[BACKEND] Parâmetros recebidos:', req.query);
            console.log('[BACKEND] Usuário:', req.usuario);

            const { status, prioridade, empresa_id } = req.query;
            const { id: usuario_id, nivel } = req.usuario;

            const filtros = {
                status,
                prioridade,
                empresa_id,
                usuario_id: nivel === 'FUNCIONARIO' ? usuario_id : null
            };

            console.log('[BACKEND] Filtros aplicados:', filtros);

            const chamados = await ChamadoService.listarChamados(filtros);
            console.log('[BACKEND] Resultado da consulta:', chamados);

            res.json({
                success: true,
                data: chamados
            });
        } catch (err) {
            console.error('[BACKEND] Erro:', err);
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

            console.log(`[adicionarAnexo] Início - Chamado ID: ${id}, Usuário ID: ${usuario_id}, Tipo: ${tipo}, URL: ${url}`);

            if (!tipo || !url) {
                console.warn('[adicionarAnexo] Tipo ou URL ausente');
                throw new AppError('Tipo e URL são obrigatórios', 400);
            }

            const campo = tipo === 'anexo' ? 'anexo_url' : 'foto_url';
            const chamado = await ChamadoService.adicionarAnexo(id, usuario_id, campo, url);

            console.log(`[adicionarAnexo] Sucesso - Anexo adicionado ao chamado ID: ${id}`);

            res.json({
                success: true,
                data: chamado
            });
        } catch (err) {
            console.error(`[adicionarAnexo] Erro - ${err.message}`);
            next(err);
        }
    }

    static async uploadMidia(req, res, next) {
        try {
            const { id } = req.params;
            const { id: usuario_id } = req.usuario;

            console.log('[uploadMidia] Início - Chamado ID:', id, 'Usuário ID:', usuario_id);
            console.log('[uploadMidia] Arquivo recebido:', req.file);

            if (!req.file) {
                console.warn('[uploadMidia] Nenhum arquivo recebido');
                throw new AppError('Nenhum arquivo enviado', 400);
            }

            // Verifique o tipo pelo nome do campo ou extensão do arquivo
            const tipo = req.file.mimetype.startsWith('image/') ? 'foto' : 'anexo';
            console.log('[uploadMidia] Tipo determinado:', tipo);

            const chamado = await ChamadoService.adicionarMidiaChamado(
                id,
                usuario_id,
                tipo,
                req.file
            );

            console.log('[uploadMidia] Sucesso - Mídia adicionada:', chamado);

            res.json({
                success: true,
                data: chamado
            });
        } catch (error) {
            console.error('[uploadMidia] Erro:', error.message, error.stack);
            next(error);
        }
    }

}

module.exports = ChamadoController;