class FechamentoFolha {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api/admin';
        this.authTokenKey = 'authToken';
        this.userDataKey = 'userData';
        this.token = localStorage.getItem(this.authTokenKey);
        this.userData = JSON.parse(localStorage.getItem(this.userDataKey) || '{}');

        // Inicializa elementos e eventos (ANTES de usar this.elements)
        this.initElements();

        // Agora sim pode usar os elementos
        this.inicializarPeriodo();

        // Configurações de paginação
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;

        // Filtros
        this.filtros = {
            nome: '',
            cargo: '',
            desvios: ''
        };

        // Referência ao funcionário atual
        this.funcionarioAtual = null;

        // Eventos
        this.setupEventListeners();

        // Verifica autenticação e carrega dados
        this.checkAuthAndLoad();
    }


    inicializarPeriodo() {
        const storedDate = localStorage.getItem('fechamentoPeriodo');
        const hoje = new Date();

        if (storedDate) {
            const { mes, ano } = JSON.parse(storedDate);
            this.mesAtual = mes || hoje.getMonth() + 1;
            this.anoAtual = ano || hoje.getFullYear();
        } else {
            this.mesAtual = hoje.getMonth() + 1;
            this.anoAtual = hoje.getFullYear();
        }

        // Atualiza selects do período
        if (this.elements.selectMes) this.elements.selectMes.value = this.mesAtual;
        if (this.elements.selectAno) this.elements.selectAno.value = this.anoAtual;
    }

    initElements() {
        const get = id => document.getElementById(id);

        this.elements = {
            // Filtros e controles
            selectMes: get('selectMes'),
            selectAno: get('selectAno'),
            btnAtualizarPeriodo: get('btnAtualizarPeriodo'),
            filtroNome: get('filtroNome'),
            filtroCargo: get('filtroCargo'),
            filtroDesvios: get('filtroDesvios'),
            qtdPorPagina: get('qtdPorPagina'),
            periodoFechamento: get('periodoFechamento'),

            // Tabela e paginação
            tabelaFuncionarios: get('tabelaFuncionarios'),
            paginacao: get('paginacao'),

            // Modais
            modal: new bootstrap.Modal(get('modalFechamento')),
            modalDesvios: new bootstrap.Modal(get('modalDesvios')),
            modalNome: get('modalNome'),
            modalCargo: get('modalCargo'),
            modalHoras: get('modalHoras'),
            modalExtras: get('modalExtras'),
            modalFaltas: get('modalFaltas'),
            modalSalario: get('modalSalario'),
            observacoes: get('observacoes'),
            btnFecharPonto: get('btnFecharPonto'),
            btnVerDesvios: get('btnVerDesvios'),
            statusFechamento: get('statusFechamento'),
            conteudoDesvios: get('conteudoDesvios'),

            // Loader e mensagens
            loadingOverlay: get('loading-overlay'),
            errorMessage: get('error-message'),
            errorText: get('error-text')
        };
    }

    setupEventListeners() {
        // Eventos de filtro
        this.elements.filtroNome?.addEventListener('input', () => this.aplicarFiltro('nome', this.elements.filtroNome.value));
        this.elements.filtroCargo?.addEventListener('input', () => this.aplicarFiltro('cargo', this.elements.filtroCargo.value));
        this.elements.filtroDesvios?.addEventListener('change', () => this.aplicarFiltro('desvios', this.elements.filtroDesvios.value));

        // Eventos de paginação
        this.elements.qtdPorPagina?.addEventListener('change', () => {
            this.itemsPerPage = parseInt(this.elements.qtdPorPagina.value);
            this.currentPage = 1;
            this.carregarFechamentosPendentes();
        });

        // Eventos de período
        this.elements.btnAtualizarPeriodo?.addEventListener('click', () => {
            const mes = parseInt(this.elements.selectMes.value);
            const ano = parseInt(this.elements.selectAno.value);
            this.alterarPeriodo(mes, ano);
        });

        // Eventos de modal
        this.elements.btnFecharPonto?.addEventListener('click', () => this.fecharPontoFuncionario());
        this.elements.btnVerDesvios?.addEventListener('click', () => {
            this.elements.modal.hide();
            this.abrirModalDesvios();
        });
    }

    aplicarFiltro(tipo, valor) {
        this.filtros[tipo] = valor;
        this.currentPage = 1;
        this.carregarFechamentosPendentes();
    }

    async checkAuthAndLoad() {
        try {
            if (!this.token || !this.userData?.id) {
                throw new Error('Dados de autenticação ausentes');
            }

            if (this.userData.nivel !== 'ADMIN') {
                throw new Error('Acesso restrito');
            }

            await this.carregarFechamentosPendentes();
        } catch (error) {
            console.error('Erro na autenticação:', error);
            this.showError(error.message.includes('Acesso restrito') ?
                error.message : 'Sessão expirada. Redirecionando...');

            if (!error.message.includes('Acesso restrito')) {
                setTimeout(() => this.redirectToLogin(), 2000);
            }
        }
    }

    async carregarFechamentosPendentes() {
        this.mostrarLoading(true);

        try {
            // Salva o período no localStorage
            localStorage.setItem('fechamentoPeriodo', JSON.stringify({
                mes: this.mesAtual,
                ano: this.anoAtual
            }));

            const params = new URLSearchParams({
                mes: this.mesAtual,
                ano: this.anoAtual,
                ...this.filtros,
                page: this.currentPage,
                limit: this.itemsPerPage
            });

            const res = await this.fazerRequisicao(`/fechamentos/pendentes?${params.toString()}`);

            console.log('dados que vieram da api:', res)
            if (!res?.success) {
                throw new Error(res?.message || 'Erro ao carregar dados');
            }

            const dados = res.data?.data || [];
            this.totalItems = res.data?.total || 0;

            this.renderizarTabela(dados);
            this.renderizarPaginacao();
            this.atualizarCabecalhoPeriodo();

        } catch (error) {
            console.error('Erro ao carregar fechamentos:', error);
            this.showError(error.message || 'Erro ao carregar dados');
        } finally {
            this.mostrarLoading(false);
        }
    }

    renderizarTabela(funcionarios) {
        const tbody = this.elements.tabelaFuncionarios?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = funcionarios.length === 0 ?
            `<tr><td colspan="6" class="text-center py-4">Nenhum funcionário com fechamento pendente</td></tr>` :
            '';

        funcionarios.forEach(funcionario => {
            const tr = document.createElement('tr');
            tr.className = 'cursor-pointer';

            const temDesvios = funcionario.faltas > 0 || funcionario.atrasos > 0 ||
                funcionario.saidas_antecipadas > 0 || funcionario.pontos_nao_registrados > 0;

            tr.innerHTML = `
    <td>${funcionario.nome_funcionario}</td>
    <td>${funcionario.funcao}</td>
    <td>${funcionario.horas_trabalhadas}</td>
    <td>${funcionario.horas_extras}</td>
    <td>${funcionario.faltas || 0}</td>
    <td>
        <button class="btn btn-sm ${temDesvios ? 'btn-outline-info' : 'btn-outline-secondary'} btn-desvios" 
                data-id="${funcionario.id_funcionario}">
            ${temDesvios ? 'Ver detalhes' : 'Nenhum'}
        </button>
    </td>
`;

            // Clique na linha abre o modal de detalhes
            tr.addEventListener('click', () => this.carregarDetalhesFuncionario(funcionario.id));

            // Clique no botão de desvios (evita propagação para a linha)
            tr.querySelector('.btn-desvios').addEventListener('click', e => {
                e.stopPropagation();
                this.carregarDetalhesFuncionario(funcionario.id, true);
            });

            tbody.appendChild(tr);
        });
    }

    renderizarPaginacao() {
        const pagination = this.elements.paginacao;
        if (!pagination) return;

        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Botão Anterior
        const liPrev = this.criarItemPaginacao('«', this.currentPage === 1, () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.carregarFechamentosPendentes();
            }
        });
        pagination.appendChild(liPrev);

        // Páginas
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            const liFirst = this.criarItemPaginacao('1', false, () => {
                this.currentPage = 1;
                this.carregarFechamentosPendentes();
            });
            pagination.appendChild(liFirst);

            if (startPage > 2) {
                const liEllipsis = document.createElement('li');
                liEllipsis.className = 'page-item disabled';
                liEllipsis.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(liEllipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = this.criarItemPaginacao(i.toString(), false, () => {
                this.currentPage = i;
                this.carregarFechamentosPendentes();
            });

            if (i === this.currentPage) {
                li.classList.add('active');
            }

            pagination.appendChild(li);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const liEllipsis = document.createElement('li');
                liEllipsis.className = 'page-item disabled';
                liEllipsis.innerHTML = '<span class="page-link">...</span>';
                pagination.appendChild(liEllipsis);
            }

            const liLast = this.criarItemPaginacao(totalPages.toString(), false, () => {
                this.currentPage = totalPages;
                this.carregarFechamentosPendentes();
            });
            pagination.appendChild(liLast);
        }

        // Botão Próximo
        const liNext = this.criarItemPaginacao('»', this.currentPage === totalPages, () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.carregarFechamentosPendentes();
            }
        });
        pagination.appendChild(liNext);
    }

    criarItemPaginacao(label, disabled, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${label}</a>`;

        if (!disabled) {
            li.addEventListener('click', (e) => {
                e.preventDefault();
                onClick();
            });
        }

        return li;
    }

    async carregarDetalhesFuncionario(funcionarioId, apenasDesvios = false) {
        this.mostrarLoading(true);

        try {
            const params = new URLSearchParams({
                mes: this.mesAtual,
                ano: this.anoAtual
            });

            const res = await this.fazerRequisicao(`/fechamentos/${funcionarioId}/detalhes?${params.toString()}`);

            if (!res?.success || !res.data) {
                throw new Error(res?.message || 'Erro ao carregar detalhes do funcionário');
            }

            this.funcionarioAtual = res.data;

            if (apenasDesvios) {
                this.abrirModalDesvios();
            } else {
                this.abrirModalDetalhes();
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            this.showError(error.message || 'Erro ao carregar detalhes');
        } finally {
            this.mostrarLoading(false);
        }
    }

    abrirModalDetalhes() {
        if (!this.funcionarioAtual) return;

        const f = this.funcionarioAtual;

        this.elements.modalNome.textContent = f.nome_funcionario;
        this.elements.modalCargo.textContent = f.funcao;
        this.elements.modalHoras.textContent = f.horas_trabalhadas;
        this.elements.modalExtras.textContent = f.horas_extras;
        this.elements.modalFaltas.textContent = f.faltas;
        this.elements.modalSalario.textContent = f.salario_base?.toFixed(2) || '0.00';
        this.elements.observacoes.value = '';

        // Limpa status anterior
        this.elements.statusFechamento.style.display = 'none';
        this.elements.statusFechamento.className = 'alert mb-3';

        this.elements.modal.show();
    }

    abrirModalDesvios() {
        if (!this.funcionarioAtual) return;

        const f = this.funcionarioAtual;
        const desvios = [];

        if (f.faltas > 0) desvios.push({ tipo: 'Falta', quantidade: f.faltas });
        if (f.atrasos > 0) desvios.push({ tipo: 'Atraso', quantidade: f.atrasos });
        if (f.saidas_antecipadas > 0) desvios.push({ tipo: 'Saída Antecipada', quantidade: f.saidas_antecipadas });
        if (f.pontos_nao_registrados > 0) desvios.push({ tipo: 'Ponto não Registrado', quantidade: f.pontos_nao_registrados });

        if (desvios.length === 0) {
            this.elements.conteudoDesvios.innerHTML = '<p class="text-center">Nenhum desvio registrado</p>';
        } else {
            this.elements.conteudoDesvios.innerHTML = `
                <div class="list-group">
                    ${desvios.map(desvio => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <strong>${desvio.tipo}</strong>
                                <span class="badge bg-primary rounded-pill">${desvio.quantidade}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        this.elements.modalDesvios.show();
    }

    async fecharPontoFuncionario() {
        if (!this.funcionarioAtual) return;

        this.mostrarLoading(true);

        try {
            const body = {
                mes: this.mesAtual,
                ano: this.anoAtual,
                observacoes: this.elements.observacoes.value
            };

            const res = await this.fazerRequisicao(
                `/fechamento/funcionario/${this.funcionarioAtual.id}/fechar`,
                'POST',
                body
            );

            if (!res?.success) {
                throw new Error(res?.message || 'Erro ao fechar ponto');
            }

            // Atualiza status na modal
            this.elements.statusFechamento.textContent = 'Ponto fechado com sucesso!';
            this.elements.statusFechamento.className = 'alert alert-success mb-3';
            this.elements.statusFechamento.style.display = 'block';

            // Mostra mensagem de sucesso e recarrega a lista
            this.showSuccess('Ponto fechado com sucesso!', () => {
                this.elements.modal.hide();
                this.carregarFechamentosPendentes();
            });

        } catch (error) {
            console.error('Erro ao fechar ponto:', error);

            this.elements.statusFechamento.textContent = error.message;
            this.elements.statusFechamento.className = 'alert alert-danger mb-3';
            this.elements.statusFechamento.style.display = 'block';
        } finally {
            this.mostrarLoading(false);
        }
    }

    alterarPeriodo(mes, ano) {
        this.mesAtual = mes;
        this.anoAtual = ano;
        this.currentPage = 1;
        this.carregarFechamentosPendentes();
    }

    atualizarCabecalhoPeriodo() {
        if (!this.elements.periodoFechamento) return;

        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        this.elements.periodoFechamento.textContent = `${meses[this.mesAtual - 1]} de ${this.anoAtual}`;
    }

    async fazerRequisicao(url, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.API_BASE_URL}${url}`, options);

            if (response.status === 401) {
                this.redirectToLogin();
                throw new Error('Não autorizado');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro na requisição');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showError(error.message || 'Erro de conexão com o servidor');
            throw error;
        }
    }

    mostrarLoading(mostrar) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
        }
    }

    showError(mensagem) {
        if (this.elements.errorMessage && this.elements.errorText) {
            this.elements.errorText.textContent = mensagem;
            this.elements.errorMessage.style.display = 'block';

            // Fecha automaticamente após 5 segundos
            setTimeout(() => {
                this.elements.errorMessage.style.display = 'none';
            }, 5000);
        } else {
            console.error('Erro:', mensagem);
        }
    }

    showSuccess(mensagem, callback) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Sucesso!',
                text: mensagem,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        } else if (typeof callback === 'function') {
            callback();
        }
    }

    redirectToLogin() {
        localStorage.removeItem(this.authTokenKey);
        localStorage.removeItem(this.userDataKey);
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new FechamentoFolha();
});