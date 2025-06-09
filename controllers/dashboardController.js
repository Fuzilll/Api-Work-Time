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
      console.log('[DASHBOARD CONTROLLER] ID Empresa:', idEmpresa);

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

      // Log detalhado dos registros recebidos
      console.log('[DASHBOARD CONTROLLER] Registros recebidos:', {
        quantidade: registros.length,
        primeiroRegistro: registros[0] ? {
          id: registros[0].id,
          nomeFuncionario: registros[0].nomeFuncionario,
          foto_url: registros[0].foto_url,
          foto: registros[0].foto,
          dataHora: registros[0].dataHora,
          tipo: registros[0].tipo
        } : null,
        todosCampos: registros.length > 0 ? Object.keys(registros[0]) : 'Nenhum registro'
      });

      // Verificar URLs de imagem nos registros
      if (registros.length > 0) {
        registros.forEach((reg, index) => {
          console.log(`[DASHBOARD CONTROLLER] Registro ${index + 1} - Foto:`, {
            foto_url: reg.foto_url,
            foto: reg.foto,
            possuiFotoUrl: !!reg.foto_url,
            possuiFoto: !!reg.foto,
            tipoFotoUrl: typeof reg.foto_url,
            tipoFoto: typeof reg.foto
          });
        });
      }

      res.json({
        success: true,
        data: {
          resumoFuncionarios: resumo,
          relatorioPontos: relatorio,
          pontosPendentes: registros
        }
      });
    } catch (error) {
      console.error('[DASHBOARD CONTROLLER] Erro ao carregar dashboard:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
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

  async obterFotoDashboard(req, res, next) {
    try {
      const { id } = req.params; // ID do registro de ponto
      const idEmpresa = req.usuario.id_empresa;
  
      if (!idEmpresa) {
        throw new AppError('ID da empresa não identificado', 400);
      }
  
      // Busca o registro específico pelo ID
      const query = `
        SELECT foto_url 
        FROM REGISTRO_PONTO 
        WHERE id = ? AND id_funcionario IN (
          SELECT id FROM FUNCIONARIO WHERE id_empresa = ?
        )
      `;
  
      const [registro] = await db.query(query, [id, idEmpresa]);
  
      if (!registro || registro.length === 0) {
        return res.status(404).json({
          foto_url: '/assets/images/default-profile.png'
        });
      }
  
      const fotoUrl = registro[0].foto_url || '/assets/images/default-profile.png';
  
      return res.json({ foto_url: fotoUrl });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = DashboardController;