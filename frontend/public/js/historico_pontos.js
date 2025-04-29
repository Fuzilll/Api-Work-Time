class HistoricoPontos {
    constructor() {
        this.authTokenKey = 'authToken';
        this.modal = null;
        this.alteracaoModal = null; // Nova instância do modal de alteração
        this.initElements();
        this.setupEventListeners();
        this.initModal();
        this.initAlteracaoModal(); // Inicializa o novo modal
    }

    initElements() {
        this.elements = {
            tabelaPontos: document.getElementById('tabela-pontos'),
            dataInicio: document.getElementById('data-inicio'),
            dataFim: document.getElementById('data-fim'),
            btnFiltrar: document.getElementById('btn-filtrar'),
            btnLimpar: document.getElementById('btn-limpar'),
            modalAlteracao: document.getElementById('modalAlteracao'),
            formSolicitarAlteracao: document.getElementById('formSolicitarAlteracao'),
            // Novos elementos para o modal melhorado
            modalAlteracaoPonto: document.getElementById('modalAlteracaoPonto'),
            formSolicitarAlteracaoPonto: document.getElementById('formSolicitarAlteracaoPonto'),
            tipoAtual: document.getElementById('tipoAtual'),
            dataHoraAtual: document.getElementById('dataHoraAtual')
        };
    }

    setupEventListeners() {
        if (this.elements.btnFiltrar) {
            this.elements.btnFiltrar.addEventListener('click', () => this.carregarHistorico());
        }

        if (this.elements.btnLimpar) {
            this.elements.btnLimpar.addEventListener('click', () => this.limparFiltros());
        }

        // Mantém o listener do formulário antigo para compatibilidade
        if (this.elements.formSolicitarAlteracao) {
            this.elements.formSolicitarAlteracao.addEventListener('submit', (e) => this.enviarSolicitacaoAlteracao(e));
        }

        // Listener para o novo formulário
        if (this.elements.formSolicitarAlteracaoPonto) {
            this.elements.formSolicitarAlteracaoPonto.addEventListener('submit', (e) => this.enviarSolicitacaoAlteracaoMelhorada(e));
        }
    }

    initModal() {
        // Modal antigo (mantido para compatibilidade)
        if (!this.elements.modalAlteracao) {
            console.error('Elemento modal não encontrado');
            return;
        }

        this.modal = new bootstrap.Modal(this.elements.modalAlteracao);
        this.elements.tabelaPontos?.querySelector('tbody')?.addEventListener('click', (e) => this.handleTableClick(e));
    }

    initAlteracaoModal() {
        // Novo modal de alteração
        if (!this.elements.modalAlteracaoPonto) {
            console.error('Elemento modalAlteracaoPonto não encontrado');
            return;
        }

        this.alteracaoModal = new bootstrap.Modal(this.elements.modalAlteracaoPonto);
    }

    async carregarHistorico() {
        try {
            mostrarLoading();

            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Token de autenticação não encontrado');

            const params = new URLSearchParams();

            if (this.elements.dataInicio.value) {
                params.append('dataInicio', this.elements.dataInicio.value);
            }

            if (this.elements.dataFim.value) {
                params.append('dataFim', this.elements.dataFim.value);
            }

            const resposta = await this.buscarDados(`/api/funcionarios/historico-pontos?${params.toString()}`, token);
            console.log('🔍 Resposta completa da API:', resposta);

            if (!resposta || !resposta.success) {
                throw new Error(resposta.message || 'Resposta inválida da API');
            }

            const pontos = Array.isArray(resposta.data) ? resposta.data : [resposta.data];
            console.log('📊 Pontos processados:', pontos);

            this.renderizarHistorico(pontos);

        } catch (erro) {
            console.error('Erro ao carregar histórico:', erro);
            exibirErro(erro.message || 'Erro ao carregar histórico de pontos');
        } finally {
            esconderLoading();
        }
    }

    handleTableClick(event) {
        const btn = event.target.closest('.btn-alteracao');
        if (!btn) return;

        const idRegistro = btn.dataset.id;
        const row = btn.closest('tr');
        const tipo = row.cells[2].textContent.trim();
        const dataHora = row.cells[0].textContent.trim();

        if (idRegistro) {
            // Usa o novo modal se disponível
            if (this.alteracaoModal) {
                this.abrirModalAlteracaoMelhorado(idRegistro, { tipo, data_hora: dataHora });
            } else {
                // Fallback para o modal antigo
                this.abrirModalAlteracao(idRegistro);
            }
        }
    }

    renderizarHistorico(pontos = []) {
        const tbody = this.elements.tabelaPontos?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (pontos.length === 0 || pontos[0] === null) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum registro encontrado</td></tr>';
            return;
        }

        pontos.forEach(ponto => {
            if (!ponto) return;

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

    // Métodos para o novo modal de alteração
    abrirModalAlteracaoMelhorado(idRegistro, dadosPonto = {}) {
        console.log('Abrindo modal melhorado para ID:', idRegistro, 'com dados:', dadosPonto);

        if (!this.alteracaoModal) {
            console.error('Modal de alteração não inicializado');
            return;
        }

        // Preenche os dados do ponto atual
        if (this.elements.tipoAtual) {
            this.elements.tipoAtual.textContent = dadosPonto.tipo || 'N/A';
        }

        if (this.elements.dataHoraAtual) {
            this.elements.dataHoraAtual.textContent = dadosPonto.data_hora || 'N/A';
        }

        // Define o ID do registro no formulário
        if (this.elements.formSolicitarAlteracaoPonto) {
            this.elements.formSolicitarAlteracaoPonto.querySelector('#idRegistro').value = idRegistro;
        }

        this.alteracaoModal.show();
    }

    async enviarSolicitacaoAlteracaoMelhorada(event) {
        event.preventDefault();
        const loading = new LoadingHelper();

        try {
            loading.show('Enviando solicitação...');
            
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Sessão expirada. Por favor, faça login novamente.');

            const formData = new FormData(this.elements.formSolicitarAlteracaoPonto);
            const dados = {
                id_registro: formData.get('idRegistro'),
                novo_tipo: formData.get('novoTipo'),
                nova_data_hora: formData.get('novoHorario'),
                motivo: formData.get('motivoAlteracao')
            };

            // Validação básica no frontend
            if (!dados.motivo || dados.motivo.length < 10) {
                throw new Error('Por favor, forneça um motivo detalhado (mínimo 10 caracteres)');
            }

            const response = await fetch('/api/funcionarios/pedir-alteracao-ponto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao enviar solicitação');
            }

            const result = await response.json();
            
            ToastHelper.success('Solicitação enviada com sucesso!');
            this.alteracaoModal.hide();
            
            // Disparar evento para atualização da interface
            document.dispatchEvent(new CustomEvent('solicitacaoEnviada', {
                detail: result.data
            }));

            // Recarrega o histórico
            await this.carregarHistorico();

        } catch (error) {
            console.error('Erro na solicitação:', error);
            ToastHelper.error(error.message);
        } finally {
            loading.hide();
        }
    }

    // Mantém os métodos antigos para compatibilidade
    abrirModalAlteracao(idRegistro) {
        console.log('Abrindo modal antigo para ID:', idRegistro);

        if (!this.modal) {
            console.log('Modal não inicializado, tentando inicializar...');
            this.initModal();

            if (!this.modal) {
                console.error('Falha ao inicializar o modal');
                return;
            }
        }

        document.getElementById('idRegistro').value = idRegistro;
        this.modal.show();
    }

    async enviarSolicitacaoAlteracao(event) {
        event.preventDefault();

        try {
            mostrarLoading();

            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Token de autenticação não encontrado');

            const formData = new FormData(this.elements.formSolicitarAlteracao);
            const dados = {
                id_registro: formData.get('idRegistro'),
                novo_horario: formData.get('novoHorario'),
                motivo: formData.get('motivoAlteracao')
            };

            const resposta = await this.enviarDados(
                '/api/funcionarios/pedir-alteracao-ponto',
                'POST',
                dados,
                token
            );

            console.log('✅ Solicitação de alteração enviada:', resposta);

            exibirSucesso('Solicitação enviada com sucesso!');

            const modal = bootstrap.Modal.getInstance(this.elements.modalAlteracao);
            modal.hide();

            await this.carregarHistorico();

        } catch (erro) {
            console.error('Erro ao enviar solicitação:', erro);
            exibirErro(erro.message || 'Erro ao enviar solicitação');
        } finally {
            esconderLoading();
        }
    }

    // Métodos utilitários (mantidos da versão original)
    formatarTipo(tipo) {
        if (!tipo) return 'Não informado';

        const tipos = {
            'ENTRADA': { classe: 'info', texto: 'Entrada', icone: 'sign-in-alt' },
            'SAIDA': { classe: 'secondary', texto: 'Saída', icone: 'sign-out-alt' },
            'SAIDA_ALMOCO': { classe: 'primary', texto: 'Saída Almoço', icone: 'utensils' },
            'RETORNO_ALMOCO': { classe: 'success', texto: 'Retorno Almoço', icone: 'utensils' }
        };

        const item = tipos[tipo.toUpperCase()] || { classe: 'light', texto: tipo, icone: 'clock' };

        return `
        <span class="badge bg-${item.classe}">
            <i class="fas fa-${item.icone} me-1"></i>${item.texto}
        </span>
    `;
    }

    async buscarDados(url, token) {
        try {
            const resposta = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }

            return await resposta.json();
        } catch (erro) {
            console.error(`❌ Erro ao buscar dados de ${url}:`, erro);
            throw erro;
        }
    }

    async enviarDados(url, method, body, token) {
        try {
            const resposta = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!resposta.ok) {
                const erroData = await resposta.json().catch(() => ({}));
                throw new Error(erroData.message || `Erro HTTP ${resposta.status}`);
            }

            return await resposta.json();
        } catch (erro) {
            console.error(`❌ Erro ao enviar dados para ${url}:`, erro);
            throw erro;
        }
    }

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

        const mapa = {
            'APROVADO': { classe: 'success', texto: 'Aprovado' },
            'PENDENTE': { classe: 'warning', texto: 'Pendente' },
            'REJEITADO': { classe: 'danger', texto: 'Rejeitado' }
        };

        const item = mapa[status.toUpperCase()] || { classe: 'secondary', texto: 'Desconhecido' };
        return `<span class="badge bg-${item.classe}">${item.texto}</span>`;
    }
}

// Classes auxiliares (novas)
class LoadingHelper {
    constructor() {
        this.loadingElement = document.getElementById('loadingOverlay') || document.getElementById('loading-overlay');
    }

    show(message = '') {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            if (message && this.loadingElement.querySelector('.loading-message')) {
                this.loadingElement.querySelector('.loading-message').textContent = message;
            }
        }
    }

    hide() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }
}

class ToastHelper {
    static success(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Sucesso', text: message });
        } else if (typeof Toastify !== 'undefined') {
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
                stopOnFocus: true
            }).showToast();
        } else {
            alert(message);
        }
    }

    static error(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Erro', text: message });
        } else if (typeof Toastify !== 'undefined') {
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
                stopOnFocus: true
            }).showToast();
        } else {
            alert(message);
        }
    }
}

// Funções utilitárias globais (mantidas para compatibilidade)
function mostrarLoading() {
    const loadingElement = document.getElementById('loading-overlay') || document.getElementById('loadingOverlay');
    if (loadingElement) loadingElement.style.display = 'flex';
}

function esconderLoading() {
    const loadingElement = document.getElementById('loading-overlay') || document.getElementById('loadingOverlay');
    if (loadingElement) loadingElement.style.display = 'none';
}

function exibirErro(mensagem) {
    ToastHelper.error(mensagem);
}

function exibirSucesso(mensagem) {
    ToastHelper.success(mensagem);
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        mostrarLoading();

        const historicoPontos = new HistoricoPontos();
        await historicoPontos.carregarHistorico();

        // Torna a instância acessível globalmente se necessário
        window.historicoPontos = historicoPontos;

    } catch (erro) {
        console.error('Erro ao inicializar histórico de pontos:', erro);
        exibirErro('Erro ao carregar o histórico de pontos. Tente recarregar a página.');
    } finally {
        esconderLoading();
    }
});