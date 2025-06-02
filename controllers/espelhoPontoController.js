const espelhoPontoService = require('../services/espelhoPontoService');

class EspelhoPontoController {
    async getEspelhoPonto(req, res) {
        try {
            console.log('[CONTROLLER] Headers:', req.headers);
            console.log('[CONTROLLER] Parâmetros:', req.params);
            console.log('[CONTROLLER] Query:', req.query);

            const { id } = req.params;
            const { dataInicial, dataFinal } = req.query;

            // Validação mais robusta
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    message: 'ID do funcionário inválido ou não fornecido'
                });
            }

            if (!dataInicial || !dataFinal) {
                return res.status(400).json({
                    message: 'Datas inicial e final são obrigatórias'
                });
            }

            console.log('[CONTROLLER] Chamando service...');
            const espelhoPonto = await espelhoPontoService.getEspelhoPontoByFuncionario(
                parseInt(id),
                dataInicial,
                dataFinal
            );

            console.log('[CONTROLLER] Resultado do service:', espelhoPonto);

            if (!espelhoPonto || espelhoPonto.length === 0) {
                return res.status(404).json({
                    message: 'Nenhum registro de ponto encontrado',
                    suggestion: 'Verifique o período ou o ID do funcionário'
                });
            }

            res.json(espelhoPonto);
        } catch (error) {
            console.error('[CONTROLLER] Erro completo:', {
                message: error.message,
                stack: error.stack,
                request: {
                    params: req.params,
                    query: req.query,
                    headers: req.headers
                }
            });

            const statusCode = error.message.includes('inválid') ? 400 : 500;
            res.status(statusCode).json({
                message: 'Erro ao buscar espelho de ponto',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
            
            console.error('[CONTROLLER] Erro:', error);
            res.status(500).json({
                error: true,
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}
module.exports = new EspelhoPontoController();