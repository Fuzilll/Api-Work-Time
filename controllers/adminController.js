// Importa o serviço de administração, que contém a lógica de negócio
const AdminService = require('../services/adminService');
// Importa classe de erro customizada para tratamento centralizado de erros
const { AppError } = require('../errors');

// Controlador responsável por gerenciar requisições relacionadas a funcionalidades administrativas
// Ambiente de execução: Node.js com Express.js
class AdminController {

  /**
   * @api {post} /funcionarios Cadastrar Funcionário
   * @apiName CadastrarFuncionario
   * @apiGroup Admin
   * 
   * @apiBody {String} nome Nome completo
   * @apiBody {String} email E-mail válido
   * @apiBody {String} senha Mínimo 8 caracteres
   * @apiBody {String} cpf 11 dígitos
   * @apiBody {String} registro_emp Registro na empresa
   * @apiBody {String} funcao Função exercida
   * @apiBody {Date} data_admissao Data de admissão
   * @apiBody {String} departamento Departamento
   * @apiBody {Number} salario_base Salário base
   * @apiBody {String} tipo_contrato CLT/PJ/Estagiario/Temporario
   */
  static async cadastrarFuncionario(req, res, next) {
    try {
      // Verificar se o usuário tem permissão (ADMIN ou IT_SUPPORT)
      if (!['ADMIN', 'IT_SUPPORT'].includes(req.usuario.nivel)) {
        throw new AppError('Acesso não autorizado', 403);
      }

      // Verificar campos obrigatórios
      const camposObrigatorios = ['nome', 'email', 'senha', 'cpf', 'registro_emp',
        'funcao', 'data_admissao', 'tipo_contrato'];

      const faltantes = camposObrigatorios.filter(campo => !req.body[campo]);

      if (faltantes.length > 0) {
        throw new AppError(`Campos obrigatórios faltando: ${faltantes.join(', ')}`, 400);
      }

      // Converter valores numéricos
      if (req.body.salario_base) {
        req.body.salario_base = parseFloat(req.body.salario_base);
      }

      const funcionario = await AdminService.cadastrarFuncionario(
        req.usuario.id_empresa,
        {
          ...req.body,
          horarios: req.body.horarios // Inclui os horários no cadastro
        }
      );

      res.status(201).json({
        success: true,
        data: funcionario,
        id: funcionario.id_funcionario
      });
    } catch (err) {
      next(err);
    }
  }

  /**
 * @api {post} /funcionarios/:id/horarios Cadastrar Horários
 * @apiName CadastrarHorarios
 * @apiGroup Admin
 * 
 * @apiParam {Number} id ID do funcionário
 * @apiBody {Array} horarios Array de objetos de horário
 */
  static async cadastrarHorariosFuncionario(req, res, next) {
    try {
      if (!req.body.horarios || !Array.isArray(req.body.horarios)) {
        throw new AppError('Horários não fornecidos ou formato inválido', 400);
      }

      // Verificação mais robusta
      if (!req.params.id || isNaN(req.params.id)) {
        throw new AppError('ID do funcionário inválido', 400);
      }

      // Converter para número
      const idFuncionario = parseInt(req.params.id);

      // Verificar existência
      await AdminService.verificarFuncionarioExistente(idFuncionario);

      // Cadastrar horários
      const resultado = await AdminService.cadastrarHorarios(
        idFuncionario,
        req.body.horarios
      );

      res.status(201).json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * Retorna um resumo dos funcionários cadastrados
   * - Objetivo: fornecer visão agregada para o painel do admin
   */
  static async resumoFuncionarios(req, res, next) {
    try {
      // Chama o serviço que monta o resumo baseado no id da empresa
      const resumo = await AdminService.resumoFuncionarios(req.usuario.id_empresa);

      res.json({
        success: true,
        data: resumo
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gera um relatório detalhado de pontos dos funcionários
   * - Utilizado para análises mais profundas ou exportação de dados
   * - query string usada para filtros (ex: período, status, etc.)
   */
  static async relatorioPontos(req, res, next) {
    try {
      const relatorio = await AdminService.relatorioPontos(
        req.usuario.id_empresa,
        req.query // filtros de busca
      );

      res.json({
        success: true,
        data: relatorio
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Busca registros de ponto de funcionários com base em filtros
   * - Similar ao relatório, mas com retorno menos complexo
   * - Útil para interfaces que listam os pontos
   */
  static async buscarPontos(req, res, next) {
    try {
      const pontos = await AdminService.buscarPontos(
        req.usuario.id_empresa,
        req.query
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }

static async listarDepartamentos(req, res, next) {
  try {
    const departamentos = await AdminService.listarDepartamentos(req.usuario.id_empresa);
    res.json({
      success: true,
      data: departamentos
    });
  } catch (err) {
    console.error('Erro ao listar departamentos:', err);
    next(err);
  }
}

  /**
  * @api {get} /api/admin/pontos/analise Listar Pontos para Análise
  * @apiName CarregarPontosParaAnalise
  * @apiGroup Admin
  * 
  * @apiDescription Retorna pontos com possíveis irregularidades para análise manual
  */
  static async carregarPontosParaAnalise(req, res, next) {
    try {
      const pontos = await AdminService.carregarPontosParaAnalise(
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }


  /**
    * @api {put} /api/admin/pontos/:id/status Aprovar/Rejeitar Ponto
    * @apiName AtualizarStatusPonto
    * @apiGroup Admin
    * 
    * @apiParam {Number} id ID do registro de ponto
    * @apiBody {String="Aprovado","Rejeitado"} status Novo status do ponto
    * @apiBody {String} [justificativa] Justificativa para rejeição
    */
  static async atualizarStatusPonto(req, res, next) {
    try {
      // Verifica se o usuário tem permissão (middleware já validou)
      if (!req.usuario.permissoes?.aprovar_pontos && req.usuario.nivel !== 'ADMIN') {
        throw new AppError('Você não tem permissão para aprovar/rejeitar pontos', 403);
      }
  
      const resultado = await AdminService.atualizarStatusPonto(
        req.params.id,              // ID do ponto
        req.body.status,            // 'Aprovado' ou 'Rejeitado'
        req.usuario.id,             // ID do usuário autenticado (aprovador)
        req.body.justificativa      // Justificativa (opcional)
      );
  
      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * @api {get} /api/admin/pontos/pendentes Listar Pontos Pendentes
   * @apiName CarregarPontosPendentes
   * @apiGroup Admin
   * 
   * @apiQuery {String} [dataInicio] Data de início para filtro (YYYY-MM-DD)
   * @apiQuery {String} [dataFim] Data de fim para filtro (YYYY-MM-DD)
   * @apiQuery {String} [departamento] Filtro por departamento
   */
  static async carregarPontosPendentes(req, res, next) {
    try {
      const pontos = await AdminService.carregarPontosPendentes(
        req.usuario.id_empresa,
        {
          dataInicio: req.query.date_start,
          dataFim: req.query.date_end,
          departamento: req.query.department,
          status: req.query.status,
          nome: req.query.nome
        }
      );

      res.json({
        success: true,
        data: pontos
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Desativa um funcionário (sem excluir do banco)
   * - Ideal quando o funcionário sai da empresa mas precisa manter o histórico
   */
  static async desativarFuncionario(req, res, next) {
    try {
      const resultado = await AdminService.desativarFuncionario(
        req.params.id,
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

    /**
   * Desativa um funcionário (sem excluir do banco)
   * - Ideal quando o funcionário sai da empresa mas precisa manter o histórico
   */
  static async reativarFuncionario(req, res, next) {
    try {
      const resultado = await AdminService.reativarFuncionario(
        req.params.id,
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * @api {get} /api/admin/pontos/:id/detalhes Obter Detalhes do Ponto
   * @apiName ObterDetalhesPonto
   * @apiGroup Admin
   * 
   * @apiParam {Number} id ID do registro de ponto
   * 
   * @apiSuccess {Object} data Detalhes completos do ponto
   */
  static async obterDetalhesPonto(req, res, next) {
    try {
      console.log(`[AdminController] Buscando detalhes do ponto ID: ${req.params.id}`);

      const detalhes = await AdminService.obterDetalhesPonto(
        req.params.id,
        req.usuario.id_empresa
      );

      if (!detalhes) {
        console.log(`[AdminController] Ponto não encontrado: ${req.params.id}`);
        throw new AppError('Ponto não encontrado', 404);
      }

      console.log(`[AdminController] Detalhes encontrados para o ponto: ${req.params.id}`);
      res.json({
        success: true,
        data: detalhes
      });
    } catch (err) {
      console.error(`[AdminController] Erro ao buscar detalhes do ponto: ${err.message}`);
      next(err);
    }
  }

  /**
   * Exclui um funcionário definitivamente
   * - Usar com cautela. Verificar se há dados dependentes antes
   */
  static async excluirFuncionario(req, res, next) {
    try {
      const resultado = await AdminService.excluirFuncionario(
        req.params.id,
        req.usuario.id_empresa
      );

      res.json({
        success: true,
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  /**
 * @api {put} /api/admin/solicitacoes/:id/responder Responder Solicitação
 * @apiName ResponderSolicitacao
 * @apiGroup Admin
 * 
 * @apiParam {Number} id ID da solicitação
 * @apiBody {String="Aprovada","Rejeitada"} acao Ação a ser tomada
 * @apiBody {String} resposta Resposta do admin
 */
static async responderSolicitacao(req, res, next) {
  try {
      const { acao, resposta } = req.body;
      
      // Verifica se o usuário é um admin
      if (req.usuario.nivel !== 'ADMIN') {
          throw new AppError('Apenas administradores podem responder solicitações', 403);
      }
      
      // Obtém o ID do admin associado ao usuário
      const [admin] = await db.query(
          'SELECT id FROM ADMIN WHERE id_usuario = ?',
          [req.usuario.id]
      );
      
      if (!admin.length) {
          throw new AppError('Administrador não encontrado', 404);
      }
      
      const resultado = await AdminService.responderSolicitacaoAlteracao(
          req.params.id,
          admin[0].id,
          acao,
          resposta
      );
      
      // Aqui você pode chamar o serviço de email para notificar o funcionário
      // await emailService.enviarEmailRespostaSolicitacao(resultado);
      
      res.json({
          success: true,
          data: resultado
      });
  } catch (err) {
      next(err);
  }
}

/**
* @api {get} /api/admin/solicitacoes/:id Obter Detalhes da Solicitação
* @apiName ObterDetalhesSolicitacao
* @apiGroup Admin
* 
* @apiParam {Number} id ID da solicitação
*/
static async obterDetalhesSolicitacao(req, res, next) {
  try {
      // Verifica se o usuário é um admin
      if (req.usuario.nivel !== 'ADMIN') {
          throw new AppError('Apenas administradores podem visualizar solicitações', 403);
      }
      
      // Obtém o ID do admin associado ao usuário
      const [admin] = await db.query(
          'SELECT id FROM ADMIN WHERE id_usuario = ?',
          [req.usuario.id]
      );
      
      if (!admin.length) {
          throw new AppError('Administrador não encontrado', 404);
      }
      
      const solicitacao = await AdminService.obterDetalhesSolicitacao(
          req.params.id,
          admin[0].id
      );
      
      res.json({
          success: true,
          data: solicitacao
      });
  } catch (err) {
      next(err);
  }
}


//METODOS EM TESTE PARA solicitações de alteração de ponto 
// No AdminController.js

/**
 * @api {get} /api/admin/solicitacoes/pendentes Listar Solicitações Pendentes
 * @apiName ListarSolicitacoesPendentes
 * @apiGroup Admin
 * 
 * @apiSuccess {Object[]} data Lista de solicitações pendentes
 */
static async listarSolicitacoesPendentes(req, res, next) {
  try {
      const { id_empresa } = req.usuario;
      
      if (!id_empresa) {
          throw new AppError('ID da empresa não encontrado no token', 400);
      }

      const solicitacoes = await AdminService.obterSolicitacoesAlteracaoPendentes(id_empresa);
      console.log('[AdminController] Solicitações',solicitacoes)


      res.json({
          success: true,
          data: solicitacoes
      });
  } catch (error) {
      console.error('[AdminController] Erro ao listar solicitações pendentes:', error);
      next(error);
  }
}

/**
* @api {post} /api/admin/solicitacoes/:id/processar Processar Solicitação
* @apiName ProcessarSolicitacao
* @apiGroup Admin
* 
* @apiParam {Number} id ID da solicitação
* @apiBody {String="aprovar","rejeitar"} acao Ação a ser tomada
* @apiBody {String} motivo Motivo da decisão
* 
* @apiSuccess {String} message Mensagem de sucesso
*/
static async processarSolicitacao(req, res, next) {
  try {
      const { id } = req.params;
      const { id: idUsuario } = req.usuario;
      const { acao, motivo } = req.body;

      if (!['aprovar', 'rejeitar'].includes(acao)) {
          throw new AppError('Ação inválida. Use "aprovar" ou "rejeitar"', 400);
      }

      if (!motivo || motivo.trim().length < 5) {
          throw new AppError('Informe um motivo válido (mínimo 5 caracteres)', 400);
      }

      const resultado = await AdminService.processarSolicitacaoAlteracao(
          id, 
          idUsuario, 
          acao, 
          motivo
      );

      res.json({
          success: true,
          message: resultado.message,
          data: resultado.data
      });
  } catch (error) {
      console.error('[AdminController] Erro ao processar solicitação:', error);
      next(error);
  }
}
static async listarFuncionarios(req, res, next) {
  try {
      const funcionarios = await AdminService.listarFuncionarios(
          req.usuario.id_empresa,
          {
              status: req.query.status,
              departamento: req.query.departamento,
              nome: req.query.nome,
              registro_emp: req.query.registro_emp
          }
      );
      
      res.json({
          success: true,
          data: funcionarios
      });
  } catch (err) {
      next(err);
  }
}
static async obterHorariosFuncionario(req, res, next) {
  try {
    const { id } = req.params;

    const horarios = await AdminService.obterHorariosFuncionario(id);

    res.json({ success: true, data: horarios });
  } catch (error) {
    next(error);
  }
}

static async atualizarHorariosFuncionario(req, res, next) {
  try {
      const horariosAtualizados = await AdminService.atualizarHorariosFuncionario(
          req.params.id,
          req.body.horarios
      );

      res.json({
          success: true,
          data: horariosAtualizados,
          message: 'Horários atualizados com sucesso'
      });
  } catch (err) {
      next(err);
  }
}
static async obterFuncionario(req, res, next) {
  try {
      const funcionario = await AdminService.obterFuncionario(
          req.params.id,
          req.usuario.id_empresa
      );
      
      res.json({
          success: true,
          data: funcionario
      });
  } catch (err) {
      next(err);
  }
}
static async atualizarFuncionario(req, res, next) {
  try {
      // Remover campos que não devem ser atualizados
      const dadosAtualizacao = { ...req.body };
      delete dadosAtualizacao.id;
      delete dadosAtualizacao.id_empresa;
      delete dadosAtualizacao.id_usuario;
      delete dadosAtualizacao.cpf;

      const funcionarioAtualizado = await AdminService.atualizarFuncionario(
          req.params.id,
          req.usuario.id_empresa,
          dadosAtualizacao
      );

      res.json({
          success: true,
          data: funcionarioAtualizado,
          message: 'Funcionário atualizado com sucesso'
      });
  } catch (err) {
      next(err);
  }
}
}

// Exporta a classe para uso nas rotas (ex: admin.routes.js)
module.exports = AdminController;
