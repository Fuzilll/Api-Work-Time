exports.verificarSessao = (req, res, next) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    req.id_usuario = req.session.usuarioId;
    req.nivel_usuario = req.session.nivel;
    req.id_empresa = req.session.empresaId;

    next();
};
