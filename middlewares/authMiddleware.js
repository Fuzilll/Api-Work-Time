const db = require('../config/db');

/**
 * Middleware principal de autenticação
 * Verifica se o usuário está logado e adiciona informações ao req
 */
exports.autenticacao = (req, res, next) => {
    console.log('Sessão recebida:', req.session);
    console.log('Cookies recebidos:', req.headers.cookie);
    console.log('Headers da requisição:', req.headers);

    if (!req.session.id_usuario) {
        console.log('Acesso não autorizado - Sem id_usuario na sessão');
        return res.status(401).json({ 
            error: 'Não autorizado',
            message: 'Você precisa estar logado para acessar este recurso'
        });
    }

    // Adicionar informações básicas do usuário à requisição
    req.id_usuario = req.session.id_usuario;
    req.nivel = req.session.nivel;
    req.id_empresa = req.session.id_empresa;

    // Se for admin, carregar também as permissões
    if (req.nivel === 'ADMIN') {
        db.query(
            'SELECT permissoes FROM ADMIN WHERE id_usuario = ?',
            [req.id_usuario],
            (err, results) => {
                if (err) {
                    console.error('Erro ao carregar permissões:', err);
                    return res.status(500).json({ 
                        error: 'Erro interno',
                        message: 'Falha ao verificar permissões do administrador'
                    });
                }

                if (results.length === 0) {
                    return res.status(403).json({
                        error: 'Acesso negado',
                        message: 'Administrador não encontrado'
                    });
                }

                try {
                    // Adicionar permissões ao objeto req
                    req.permissoes = JSON.parse(results[0].permissoes);
                    next();
                } catch (e) {
                    console.error('Erro ao parsear permissões:', e);
                    res.status(500).json({ 
                        error: 'Erro interno',
                        message: 'Falha ao interpretar permissões'
                    });
                }
            }
        );
    } else {
        next();
    }
};

/**
 * Middleware para verificar nível de acesso
 * @param {string} nivelRequerido - Nível requerido (IT_SUPPORT, ADMIN, FUNCIONARIO)
 */
exports.verificarNivel = (nivelRequerido) => {
    return (req, res, next) => {
        if (req.nivel !== nivelRequerido) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: `Esta ação requer nível de acesso ${nivelRequerido}`
            });
        }
        next();
    };
};

/**
 * Middleware para verificar permissões específicas de admin
 * @param {string} permissaoRequerida - Nome da permissão requerida
 */
exports.verificarPermissao = (permissaoRequerida) => {
    return (req, res, next) => {
        // Primeiro verificar se é admin
        if (req.nivel !== 'ADMIN') {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Esta ação requer privilégios de administrador'
            });
        }

        // Verificar se tem a permissão específica
        if (!req.permissoes || !req.permissoes[permissaoRequerida]) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: `Você não tem permissão para ${permissaoRequerida.replace('_', ' ')}`,
                permissaoRequerida
            });
        }

        next();
    };
};

/**
 * Middleware para verificar se o usuário tem acesso aos dados da empresa
 */
exports.verificarEmpresa = (req, res, next) => {
    const id_empresa = req.params.id_empresa || req.params.id;
    
    if (req.nivel === 'IT_SUPPORT') { 
        return next();
    }
 
    if (req.nivel === 'ADMIN' && req.id_empresa === id_empresa) { 
        return next();
    }

    res.status(403).json({ 
        error: 'Acesso negado: sem permissão para esta empresa',
        empresaSolicitada: id_empresa,
        suaEmpresa: req.id_empresa 
    });
};