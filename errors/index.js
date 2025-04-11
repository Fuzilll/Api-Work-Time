class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}


class UnauthorizedError extends AppError {
    constructor(message = 'Não autorizado') {
        super(message, 401);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado') {
        super(message, 403);
    }
}
class NotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
      this.statusCode = 404;
    }
  }
// Altere o final do arquivo para:
module.exports = {
    AppError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    errors: { // Mantenha isso se outros arquivos dependem dessa estrutura
        NotFoundError,
        UnauthorizedError,
        ForbiddenError
    }
};