const {
  obterResumoEmpresa,
  obterRelatorioPontos,
  obterRegistrosRecentes,
  atualizarStatusPonto,
  obterEstatisticasMensais,
  obterFuncionariosComPendentes
} = require('../services/dashboardService');
const { AppError } = require('../errors');


class DashboardController {
  async carregarDashboardAdmin(req, res, next) {
    try {
        const idEmpresa = req.usuario.id_empresa;
        
        if (!idEmpresa) {
            throw new AppError('ID da empresa não identificado', 400);
        }

        const [resumo, relatorio, registros] = await Promise.all([
            obterResumoEmpresa(idEmpresa).catch(e => {
                console.error('Erro em obterResumoEmpresa:', e);
                return null;
            }),
            obterRelatorioPontos(idEmpresa).catch(e => {
                console.error('Erro em obterRelatorioPontos:', e);
                return { totalPontos: 0, pontosAprovados: 0, pontosPendentes: 0 };
            }),
            obterRegistrosRecentes(idEmpresa).catch(e => {
                console.error('Erro em obterRegistrosRecentes:', e);
                return [];
            })
        ]);
        res.json({
            success: true,
            data: {
                resumoFuncionarios: resumo,
                relatorioPontos: relatorio,
                pontosPendentes: registros
            }
        });
    } catch (error) {
        next(error);
    }
}

  async atualizarStatusPonto(req, res, next) {
    try {
      const { id } = req.params;
      const { status, observacao } = req.body;
      
      if (!id || !status) {
        throw new AppError('ID e status são obrigatórios', 400);
      }

      const resultado = await atualizarStatusPonto(
        id, 
        status, 
        observacao, 
        req.usuario.id, 
        req.usuario.id_empresa
      );
      
      if (!resultado) {
        throw new AppError('Registro de ponto não encontrado', 404);
      }

      res.json({ 
        success: true, 
        message: 'Status do ponto atualizado com sucesso' 
      });
    } catch (error) {
      next(error);
    }
  }

  async obterEstatisticasMensais(req, res, next) {
    try {
      const idEmpresa = req.usuario.id_empresa;
      const { ano } = req.query;
      
      if (!ano) {
        throw new AppError('Ano é obrigatório', 400);
      }

      const dados = await obterEstatisticasMensais(idEmpresa, ano);
      res.json({ success: true, data: dados });
    } catch (error) {
      next(error);
    }
  }

  async obterFuncionariosComPendentes(req, res, next) {
    try {
      const idEmpresa = req.usuario.id_empresa;
      const funcionarios = await obterFuncionariosComPendentes(idEmpresa);
      
      if (!funcionarios) {
        throw new AppError('Nenhum funcionário com pendências encontrado', 404);
      }

      res.json({ success: true, data: funcionarios });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;