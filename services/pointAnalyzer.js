class PointAnalyzer {
    /**
     * Analisa um registro de ponto em busca de irregularidades
     * @param {Object} ponto - Dados do registro de ponto
     * @param {Object} config - Configurações da empresa
     * @returns {Object} - Resultado da análise
     */
    static analisarPonto(ponto, config) {
        const analise = {
            irregularidades: [],
            aprovacaoAutomatica: true,
            gravidade: 'baixa'
        };

        // 1. Verificar horário
        const horarioValido = this.verificarHorario(ponto, config.tolerancia_atraso);
        if (!horarioValido.valido) {
            analise.irregularidades.push({
                tipo: 'horario',
                descricao: horarioValido.mensagem,
                detalhes: horarioValido.detalhes
            });
            analise.aprovacaoAutomatica = false;
            analise.gravidade = horarioValido.gravidade;
        }

        // 2. Verificar geolocalização
        const localizacaoValida = this.verificarLocalizacao(ponto, config.raio_geolocalizacao);
        if (!localizacaoValida.valido) {
            analise.irregularidades.push({
                tipo: 'localizacao',
                descricao: localizacaoValida.mensagem,
                detalhes: localizacaoValida.detalhes
            });
            analise.aprovacaoAutomatica = false;
            analise.gravidade = this.aumentarGravidade(analise.gravidade, localizacaoValida.gravidade);
        }

        // 3. Verificar foto (se aplicável)
        if (config.requer_foto && !ponto.foto_url) {
            analise.irregularidades.push({
                tipo: 'foto',
                descricao: 'Registro sem foto',
                detalhes: 'A empresa requer foto para registro de ponto'
            });
            analise.aprovacaoAutomatica = false;
            analise.gravidade = this.aumentarGravidade(analise.gravidade, 'media');
        }

        return analise;
    }

    static verificarHorario(ponto, toleranciaMinutos) {
        if (!ponto.hora_esperada_entrada && !ponto.hora_esperada_saida) {
            return {
                valido: true,
                mensagem: 'Sem horário definido para análise'
            };
        }

        const dataPonto = new Date(ponto.data_hora);
        const horaPonto = dataPonto.getHours() * 60 + dataPonto.getMinutes();

        let horaEsperada, tipoComparacao;

        if (ponto.tipo === 'Entrada') {
            horaEsperada = this.timeToMinutes(ponto.hora_esperada_entrada);
            tipoComparacao = 'entrada';
        } else if (ponto.tipo === 'Saida') {
            horaEsperada = this.timeToMinutes(ponto.hora_esperada_saida);
            tipoComparacao = 'saída';
        } else {
            return { valido: true };
        }

        const diferenca = horaPonto - horaEsperada;

        if (diferenca > toleranciaMinutos) {
            return {
                valido: false,
                mensagem: `${ponto.tipo} fora do horário esperado`,
                detalhes: `Horário esperado: ${this.minutesToTime(horaEsperada)} | Horário registrado: ${this.minutesToTime(horaPonto)} | Diferença: +${diferenca} minutos`,
                gravidade: diferenca > 30 ? 'alta' : 'media'
            };
        }

        return { valido: true };
    }

    static verificarLocalizacao(ponto, raioPermitido) {
        if (!ponto.latitude || !ponto.longitude) {
            return {
                valido: false,
                mensagem: 'Sem dados de localização',
                detalhes: 'O registro não contém informações de geolocalização',
                gravidade: 'alta'
            };
        }

        // Em produção, implementar cálculo real de distância
        const distancia = this.calcularDistancia(
            ponto.latitude,
            ponto.longitude,
            -23.563210, // Latitude da empresa (exemplo)
            -46.652150  // Longitude da empresa (exemplo)
        );

        if (distancia > raioPermitido) {
            return {
                valido: false,
                mensagem: 'Fora do raio permitido',
                detalhes: `Distância do local permitido: ${distancia.toFixed(2)}m (Limite: ${raioPermitido}m)`,
                gravidade: 'alta'
            };
        }

        return { valido: true };
    }

    // Métodos auxiliares
    static timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    static minutesToTime(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    static calcularDistancia(lat1, lon1, lat2, lon2) {
        // Implementação simplificada - usar fórmula de Haversine em produção
        return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2) * 111320); // Aproximação em metros
    }

    static aumentarGravidade(atual, nova) {
        const niveis = { baixa: 0, media: 1, alta: 2 };
        return niveis[nova] > niveis[atual] ? nova : atual;
    }
}

module.exports = PointAnalyzer;