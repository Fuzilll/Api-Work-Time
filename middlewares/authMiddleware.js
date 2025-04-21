// Importa o módulo de configuração do banco de dados
// Este módulo permite realizar queries ao banco de dados em outras partes do código
const db = require('../config/db');

// Importa erros personalizados, como UnauthorizedError e ForbiddenError, para usar em validações
const { UnauthorizedError, ForbiddenError } = require('../errors');

// Importa a biblioteca JWT para validar e verificar tokens de autenticação
const jwt = require('jsonwebtoken');

// Classe AuthMiddleware, responsável pela autenticação e controle de permissões
class AuthMiddleware {

    // Método estático de autenticação, responsável por verificar o token JWT ou sessão do usuário
    // Este método é usado em rotas protegidas para garantir que o usuário esteja autenticado
    static async autenticacao(req, res, next) {
        console.log('[AUTH] Iniciando processo de autenticação');
        try {
            // 1. Verificar métodos de autenticação
            const token = req.headers.authorization?.split(' ')[1];
            const sessionAuth = req.session?.id_usuario;

            console.log('[AUTH] Token presente:', !!token);
            console.log('[AUTH] Sessão presente:', !!sessionAuth);

            if (!token && !sessionAuth) {
                console.log('[AUTH] Nenhum método de autenticação encontrado');
                throw new UnauthorizedError('Acesso não autorizado');
            }

            // 2. Priorizar token JWT se existir
            if (token) {
                console.log('[AUTH] Autenticando via JWT');
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    console.log('[AUTH] Token decodificado:', decoded);

                    req.usuario = {
                        id: decoded.id,
                        nivel: decoded.nivel,
                        id_empresa: decoded.id_empresa
                    };
                } catch (jwtError) {
                    console.error('[AUTH] Erro na verificação do token:', jwtError);
                    throw new UnauthorizedError('Token inválido ou expirado');
                }
            } else {
                // 3. Fallback para autenticação por sessão
                console.log('[AUTH] Autenticando via sessão');
                const usuario = await AuthMiddleware.loadUserData(sessionAuth);
                req.usuario = AuthMiddleware.formatUserData(usuario);
            }

            // 4. Verificações adicionais
            if (!req.usuario) {
                console.log('[AUTH] Dados do usuário não encontrados');
                throw new UnauthorizedError('Dados do usuário inválidos');
            }

            console.log('[AUTH] Usuário autenticado:', {
                id: req.usuario.id,
                nivel: req.usuario.nivel,
                empresa: req.usuario.id_empresa
            });

            AuthMiddleware.logAccess(req.usuario);
            next();

        } catch (err) {
            console.error('[AUTH] Erro na autenticação:', {
                message: err.message,
                stack: err.stack
            });
            next(err);
        }
    }

    static async loadUserData(userId) {
        console.log('[AUTH] Carregando dados do usuário ID:', userId);

        try {
            const [usuario] = await db.query(`
                SELECT 
                    u.id, u.nome, u.email, u.nivel, u.status,
                    a.id_empresa, a.permissoes, 
                    f.id_empresa as func_empresa
                FROM USUARIO u
                LEFT JOIN ADMIN a ON u.id = a.id_usuario AND u.nivel = 'ADMIN'
                LEFT JOIN FUNCIONARIO f ON u.id = f.id_usuario AND u.nivel = 'FUNCIONARIO'
                WHERE u.id = ? AND u.status = 'Ativo'
            `, [userId]);

            if (!usuario) {
                console.log('[AUTH] Usuário não encontrado ou inativo');
                throw new UnauthorizedError('Usuário não encontrado ou conta inativa');
            }

            console.log('[AUTH] Dados carregados do banco:', {
                id: usuario.id,
                nivel: usuario.nivel,
                empresa: usuario.id_empresa || usuario.func_empresa
            });

            return usuario;
        } catch (dbError) {
            console.error('[AUTH] Erro no banco de dados:', dbError);
            throw new UnauthorizedError('Erro ao verificar credenciais');
        }
    }

    static formatUserData(usuario) {
        console.log('[AUTH] Formatando dados do usuário:', usuario.id);

        const userData = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            nivel: usuario.nivel,
            status: usuario.status,
            id_empresa: usuario.id_empresa || usuario.func_empresa
        };

        // Permissões para ADMIN
        if (usuario.nivel === 'ADMIN' && usuario.permissoes) {
            console.log('[AUTH] Processando permissões para ADMIN');
            userData.permissoes = this.parsePermissions(usuario.permissoes);
        }

        // Permissões para IT_SUPPORT
        if (usuario.nivel === 'IT_SUPPORT') {
            console.log('[AUTH] Definindo permissões totais para IT_SUPPORT');
            userData.permissoes = { acesso_total: true };
        }

        return userData;
    }

    static parsePermissions(permissions) {
        try {
            console.log('[AUTH] Parseando permissões:', permissions);
            return typeof permissions === 'string' ?
                JSON.parse(permissions) : permissions;
        } catch (e) {
            console.error('[AUTH] Erro ao parsear permissões:', e);
            return {};
        }
    }

    static logAccess(usuario) {
        console.log(`[AUTH] 🔒 Acesso autorizado: ${usuario.nome} (${usuario.nivel})`);
        console.log(`[AUTH] 📌 Empresa: ${usuario.id_empresa}`);
        if (usuario.permissoes) {
            console.log('[AUTH] 🔑 Permissões:', usuario.permissoes);
        }
    }

    // Método de middleware para verificar se o usuário tem o nível adequado para acessar uma rota
    // Utiliza uma lista de níveis requeridos para comparar com o nível do usuário
    static verificarNivel(niveisRequeridos) {
        return (req, res, next) => {
            try {
                const niveis = Array.isArray(niveisRequeridos) ?
                    niveisRequeridos : // Se os níveis requeridos não forem uma lista, transforma em lista
                    [niveisRequeridos];

                // Verifica se o nível do usuário está entre os níveis permitidos
                if (!niveis.includes(req.usuario.nivel)) {
                    throw new ForbiddenError(
                        `Requer nível: ${niveis.join(' ou ')}` // Caso o nível não seja válido, lança um erro
                    );
                }
                next(); // Caso o nível seja permitido, chama o próximo middleware
            } catch (err) {
                next(err); // Caso ocorra um erro, passa para o próximo middleware de erro
            }
        };
    }
    
    static checkPermission(permission) {
        return (req, res, next) => {
            try {
                // IT_SUPPORT tem acesso total
                if (req.usuario.nivel === 'IT_SUPPORT') return next();

                // ADMIN precisa ter a permissão específica
                if (req.usuario.nivel === 'ADMIN') {
                    if (req.usuario.permissoes && req.usuario.permissoes[permission]) {
                        return next();
                    }
                }

                throw new ForbiddenError(`Permissão necessária: ${permission}`);
            } catch (err) {
                next(err);
            }
        };
    }

    // Método de middleware para verificar se o usuário tem a permissão necessária para acessar uma rota
    static verificarPermissao(permissaoRequerida) {
        return (req, res, next) => {
            try {
                // Se o usuário for IT_SUPPORT, ele terá permissão para tudo
                if (req.usuario.nivel === 'IT_SUPPORT') return next();

                // Se o usuário for ADMIN e tiver a permissão, permite o acesso
                if (req.usuario.nivel === 'ADMIN' &&
                    req.usuario.permissoes?.[permissaoRequerida]) {
                    return next();
                }

                // Caso contrário, lança um erro de permissão negada
                throw new ForbiddenError(
                    `Permissão necessária: ${permissaoRequerida}`
                );
            } catch (err) {
                next(err); // Passa o erro para o próximo middleware de erro
            }
        };
    }

    // Middleware que verifica se o usuário tem permissão para acessar os dados de uma determinada empresa
    static verificarEmpresa() {
        return async (req, res, next) => {
            try {
                // Verifica o ID da empresa fornecido nos parâmetros ou no corpo da requisição
                const idEmpresaParam = req.params.id_empresa || req.body.id_empresa;

                // Se o usuário for IT_SUPPORT, ele tem permissão para acessar qualquer empresa
                if (req.usuario.nivel === 'IT_SUPPORT') return next();

                // Se o usuário for ADMIN e a empresa for a mesma que ele tem acesso, permite o acesso
                if (req.usuario.nivel === 'ADMIN' &&
                    req.usuario.id_empresa == idEmpresaParam) {
                    return next();
                }

                // Se o usuário for FUNCIONARIO e a empresa for a mesma que ele trabalha, permite o acesso
                if (req.usuario.nivel === 'FUNCIONARIO' &&
                    req.usuario.id_empresa == idEmpresaParam) {
                    return next();
                }

                // Caso contrário, lança um erro de permissão
                throw new ForbiddenError(
                    'Sem permissão para acessar dados desta empresa'
                );
            } catch (err) {
                next(err); // Passa o erro para o próximo middleware de erro
            }
        };
    }
}


// Exporta a classe AuthMiddleware para ser utilizada em outras partes do código
module.exports = AuthMiddleware;
