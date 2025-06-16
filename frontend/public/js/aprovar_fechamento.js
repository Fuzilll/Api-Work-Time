class FechamentoFolhaManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api/admin';
        this.authTokenKey = 'authToken';
        this.userDataKey = 'userData';
        this.fechamentos = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.errorMessage = document.getElementById('error-message');
        this.elements = {};
        this.currentMonth = new Date().getMonth() + 1; // Mês atual como padrão

        this.init();
    }

    init() {
        if (!window.location.pathname.includes('/fechamento_aprovacao.html')) {
            console.warn('Acesso incorreto - redirecionando');
            window.location.href = '/fechamento_aprovacao.html';
            return;
        }

        this.initElements();
        this.setupEventListeners();
        this.checkAuthAndLoad();
    }

    initElements() {
        this.elements = {
            tabelaFechamentos: document.getElementById('tabelaFechamentos'),
            paginacao: document.getElementById('paginacao'),
            filtroNome: document.getElementById('filtroNome'),
            filtroMes: document.getElementById('filtroMes'),
            filtroAno: document.getElementById('filtroAno'),
            loading: document.getElementById('loading'),
            erro: document.getElementById('erro'),
            btnAprovar: document.querySelectorAll('.aprovar-btn')
        };

        // Configurar o mês atual como padrão se não houver seleção
        if (this.elements.filtroMes && !this.elements.filtroMes.value) {
            this.elements.filtroMes.value = this.currentMonth;
        }

        // Configurar o ano atual como padrão
        if (this.elements.filtroAno && !this.elements.filtroAno.value) {
            this.elements.filtroAno.value = new Date().getFullYear();
        }
    }

    setupEventListeners() {
        if (this.elements.filtroNome) {
            this.elements.filtroNome.addEventListener('input', () => {
                this.currentPage = 1;
                this.carregarFechamentos();
            });
        }

        if (this.elements.filtroMes) {
            this.elements.filtroMes.addEventListener('change', () => {
                this.currentPage = 1;
                this.carregarFechamentos();
            });
        }

        if (this.elements.filtroAno) {
            this.elements.filtroAno.addEventListener('change', () => {
                this.currentPage = 1;
                this.carregarFechamentos();
            });
        }

        // Delegar eventos para os botões de aprovação
        if (this.elements.tabelaFechamentos) {
            this.elements.tabelaFechamentos.addEventListener('click', (e) => {
                if (e.target.classList.contains('aprovar-btn')) {
                    const idFechamento = e.target.getAttribute('data-id');
                    this.confirmarAprovacao(idFechamento);
                }
            });
        }
    }

    async checkAuthAndLoad() {
        try {
            const token = localStorage.getItem(this.authTokenKey);
            const userData = localStorage.getItem(this.userDataKey);

            if (!token || !userData) {
                throw new Error('Dados de autenticação ausentes');
            }

            if (this.isTokenExpired(token)) {
                throw new Error('Token expirado');
            }

            try {
                this.userData = JSON.parse(userData) || this.decodeJWT(token);
                if (!this.userData?.id) {
                    throw new Error('Dados do usuário inválidos');
                }
            } catch (e) {
                throw new Error('Token inválido');
            }

            if (!this.userData.permissoes?.aprovar_fechamentos && this.userData.nivel !== 'ADMIN') {
                this.showError('Acesso restrito - Você não tem permissão para aprovar fechamentos');
                return;
            }

            await this.carregarFechamentos();

        } catch(error) {
            console.error('Falha na verificação de autenticação:', error);
            if (!error.message.includes('Acesso restrito')) {
                this.showError('Sessão expirada. Redirecionando...');
                this.redirectToLogin();
            }
        }
    }

    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch {
            return true;
        }
    }

    decodeJWT(token) {
        try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(payloadJson);

            return {
                id: payload.id || payload.sub,
                nome: payload.nome || 'Usuário',
                email: payload.email || '',
                nivel: payload.nivel || 'FUNCIONARIO',
                empresa_id: payload.empresa_id || payload.id_empresa || null,
                permissoes: payload.permissoes || {}
            };
        } catch (e) {
            console.error('Erro ao decodificar JWT:', e);
            return null;
        }
    }

    async fazerRequisicao(url, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem(this.authTokenKey)}`
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
                const error = await response.json();
                throw new Error(error.message || 'Erro na requisição');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showError(error.message || 'Erro de conexão com o servidor');
            throw error;
        }
    }

    mostrarLoading(mostrar) {
        if (this.elements.loading) {
            this.elements.loading.style.display = mostrar ? 'block' : 'none';
        }
    }

    showError(message) {
        console.error('Erro:', message);
        if (this.elements.erro) {
            this.elements.erro.textContent = message;
            this.elements.erro.classList.remove('d-none');
            setTimeout(() => {
                this.elements.erro.classList.add('d-none');
            }, 5000);
        } else {
            alert(`Erro: ${message}`);
        }
    }

    showSuccess(message, callback = null) {
        console.log('Sucesso:', message);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: message,
                confirmButtonText: 'OK'
            }).then(() => callback && callback());
        } else {
            alert(`Sucesso: ${message}`);
            callback && callback();
        }
    }

    redirectToLogin() {
        localStorage.removeItem(this.authTokenKey);
        localStorage.removeItem(this.userDataKey);

        const currentPath = window.location.pathname;
        if (!currentPath.includes('login') && !currentPath.includes('auth')) {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&session=expired`;
        }
    }

    async carregarFechamentos() {
        this.mostrarLoading(true);
        try {
            const params = new URLSearchParams({
                nomeEmpresa: this.elements.filtroNome?.value || '',
                mes: this.elements.filtroMes?.value || '',
                ano: this.elements.filtroAno?.value || new Date().getFullYear(),
                page: this.currentPage,
                limit: this.itemsPerPage
            });

            const data = await this.fazerRequisicao(`/fechamentos/aprovar_fechamento/pendentes?${params.toString()}`);

            if (data && data.success) {
                this.fechamentos = Array.isArray(data.data) ? data.data : [];
                this.totalItems = data.total || 0;
                this.renderizarTabela();
                this.renderizarPaginacao();
                return data;
            }

            throw new Error(data?.message || 'Erro ao carregar fechamentos');
        } catch (error) {
            console.error('Erro ao carregar fechamentos:', error);
            this.fechamentos = [];
            this.renderizarTabela();
            this.renderizarPaginacao();
            this.handleProcessarFormularioError(error);
            return null;
        } finally {
            this.mostrarLoading(false);
        }
    }

    renderizarTabela() {
        const tbody = this.elements.tabelaFechamentos?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.fechamentos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Nenhum fechamento pendente encontrado</td></tr>`;
            return;
        }

        this.fechamentos.forEach(fechamento => {
            const tr = this.criarLinhaFechamento(fechamento);
            tbody.appendChild(tr);
        });
    }

    criarLinhaFechamento(f) {
        const linha = document.createElement('tr');
        
        linha.innerHTML = `
            <td>${f.id}</td>
            <td>${f.funcionario_nome}</td>
            <td>${f.funcao}</td>
            <td>${f.empresa_nome}</td>
            <td>${this.formatarMesReferencia(f.mes_referencia, f.ano_referencia)}</td>
            <td>${this.criarBadgeStatus(f.status.toLowerCase())}</td>
            <td>
                <button data-id="${f.id}" class="btn btn-success btn-sm aprovar-btn">
                    <i class="fas fa-check"></i> Aprovar
                </button>
                <button data-id="${f.id}" class="btn btn-info btn-sm detalhes-btn ms-2">
                    <i class="fas fa-eye"></i> Detalhes
                </button>
            </td>
        `;
        
        // Adicionar evento para o botão de detalhes
        const detalhesBtn = linha.querySelector('.detalhes-btn');
        if (detalhesBtn) {
            detalhesBtn.addEventListener('click', () => {
                this.mostrarDetalhes(f.id);
            });
        }
        
        return linha;
    }

    formatarMesReferencia(mes, ano) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${meses[parseInt(mes) - 1]} de ${ano}`;
    }

    criarBadgeStatus(status) {
        const classes = {
            'pendente': 'bg-warning text-dark',
            'aprovado': 'bg-success',
            'rejeitado': 'bg-danger',
            'cancelado': 'bg-secondary'
        };
        
        return `<span class="badge ${classes[status] || 'bg-secondary'}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
    }

    renderizarPaginacao() {
        if (!this.elements.paginacao) return;

        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

        if (totalPages <= 1) {
            this.elements.paginacao.innerHTML = '';
            return;
        }

        this.elements.paginacao.innerHTML = '';

        // Botão Anterior
        this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
            'previous',
            '&laquo;',
            this.currentPage === 1,
            () => this.mudarPagina(this.currentPage - 1)
        ));

        // Páginas
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
                1, 1, false, () => this.mudarPagina(1)
            ));
            if (startPage > 2) {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                li.innerHTML = '<span class="page-link">...</span>';
                this.elements.paginacao.appendChild(li);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
                i, i, i === this.currentPage, () => this.mudarPagina(i)
            ));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                li.innerHTML = '<span class="page-link">...</span>';
                this.elements.paginacao.appendChild(li);
            }
            this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
                totalPages, totalPages, false, () => this.mudarPagina(totalPages)
            ));
        }

        // Botão Próximo
        this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
            'next',
            '&raquo;',
            this.currentPage === totalPages,
            () => this.mudarPagina(this.currentPage + 1)
        ));
    }

    criarBotaoPaginacao(id, content, disabled, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${id === this.currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${content}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            if (!disabled) onClick();
        });
        return li;
    }

    mudarPagina(novaPagina) {
        this.currentPage = novaPagina;
        this.carregarFechamentos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async mostrarDetalhes(idFechamento) {
        this.mostrarLoading(true);
        try {
            const data = await this.fazerRequisicao(`/fechamentos/aprovar_fechamento/${idFechamento}/detalhes`);
            
            if (data.success) {
                this.exibirModalDetalhes(data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            this.handleProcessarFormularioError(error);
        } finally {
            this.mostrarLoading(false);
        }
    }

    exibirModalDetalhes(detalhes) { 
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const modalElement = document.getElementById('modalDetalhes');
            if (!modalElement) {
                console.error('Modal não encontrado');
                return;
            }
    
            // Fechar qualquer modal aberto antes de abrir um novo
            const modaisAbertos = document.querySelectorAll('.modal.show');
            modaisAbertos.forEach(modal => {
                bootstrap.Modal.getInstance(modal)?.hide();
            });
    
            // Preencher os dados do modal
            const modalBody = document.getElementById('modalDetalhesBody');
            modalBody.innerHTML = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <h6>Funcionário</h6>
                            <p>${detalhes.funcionario_nome || 'N/A'}</p>
                        </div>
                        <div class="col-md-4">
                            <h6>Empresa</h6>
                            <p>${detalhes.empresa_nome || 'N/A'}</p>
                        </div>
                        <div class="col-md-4">
                            <h6>Período</h6>
                            <p>${this.formatarMesReferencia(detalhes.mes_referencia, detalhes.ano_referencia)}</p>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <h6>Status</h6>
                            <p>${this.criarBadgeStatus(detalhes.status?.toLowerCase() || 'indefinido')}</p>
                        </div>
                        <div class="col-md-3">
                            <h6>Registro Emp.</h6>
                            <p>${detalhes.registro_emp || 'N/A'}</p>
                        </div>
                        <div class="col-md-3">
                            <h6>Função</h6>
                            <p>${detalhes.funcao || 'N/A'}</p>
                        </div>
                        <div class="col-md-3">
                            <h6>Data Fechamento</h6>
                            <p>${detalhes.data_fechamento ? new Date(detalhes.data_fechamento).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h6>Data Aprovação</h6>
                            <p>${detalhes.data_aprovacao ? new Date(detalhes.data_aprovacao).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Aprovador</h6>
                            <p>${detalhes.admin_responsavel_nome || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <h5>Horas Trabalhadas</h5>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Horas Normais</th>
                                        <th>Horas Extras</th>
                                        <th>Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${detalhes.horas_trabalhadas ? detalhes.horas_trabalhadas.map(ht => `
                                        <tr>
                                            <td>${ht.data ? new Date(ht.data).toLocaleDateString() : 'N/A'}</td>
                                            <td>${ht.horas_trabalhadas || '0'}</td>
                                            <td>${ht.horas_extras || '0'}</td>
                                            <td>${ht.observacoes || '-'}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="4">Nenhum registro encontrado</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <h5>Ocorrências</h5>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Tipo</th>
                                        <th>Descrição</th>
                                        <th>Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${detalhes.ocorrencias ? detalhes.ocorrencias.map(o => `
                                        <tr>
                                            <td>${o.data_ocorrencia ? new Date(o.data_ocorrencia).toLocaleDateString() : 'N/A'}</td>
                                            <td>${o.tipo || '-'}</td>
                                            <td>${o.descricao || '-'}</td>
                                            <td>${o.observacoes || '-'}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="4">Nenhuma ocorrência registrada</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
    
            // Configurar o modal
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
    
            modalElement.addEventListener('hidden.bs.modal', () => {
                // Se quiser limpar o conteúdo ou resetar algo
            });
    
            modalElement.addEventListener('shown.bs.modal', () => {
                // Se quiser focar em algo no modal
            });
    
            modal.show();
    
            // Garantir a ordem correta de exibição
            modalElement.style.zIndex = '1060';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.zIndex = '1050';
            }
        } else {
            // Fallback simples
            console.log('Detalhes do fechamento:', detalhes);
            alert(`Detalhes do fechamento:\nFuncionário: ${detalhes.funcionario_nome}\nEmpresa: ${detalhes.empresa_nome}\nPeríodo: ${this.formatarMesReferencia(detalhes.mes_referencia, detalhes.ano_referencia)}`);
        }
    }
    
    

    confirmarAprovacao(idFechamento) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Confirmar Aprovação',
                html: `
                    <p>Tem certeza que deseja aprovar este fechamento?</p>
                    <p>Esta ação não pode ser desfeita.</p>
                    <div class="form-group mt-3">
                        <label for="swalJustificativa">Justificativa (opcional):</label>
                        <textarea id="swalJustificativa" class="form-control" rows="3" placeholder="Digite uma justificativa, se necessário"></textarea>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim, aprovar',
                cancelButtonText: 'Cancelar',
                focusConfirm: false,
                preConfirm: () => {
                    return {
                        justificativa: document.getElementById('swalJustificativa').value
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const justificativa = result.value?.justificativa || null;
                    this.aprovarFechamento(idFechamento, justificativa);
                }
            });
        } else {
            const justificativa = prompt('Tem certeza que deseja aprovar este fechamento?\n\nDigite uma justificativa (opcional):');
            if (justificativa !== null) {
                this.aprovarFechamento(idFechamento, justificativa || null);
            }
        }
    }

    async aprovarFechamento(idFechamento, justificativa = null) {
        this.mostrarLoading(true);
        try {
            const resultado = await this.fazerRequisicao(
                `/fechamento/aprovar_fechamento/${idFechamento}`,
                'POST',
                {
                    justificativa: justificativa
                }
            );

            if (resultado.success) {
                this.showSuccess('Fechamento aprovado com sucesso!', () => {
                    this.carregarFechamentos();
                });
                return resultado;
            }
            throw new Error(resultado.message || 'Erro ao aprovar fechamento');
        } catch (error) {
            console.error('Erro ao aprovar fechamento:', error);
            this.handleProcessarFormularioError(error);
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }

    handleProcessarFormularioError(error) {
        let mensagem = 'Erro ao processar ação';

        if (error.message.includes('Erros de validação') || error.message.includes('Erro de validação')) {
            mensagem = error.message;
        }
        else if (error.message.includes('404')) {
            mensagem = 'Endpoint não encontrado. Verifique a URL da API.';
        }
        else if (error.message.includes('500')) {
            mensagem = 'Erro interno no servidor. Tente novamente mais tarde.';
        }
        else if (error.message.includes('403')) {
            mensagem = 'Acesso negado. Você não tem permissão para esta ação.';
        }
        else if (error.message.includes('Fechamento não encontrado')) {
            mensagem = 'O fechamento solicitado não foi encontrado.';
        }
        else if (error.message.includes('já está aprovado')) {
            mensagem = 'Este fechamento já foi aprovado por outro usuário.';
        }
        else {
            mensagem = error.message || 'Erro desconhecido';
        }

        this.showError(mensagem);
    }
}

// Inicialização da classe quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!document.getElementById('tabelaFechamentos')) {
            return;
        }

        // Verifica dependências
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap não está carregado. Algumas funcionalidades podem não estar disponíveis.');
        }

        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert2 não está carregado. Alertas personalizados não estarão disponíveis.');
        }

        // Inicializa o manager
        window.fechamentoFolhaManager = new FechamentoFolhaManager();
    } catch (error) {
        console.error('Falha na inicialização:', error);

        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger m-3';
        errorContainer.innerHTML = `
            <h4>Erro ao carregar a página</h4>
            <p>${error.message || 'Ocorreu um erro inesperado'}</p>
            <p>Por favor, recarregue a página ou tente novamente mais tarde.</p>
            <button class="btn btn-secondary" onclick="window.location.reload()">Recarregar</button>
        `;

        document.body.prepend(errorContainer);

        if (!localStorage.getItem('authToken') && !window.location.pathname.includes('/login')) {
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        }
    }
});