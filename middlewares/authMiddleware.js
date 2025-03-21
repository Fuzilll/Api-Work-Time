// authMiddleware.js
exports.verificarAcesso = (nivelPermitido) => {
    return (req, res, next) => {
        const { usuario } = req;
        if (!usuario || usuario.nivel !== nivelPermitido) {
            return res.status(403).json({ message: 'Acesso negado!' });
        }
        next();
    };
};