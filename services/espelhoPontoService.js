const db = require('../config/db');

class EspelhoPontoService {
    async getEspelhoPontoByFuncionario(funcionarioId, dataInicial, dataFinal) {
        try {
            console.log('[SERVICE] Parâmetros recebidos:', { funcionarioId, dataInicial, dataFinal });

            // Validações melhoradas
            if (!funcionarioId || isNaN(funcionarioId)) {
                throw new Error('ID do funcionário inválido');
            }

            const inicio = new Date(dataInicial);
            const fim = new Date(dataFinal);
            
            if (isNaN(inicio.getTime())) throw new Error('Data inicial inválida');
            if (isNaN(fim.getTime())) throw new Error('Data final inválida');
            if (inicio > fim) throw new Error('Data inicial maior que data final');

            console.log('[SERVICE] Chamando stored procedure...');
            const result = await db.query('CALL sp_get_espelho_ponto(?, ?, ?)', [
                parseInt(funcionarioId),
                dataInicial,
                dataFinal
            ]);

            console.log('[SERVICE] Resultado bruto:', result);
            
            // Ajuste conforme o formato retornado pelo seu banco
            const dados = Array.isArray(result[0]) ? result[0] : result;
            console.log('[SERVICE] Dados processados:', dados);
            
            return dados;
        } catch (error) {
            console.error('[SERVICE] Erro detalhado:', {
                message: error.message,
                stack: error.stack,
                params: { funcionarioId, dataInicial, dataFinal }
            });
            throw error;
        }
    }
}

module.exports = new EspelhoPontoService();