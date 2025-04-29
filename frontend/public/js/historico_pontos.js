class HistoricoPontos {
    constructor() {
        this.authTokenKey = 'authToken';
        this.elements = {};
        this.modal = null;
        this.initElements();
        this.setupEventListeners();
        this.initModal();
        this.checkAuthAndLoad();
    }

    // Métodos de inicialização
    initElements() {
        const elementsConfig = [
            { id: 'tabela-pontos', property: 'tabelaPontos' },
            { id: 'data-inicio', property: 'dataInicio' },
            { id: 'data-fim', property: 'dataFim' },
            { id: 'btn-filtrar', property: 'btnFiltrar' },
            { id: 'btn-limpar', property: 'btnLimpar' },
            { id: 'modalAlteracao', property: 'modalAlteracao' },
            { id: 'formSolicitarAlteracao', property: 'formSolicitarAlteracao' },
            { id: 'idRegistro', property: 'idRegistro' },
            { id: 'novoHorario', property: 'novoHorario' },
            { id: 'motivoAlteracao', property: 'motivoAlteracao' }
        ];

        elementsConfig.forEach(({ id, property }) => {
            this.elements[property] = document.getElementById(id);
            if (!this.elements[property]) {
                console.error(`[HISTORICO] Elemento com ID '${id}' não encontrado.`);
            }
        });
    }

    setupEventListeners() {
        if (this.elements.btnFiltrar) {
            this.elements.btnFiltrar.addEventListener('click', () => this.carregarHistorico());
        }

        if (this.elements.btnLimpar) {
            this.elements.btnLimpar.addEventListener('click', () => this.limparFiltros());
        }

        if (this.elements.formSolicitarAlteracao) {
            this.elements.formSolicitarAlteracao.addEventListener('submit', (e) => this.enviarSolicitacaoAlteracao(e));
        }
    }

    initModal() {
        if (!this.elements.modalAlteracao) {
            console.error('[HISTORICO] Elemento modal não encontrado');
            return;
        }

        this.modal = new bootstrap.Modal(this.elements.modalAlteracao);
        
        // Event delegation para os botões de alteração
        this.elements.tabelaPontos?.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-alteracao');
            if (btn) {
                const idRegistro = btn.dataset.id;
                if (idRegistro) {
                    this.abrirModalAlteracao(idRegistro);
                }
            }
        });
    }

    // Métodos de autenticação (padrão do FuncionarioDashboard)
    async checkAuthAndLoad() {
        try {
            await this.verifyAuthentication();
            await this.carregarHistorico();
        } catch (error) {
            console.error('[HISTORICO] Erro de autenticação:', error);
            this.showError(error.message);
            this.redirectToLogin();
        }
    }

    async verifyAuthentication() {
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) throw new Error('Token de autenticação não encontrado');

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                throw new Error('Token expirado');
            }
            return true;
        } catch (e) {
            console.error('[HISTORICO] Erro ao verificar token:', e);
            throw new Error('Token inválido');
        }
    }

    redirectToLogin() {
        localStorage.removeItem(this.authTokenKey);
        window.location.href = 'login.html';
    }

    // Métodos principais
    async carregarHistorico() {
        try {
            this.showLoading();
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Token de autenticação não encontrado');

            const params = new URLSearchParams();
            if (this.elements.dataInicio?.value) {
                params.append('dataInicio', this.elements.dataInicio.value);
            }
            if (this.elements.dataFim?.value) {
                params.append('dataFim', this.elements.dataFim.value);
            }

            const url = `/api/funcionarios/historico-pontos?${params.toString()}`;
            console.log('[HISTORICO] Carregando dados de:', url);

            const response = await this.makeAuthenticatedRequest(url, 'GET', null, token);
            const data = response.data ?? response;

            if (!Array.isArray(data)) {
                throw new Error('Resposta da API não contém array de pontos');
            }

            this.renderizarHistorico(data);

        } catch (error) {
            console.error('[HISTORICO] Erro ao carregar:', error);
            
            // Tratamento especial para erros de JSON inválido
            if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
                this.showError('Erro no formato dos dados recebidos do servidor');
            } else {
                this.showError(error.message || 'Erro ao carregar histórico de pontos');
            }
            
            if (error.message.includes('autenticação') || error.message.includes('401')) {
                this.redirectToLogin();
            }
        } finally {
            this.hideLoading();
        }
    }

    async makeAuthenticatedRequest(url, method = 'GET', body = null, token) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : null
            };

            const response = await fetch(url, options);
            
            // Verifica se a requisição foi redirecionada para login
            if (response.redirected && response.url.includes('login')) {
                throw new Error('Sessão expirada. Redirecionando para login...');
            }

            // Verifica o content-type mesmo para respostas de erro
            const contentType = response.headers.get('content-type') || '';
            
            if (!contentType.includes('application/json')) {
                // Se não for JSON, tenta ler como texto para dar uma mensagem melhor
                const text = await response.text();
                
                if (text.startsWith('<!DOCTYPE html>')) {
                    throw new Error('O servidor retornou uma página HTML inesperada');
                }
                
                // Se for um texto simples (como mensagem de erro)
                throw new Error(text || `Resposta inválida do servidor (${response.status})`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `Erro HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[HISTORICO] Erro na requisição para ${url}:`, error);
            
            // Tratamento especial para erros de rede
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Falha na conexão com o servidor');
            }
            
            throw error;
        }
    }

    // Métodos de renderização
    renderizarHistorico(pontos = []) {
        const tbody = this.elements.tabelaPontos?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (pontos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum registro encontrado</td></tr>';
            return;
        }

        pontos.forEach(ponto => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${this.formatarDataHora(ponto.data_ponto || ponto.data_hora)}</td>
                <td>${this.formatarStatus(ponto.status)}</td>
                <td>${this.formatarTipo(ponto.tipo)}</td>
                <td>
                    <button class="btn btn-warning btn-sm btn-alteracao" 
                            data-id="${ponto.id}">
                        Solicitar Alteração
                    </button>
                </td>
            `;
        });
    }

    limparFiltros() {
        if (this.elements.dataInicio) this.elements.dataInicio.value = '';
        if (this.elements.dataFim) this.elements.dataFim.value = '';
        this.carregarHistorico();
    }

    // Métodos de alteração de ponto
    abrirModalAlteracao(idRegistro) {
        console.log('[HISTORICO] Abrindo modal para ID:', idRegistro);

        if (!this.modal) {
            console.error('[HISTORICO] Modal não inicializado');
            return;
        }

        if (this.elements.idRegistro) {
            this.elements.idRegistro.value = idRegistro;
        }
        
        // Limpa os campos do formulário
        if (this.elements.novoHorario) this.elements.novoHorario.value = '';
        if (this.elements.motivoAlteracao) this.elements.motivoAlteracao.value = '';

        this.modal.show();
    }

    async enviarSolicitacaoAlteracao(event) {
        event.preventDefault();
        
        try {
            this.showLoading('Enviando solicitação...');
            
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Token de autenticação não encontrado');

            const formData = new FormData(this.elements.formSolicitarAlteracao);
            const dados = {
                id_registro: formData.get('idRegistro'),
                novo_horario: formData.get('novoHorario'),
                motivo: formData.get('motivoAlteracao')
            };

            // Validação básica
            if (!dados.motivo || dados.motivo.length < 10) {
                throw new Error('O motivo deve ter pelo menos 10 caracteres');
            }

            const response = await this.makeAuthenticatedRequest(
                '/api/funcionarios/solicitar-alteracao-ponto',
                'POST',
                dados,
                token
            );

            this.showSuccess('Solicitação enviada com sucesso!');
            this.modal.hide();
            await this.carregarHistorico();

        } catch (error) {
            console.error('[HISTORICO] Erro ao enviar solicitação:', error);
            this.showError(error.message || 'Erro ao enviar solicitação');
        } finally {
            this.hideLoading();
        }
    }

    // Métodos utilitários
    formatarDataHora(data) {
        if (!data) return 'Data não informada';

        try {
            const dataObj = new Date(data);
            if (isNaN(dataObj.getTime())) return 'Data inválida';

            return dataObj.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Data inválida';
        }
    }

    formatarStatus(status) {
        if (!status) status = 'DESCONHECIDO';

        const statusClasses = {
            'APROVADO': 'bg-success',
            'PENDENTE': 'bg-warning',
            'REJEITADO': 'bg-danger'
        };
        
        const classe = statusClasses[status.toUpperCase()] || 'bg-secondary';
        return `<span class="badge ${classe}">${status}</span>`;
    }

    formatarTipo(tipo) {
        if (!tipo) return 'Não informado';

        const tipos = {
            'ENTRADA': { classe: 'info', texto: 'Entrada', icone: 'sign-in-alt' },
            'SAIDA': { classe: 'secondary', texto: 'Saída', icone: 'sign-out-alt' },
            'SAIDA_ALMOCO': { classe: 'primary', texto: 'Saída Almoço', icone: 'utensils' },
            'RETORNO_ALMOCO': { classe: 'success', texto: 'Retorno Almoço', icone: 'utensils' }
        };

        const item = tipos[tipo.toUpperCase()] || { classe: 'light', texto: tipo, icone: 'clock' };
        return `<span class="badge bg-${item.classe}"><i class="fas fa-${item.icone} me-1"></i>${item.texto}</span>`;
    }

    // Métodos de UI (padrão do FuncionarioDashboard)
    showLoading(message = '') {
        const loadingElement = document.getElementById('loading-overlay') || document.getElementById('loadingOverlay');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
            if (message && loadingElement.querySelector('.loading-message')) {
                loadingElement.querySelector('.loading-message').textContent = message;
            }
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading-overlay') || document.getElementById('loadingOverlay');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showAlert('success', 'Sucesso', message);
    }

    showError(message) {
        this.showAlert('error', 'Erro', message);
    }

    showAlert(icon, title, text) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon, title, text });
        } else {
            alert(`${title}: ${text}`);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.historicoPontos = new HistoricoPontos();
    } catch (error) {
        console.error('Erro fatal ao inicializar histórico:', error);
        alert('Ocorreu um erro ao carregar o histórico. Redirecionando para login...');
        window.location.href = 'login.html';
    }
});