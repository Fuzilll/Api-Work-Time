// Exporta um objeto com a função `validate` que pode ser utilizada para validação de dados
module.exports = {
  
  // Função `validate` recebe um schema (usualmente de validação Joi) como parâmetro
  // O objetivo desta função é validar o corpo da requisição (req.body) contra o schema fornecido
  validate: (schema) => {

    // Retorna um middleware para ser usado nas rotas que necessitam validação
    return (req, res, next) => {

      // Valida o corpo da requisição usando o schema passado como parâmetro
      // A opção `abortEarly: false` faz com que a validação continue mesmo após encontrar o primeiro erro,
      // retornando todos os erros encontrados.
      const { error } = schema.validate(req.body, { abortEarly: false });

      // Se não houver erro, o middleware chama `next()` para continuar o fluxo de execução da requisição
      if (!error) return next();

      // Caso haja erro de validação, mapeia os detalhes dos erros encontrados
      const errors = error.details.map(err => ({
        campo: err.context.label || err.path[0],  // A chave `label` refere-se ao nome do campo no schema. Se não existir, utiliza a primeira parte do caminho (`err.path[0]`).
        mensagem: err.message // A mensagem de erro retornada pela validação (o que é inválido)
      }));

      // Retorna uma resposta JSON com o status 422 (Unprocessable Entity), indicando que houve erros de validação
      // A resposta inclui um array de erros com o campo e a mensagem de erro para cada falha de validação.
      return res.status(422).json({
        success: false,  // Indica que a requisição falhou devido a erros de validação
        errors  // A lista de erros encontrados durante a validação
      });
    };
  }
};
