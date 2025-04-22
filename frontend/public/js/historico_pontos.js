class HistoricoPontos {
    constructor() {
        this.authTokenKey = 'authToken';
        this.modal = null;
        this.initElements();
        this.setupEventListeners();
        this.initModal(); 
    }

    initElements() {
        this.elements = {
            tabelaPontos: document.getElementById('tabela-pontos'),
            dataInicio: document.getElementById('data-inicio'),
            dataFim: document.getElementById('data-fim'),
            btnFiltrar: document.getElementById('btn-filtrar'),
            btnLimpar: document.getElementById('btn-limpar'),
            modalAlteracao: document.getElementById('modalAlteracao'),
            formSolicitarAlteracao: document.getElementById('formSolicitarAlteracao')
        };
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
        // Verifica se o elemento modal existe
        if (!this.elements.modalAlteracao) {
            console.error('Elemento modal não encontrado');
            return;
        }

        // Inicializa o modal apenas uma vez
        this.modal = new bootstrap.Modal(this.elements.modalAlteracao);

        // Adiciona event delegation para os botões da tabela
        this.elements.tabelaPontos?.querySelector('tbody')?.addEventListener('click', (e) => this.handleTableClick(e));
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

            // Inicializa o modal APÓS renderizar a tabela
            this.initModal();

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
        if (idRegistro) {
            this.abrirModalAlteracao(idRegistro);
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
    // Adicione este novo método para formatar o tipo do ponto
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

    abrirModalAlteracao(idRegistro) {
        console.log('Abrindo modal para ID:', idRegistro);

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

    // Métodos utilitários
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

// Funções utilitárias globais
function mostrarLoading() {
    const loadingElement = document.getElementById('loading-overlay');
    if (loadingElement) loadingElement.style.display = 'flex';
}

function esconderLoading() {
    const loadingElement = document.getElementById('loading-overlay');
    if (loadingElement) loadingElement.style.display = 'none';
}

function exibirErro(mensagem) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'error', title: 'Erro', text: mensagem });
    } else {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerText = mensagem;
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        }
    }
}

function exibirSucesso(mensagem) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'success', title: 'Sucesso', text: mensagem });
    } else {
        alert(mensagem);
    }
}
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
