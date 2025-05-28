class PontoDashboard {
    constructor() {
        console.log('[PONTO DASHBOARD] Inicializando dashboard de ponto...');
        this.authTokenKey = 'authToken';
        this.API_BASE_URL = 'http://localhost:3001/api';
        this.elements = {};
        this.initElements();
        this.setupEventListeners();
        this.checkAuthAndLoad();
    }

    // Métodos de inicialização
    initElements() {
        console.log('[PONTO DASHBOARD] Inicializando elementos da interface...');
        const elementsConfig = [
            { id: 'ultimos-registros-container', property: 'ultimosRegistrosContainer', required: true },
            { id: 'em-jornada-container', property: 'emJornadaContainer', required: true },
            { id: 'em-intervalo-container', property: 'emIntervaloContainer', required: true },
            { id: 'notificacoes-container', property: 'notificacoesContainer', required: true },
            { id: 'loading-overlay', property: 'loadingOverlay', required: false },
            { id: 'error-message', property: 'errorMessage', required: false },
            { id: 'logout-btn', property: 'logoutBtn', required: false },
            { id: 'refresh-btn', property: 'refreshBtn', required: false }
        ];

        elementsConfig.forEach(({ id, property, required }) => {
            this.elements[property] = document.getElementById(id);
            if (!this.elements[property] && required) {
                console.error(`[PONTO DASHBOARD] Elemento requerido com ID '${id}' não encontrado.`);
            }
        });
    }

    setupEventListeners() {
        console.log('[PONTO DASHBOARD] Configurando event listeners...');

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                console.log('[PONTO DASHBOARD] Logout iniciado pelo usuário');
                e.preventDefault();
                this.logout();
            });
        }

        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', (e) => {
                console.log('[PONTO DASHBOARD] Atualização manual solicitada');
                e.preventDefault();
                this.loadDashboard();
            });
        }
    }

    // Métodos de autenticação
    logout() {
        console.log('[PONTO DASHBOARD] Executando logout...');
        localStorage.removeItem(this.authTokenKey);
        console.debug('[PONTO DASHBOARD] Token removido do localStorage');
        window.location.href = 'login.html';
    }

    async checkAuthAndLoad() {
        console.log('[PONTO DASHBOARD] Verificando autenticação...');
        try {
            const isAuthenticated = await this.verifyAuthentication();
            if (isAuthenticated) {
                console.log('[PONTO DASHBOARD] Autenticação válida, carregando dashboard...');
                await this.loadDashboard();
            }
        } catch (error) {
            console.error('[PONTO DASHBOARD] Erro de autenticação:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            this.showError(error.message || 'Erro de autenticação');
            setTimeout(() => {
                console.log('[PONTO DASHBOARD] Redirecionando para login após erro de autenticação...');
                this.logout();
            }, 3000);
        }
    }

    async verifyAuthentication() {
        console.debug('[PONTO DASHBOARD] Iniciando verificação de token...');
        const token = localStorage.getItem(this.authTokenKey);

        if (!token) {
            console.warn('[PONTO DASHBOARD] Nenhum token encontrado no localStorage');
            throw new Error('Token de autenticação não encontrado');
        }

        try {
            console.debug('[PONTO DASHBOARD] Token encontrado, decodificando...');
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.debug('[PONTO DASHBOARD] Payload do token:', payload);

            if (payload.exp && Date.now() >= payload.exp * 1000) {
                console.warn('[PONTO DASHBOARD] Token expirado', {
                    expiration: new Date(payload.exp * 1000),
                    currentTime: new Date()
                });
                throw new Error('Token expirado');
            }

            if (!payload.nivel) {
                console.warn('[PONTO DASHBOARD] Token não contém informação de nível', payload);
                throw new Error('Token incompleto - falta informação de nível de acesso');
            }

            console.log('[PONTO DASHBOARD] Token válido e permissões confirmadas');
            return true;
        } catch (e) {
            console.error('[PONTO DASHBOARD] Falha na verificação do token', {
                error: e.message,
                stack: e.stack,
                token: token ? 'presente' : 'ausente',
                timestamp: new Date().toISOString()
            });
            throw new Error('Token inválido ou acesso não autorizado');
        }
    }

    // Métodos principais
    async loadDashboard() {
        console.log('[PONTO DASHBOARD] Carregando dados do dashboard...');
        try {
          this.mostrarLoading();
      
          const response = await this.fetchWithAuth(`${this.API_BASE_URL}/dashboard`);
          console.debug('[PONTO DASHBOARD] Dados recebidos da API:', response);
      
          if (!response || !response.data) {
            throw new Error('Dados inválidos do servidor');
          }
      
          // Processamento paralelo dos dados
          const [ultimosRegistros, statusEquipe, notificacoes] = await Promise.all([
            this.processarUltimosRegistros(response.data),
            this.processarStatusEquipe(response.data),
            this.processarNotificacoes(response.data)
          ]);
      
          console.debug('[PONTO DASHBOARD] Dados processados:', {
            ultimosRegistros,
            statusEquipe,
            notificacoes
          });
      
          // Renderização otimizada
          requestAnimationFrame(() => {
            this.carregarUltimosRegistros(ultimosRegistros);
            this.carregarStatusEquipe(statusEquipe);
            this.carregarNotificacoes(notificacoes);
            
            // Atualiza contador de notificações não lidas
            const naoLidas = notificacoes.filter(n => !n.resolvida).length;
            if (this.elements.contadorNotificacoes) {
              this.elements.contadorNotificacoes.textContent = 
                `${naoLidas} notificação${naoLidas !== 1 ? 'es' : ''} não lida${naoLidas !== 1 ? 's' : ''}`;
            }
          });
      
        } catch (erro) {
          console.error('[PONTO DASHBOARD] Erro ao carregar dashboard', {
            error: erro.message,
            stack: erro.stack,
            timestamp: new Date().toISOString()
          });
          this.showError(erro.message || 'Erro ao carregar dados do dashboard');
        } finally {
          this.esconderLoading();
        }
      }
      
      // Métodos de processamento específicos
      async processarUltimosRegistros(dados) {
        if (!dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) return [];
        
        return dados.pontosPendentes
          .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
          .slice(0, 10) // Limita aos 10 mais recentes
          .map(ponto => ({
            ...ponto,
            dataHora: new Date(ponto.dataHora).toLocaleTimeString('pt-BR'),
            foto: ponto.foto || 'https://i.pravatar.cc/36'
          }));
      }
      
      async processarStatusEquipe(dados) {
        return {
          emJornada: this.extrairEmJornada(dados),
          emIntervalo: this.extrairEmIntervalo(dados)
        };
      }
      
      async processarNotificacoes(dados) {
        return this.criarNotificacoes(dados);
      }

    // Métodos auxiliares para adaptar a estrutura de dados
    extrairEmJornada(dados) {
        if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
            console.warn('[PONTO DASHBOARD] Dados inválidos para extrair em jornada');
            return [];
        }

        const agora = new Date();
        const inicioDia = new Date(agora);
        inicioDia.setHours(0, 0, 0, 0);

        return dados.pontosPendentes
            .filter(ponto => {
                // Filtra apenas pontos do dia atual
                const dataPonto = new Date(ponto.dataHora);
                return dataPonto >= inicioDia;
            })
            .reduce((acc, ponto) => {
                // Agrupa por funcionário mantendo apenas o último registro
                const existente = acc.find(item => item.id_funcionario === ponto.id_funcionario);

                if (!existente) {
                    acc.push({
                        id_funcionario: ponto.id_funcionario,
                        nome_completo: ponto.nomeFuncionario,
                        ultima_acao: ponto.dataHora,
                        tipo_ultima_acao: ponto.tipo,
                        foto: ponto.foto || 'https://i.pravatar.cc/36'
                    });
                } else if (new Date(ponto.dataHora) > new Date(existente.ultima_acao)) {
                    existente.ultima_acao = ponto.dataHora;
                    existente.tipo_ultima_acao = ponto.tipo;
                }

                return acc;
            }, [])
            .filter(funcionario => {
                // Considera em jornada quem teve entrada mas não saída
                return funcionario.tipo_ultima_acao === 'Entrada' &&
                    !dados.pontosPendentes.some(p =>
                        p.id_funcionario === funcionario.id_funcionario &&
                        p.tipo === 'Saída' &&
                        new Date(p.dataHora) > new Date(funcionario.ultima_acao)
                    );
            })
            .map(funcionario => {
                const ultimaAcaoDate = new Date(funcionario.ultima_acao);
                const minutosDesdeUltimaAcao = Math.floor((agora - ultimaAcaoDate) / (1000 * 60));

                return {
                    ...funcionario,
                    ultima_acao: ultimaAcaoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    tempo_jornada: minutosDesdeUltimaAcao,
                    cor_status: minutosDesdeUltimaAcao > 120 ? 'vermelho' : 'verde' // 2 horas de tolerância
                };
            });
    }

    extrairEmIntervalo(dados) {
        if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
            console.warn('[PONTO DASHBOARD] Dados inválidos para extrair em intervalo');
            return [];
        }

        const agora = new Date();
        const inicioDia = new Date(agora);
        inicioDia.setHours(0, 0, 0, 0);

        return dados.pontosPendentes
            .filter(ponto => {
                // Filtra apenas pontos do dia atual
                const dataPonto = new Date(ponto.dataHora);
                return dataPonto >= inicioDia && ponto.tipo === 'Intervalo';
            })
            .reduce((acc, ponto) => {
                // Agrupa por funcionário mantendo apenas o último intervalo sem retorno
                const existente = acc.find(item => item.id_funcionario === ponto.id_funcionario);
                const temRetorno = dados.pontosPendentes.some(p =>
                    p.id_funcionario === ponto.id_funcionario &&
                    p.tipo === 'Retorno' &&
                    new Date(p.dataHora) > new Date(ponto.dataHora)
                );

                if (!temRetorno && (!existente || new Date(ponto.dataHora) > new Date(existente.horario_intervalo))) {
                    if (existente) {
                        existente.horario_intervalo = ponto.dataHora;
                    } else {
                        acc.push({
                            id_funcionario: ponto.id_funcionario,
                            nome_completo: ponto.nomeFuncionario,
                            horario_intervalo: ponto.dataHora,
                            foto: ponto.foto || 'https://i.pravatar.cc/36'
                        });
                    }
                }

                return acc;
            }, [])
            .map(funcionario => {
                const intervaloDate = new Date(funcionario.horario_intervalo);
                const minutosEmIntervalo = Math.floor((agora - intervaloDate) / (1000 * 60));

                return {
                    ...funcionario,
                    horario_intervalo: intervaloDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    duracao_intervalo: minutosEmIntervalo
                };
            });
    }

    criarNotificacoes(dados) {
        if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
            console.warn('[PONTO DASHBOARD] Dados inválidos para criar notificações');
            return [];
        }

        const agora = new Date();
        const notificacoes = [];
        const funcionariosComEntrada = new Set();

        // Verifica funcionários que não registraram saída
        dados.pontosPendentes.forEach(ponto => {
            const dataPonto = new Date(ponto.dataHora);

            if (ponto.tipo === 'Entrada') {
                funcionariosComEntrada.add(ponto.id_funcionario);
            }
            else if (ponto.tipo === 'Saída') {
                funcionariosComEntrada.delete(ponto.id_funcionario);
            }
        });

        funcionariosComEntrada.forEach(id => {
            const funcionario = dados.pontosPendentes.find(p => p.id_funcionario === id);
            notificacoes.push({
                mensagem: `${funcionario.nomeFuncionario} não registrou ponto de saída`,
                data_hora: new Date().toISOString(),
                resolvida: false,
                prioridade: 'Alta'
            });
        });

        // Verifica intervalos prolongados (> 60 minutos)
        const funcionariosEmIntervalo = this.extrairEmIntervalo(dados);
        funcionariosEmIntervalo.forEach(funcionario => {
            if (funcionario.duracao_intervalo > 60) {
                notificacoes.push({
                    mensagem: `${funcionario.nome_completo} está há mais de ${funcionario.duracao_intervalo} minutos em intervalo`,
                    data_hora: new Date().toISOString(),
                    resolvida: false,
                    prioridade: 'Média'
                });
            }
        });

        return notificacoes.sort((a, b) => {
            // Ordena por prioridade (Alta > Média > Baixa)
            const prioridades = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
            return prioridades[a.prioridade] - prioridades[b.prioridade];
        });
    }

    async fetchWithAuth(url, method = 'GET') {
        console.debug(`[PONTO DASHBOARD] Fazendo requisição autenticada: ${method} ${url}`);
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) {
            console.error('[PONTO DASHBOARD] Token não encontrado durante requisição');
            throw new Error('Token não encontrado');
        }

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.debug(`[PONTO DASHBOARD] Resposta recebida: ${response.status}`);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('[PONTO DASHBOARD] Erro na resposta da API', {
                    status: response.status,
                    error: error.message || 'Sem mensagem de erro',
                    url
                });
                throw new Error(error.message || `Erro HTTP ${response.status}`);
            }

            const data = await response.json();
            console.debug('[PONTO DASHBOARD] Dados da resposta:', data);
            return data;
        } catch (erro) {
            console.error('[PONTO DASHBOARD] Erro na requisição', {
                error: erro.message,
                stack: erro.stack,
                url,
                method,
                timestamp: new Date().toISOString()
            });
            throw erro;
        }
    }

    // Métodos de renderização
    carregarUltimosRegistros(registros) {
        if (!this.elements.ultimosRegistrosContainer) return;

        if (!Array.isArray(registros)) {
            console.warn('Dados de últimos registros inválidos:', registros);
            this.elements.ultimosRegistrosContainer.innerHTML = '<div class="item">Nenhum registro recente</div>';
            return;
        }

        this.elements.ultimosRegistrosContainer.innerHTML = registros.length > 0
            ? registros.map(registro => `
          <div class="item">
            <img src="${registro.foto || 'https://i.pravatar.cc/36'}" class="avatar" />
            <div class="hora">${this.formatarHora(registro.dataHora)}</div>
            <div class="texto">${registro.nomeFuncionario} - ${registro.tipo}</div>
          </div>
        `).join('')
            : '<div class="item">Nenhum registro recente</div>';
    }

    carregarStatusEquipe(statusEquipe) {
        console.debug('[PONTO DASHBOARD] Carregando status da equipe...', statusEquipe);

        if (!this.elements.emJornadaContainer || !this.elements.emIntervaloContainer) {
            console.warn('[PONTO DASHBOARD] Elementos de status não encontrados');
            return;
        }

        // Renderizar funcionários em jornada
        this.elements.emJornadaContainer.innerHTML = (statusEquipe.emJornada || []).map(funcionario => `
        <div class="item">
          <img src="${funcionario.foto || 'https://i.pravatar.cc/36'}" class="avatar" />
          <div class="texto">
            ${funcionario.nome_completo}<br>
            <span class="hora cinza">${this.formatarHora(funcionario.ultima_acao)}</span>
            <span class="tempo ${funcionario.cor_status}">${this.formatarDuracao(funcionario.tempo_jornada)}</span>
          </div>
        </div>
      `).join('');

        // Renderizar funcionários em intervalo
        this.elements.emIntervaloContainer.innerHTML = (statusEquipe.emIntervalo || []).map(funcionario => `
        <div class="item">
          <img src="${funcionario.foto || 'https://i.pravatar.cc/36'}" class="avatar" />
          <div class="texto">
            ${funcionario.nome_completo}<br>
            <span class="hora cinza">${this.formatarHora(funcionario.horario_intervalo)}</span>
            <span class="tempo verde">${this.formatarDuracao(funcionario.duracao_intervalo)}</span>
          </div>
        </div>
      `).join('');
    }

    carregarNotificacoes(notificacoes) {
        console.debug('[PONTO DASHBOARD] Carregando notificações...', notificacoes);

        if (!this.elements.notificacoesContainer || !Array.isArray(notificacoes)) {
            console.warn('[PONTO DASHBOARD] Elemento de notificações não encontrado ou dados inválidos');
            return;
        }

        this.elements.notificacoesContainer.innerHTML = notificacoes.map(notificacao => `
        <div class="notificacao">
          <div class="texto">
            ${notificacao.mensagem}<br>
            <span class="hora cinza">${this.formatarDataHora(notificacao.data_hora)}</span>
            ${!notificacao.resolvida ? '<span class="roxo">não lida</span>' : ''}
          </div>
        </div>
      `).join('');
    }

    // Utilitários de UI
    mostrarLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
    }

    esconderLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
            setTimeout(() => {
                if (this.elements.errorMessage) {
                    this.elements.errorMessage.style.display = 'none';
                }
            }, 5000);
        } else {
            alert(`Erro: ${message}`);
        }
    }

    // Utilitários de formatação
    formatarHora(horaString) {
        try {
            if (!horaString) return 'N/A';
            const [horas, minutos] = horaString.split(':');
            return `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;
        } catch {
            return 'N/A';
        }
    }

    formatarDuracao(minutos) {
        if (isNaN(minutos)) return '0:00';
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}:${mins.toString().padStart(2, '0')}`;
    }

    formatarDataHora(dataString) {
        try {
            const data = new Date(dataString);
            return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' +
                data.toLocaleDateString('pt-BR');
        } catch {
            return 'N/A';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('[PONTO DASHBOARD] DOM carregado, iniciando aplicação...');
    try {
        window.pontoDashboard = new PontoDashboard();
    } catch (error) {
        console.error('[PONTO DASHBOARD] Erro fatal na inicialização', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        alert('Erro ao carregar o painel. Redirecionando...');
        window.location.href = 'login.html';
    }
});