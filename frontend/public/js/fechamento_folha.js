class FechamentoFolhaFrontend {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api/admin';
        this.authTokenKey = 'authToken';
        this.userDataKey = 'userData';
        this.funcionarios = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.errorMessage = document.getElementById('error-message');
        this.elements = {};
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();

        this.init();
    }

    init() {
        if (!window.location.pathname.includes('/fechamento_de_folha.html')) {
            console.warn('Acesso incorreto - redirecionando');
            window.location.href = '/fechamento_de_folha.html';
            return;
        }

        this.initElements();
        this.setupEventListeners();
        this.checkAuthAndLoad();
    }

    initElements() {
        this.elements = {
            tabelaFuncionarios: document.getElementById('tabelaFuncionarios'),
            paginacao: document.getElementById('paginacao'),
            filtroMes: document.getElementById('filtroMes'),
            filtroAno: document.getElementById('filtroAno'),
            filtroNome: document.getElementById('filtroNome'),
            filtroCargo: document.getElementById('filtroCargo'),
            filtroDesvios: document.getElementById('filtroDesvios'),
            qtdPorPagina: document.getElementById('qtdPorPagina'),
            btnFiltrar: document.getElementById('btnFiltrar'),
            btnFecharFolha: document.getElementById('btnFecharFolha'),
            loading: document.getElementById('loading'),
            erro: document.getElementById('erro'),
            modal: document.getElementById('modal'),
            modalNome: document.getElementById('modalNome'),
            modalCargo: document.getElementById('modalCargo'),
            modalHoras: document.getElementById('modalHoras'),
            modalExtras: document.getElementById('modalExtras'),
            modalFaltas: document.getElementById('modalFaltas'),
            modalSalario: document.getElementById('modalSalario'),
            modalDesvios: document.getElementById('modalDesvios'),
            conteudoDesvios: document.getElementById('conteudoDesvios'),
            observacoes: document.getElementById('observacoes'),
            btnFecharPonto: document.getElementById('btnFecharPonto'),
            statusFechamento: document.getElementById('statusFechamento')
        };

        // Configurar valores padrão
        if (this.elements.filtroMes) {
            this.elements.filtroMes.value = this.currentMonth;
        }
        if (this.elements.filtroAno) {
            this.elements.filtroAno.value = this.currentYear;
        }
    }

    setupEventListeners() {
        if (this.elements.btnFiltrar) {
            this.elements.btnFiltrar.addEventListener('click', () => this.carregarFuncionarios());
        }

        if (this.elements.filtroNome) {
            this.elements.filtroNome.addEventListener('input', () => this.filtrarTabela());
        }

        if (this.elements.filtroCargo) {
            this.elements.filtroCargo.addEventListener('input', () => this.filtrarTabela());
        }

        if (this.elements.filtroDesvios) {
            this.elements.filtroDesvios.addEventListener('input', () => this.filtrarTabela());
        }

        if (this.elements.qtdPorPagina) {
            this.elements.qtdPorPagina.addEventListener('change', () => {
                this.itemsPerPage = parseInt(this.elements.qtdPorPagina.value);
                this.renderizarTabela();
            });
        }

        if (this.elements.btnFecharPonto) {
            this.elements.btnFecharPonto.addEventListener('click', () => this.executarFechamento(this.currentFuncionarioId));
        }

        // Delegar eventos para a tabela
        if (this.elements.tabelaFuncionarios) {
            this.elements.tabelaFuncionarios.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-detalhes')) {
                    const idFuncionario = e.target.getAttribute('data-id');
                    this.mostrarDetalhesFuncionario(idFuncionario);
                }
                if (e.target.classList.contains('btn-fechar')) {
                    const idFuncionario = e.target.getAttribute('data-id');
                    this.confirmarFechamentoIndividual(idFuncionario);
                }
            });
        }

        // Fechar modal
        if (this.elements.modal) {
            this.elements.modal.querySelector('.close').addEventListener('click', () => {
                this.elements.modal.style.display = 'none';
            });
        }
    }

    // Métodos de autenticação e helpers
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

            this.userData = JSON.parse(userData);
            if (!this.userData?.id) {
                throw new Error('Dados do usuário inválidos');
            }

            if (!this.userData.permissoes?.gerar_fechamentos && this.userData.nivel !== 'ADMIN') {
                this.showError('Acesso restrito - Você não tem permissão para gerar fechamentos');
                return;
            }

            await this.carregarFuncionarios();

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
            const decoded = this.decodeJWT(token);
            return decoded.exp < Date.now() / 1000;
        } catch {
            return true;
        }
    }

    decodeJWT(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    }

    async fazerRequisicao(endpoint, method = 'GET', body = null) {
        this.mostrarLoading(true);
        try {
            const url = `${this.API_BASE_URL}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(this.authTokenKey)}`
            };

            const options = {
                method,
                headers
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showError(error.message || 'Erro ao processar requisição');
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }

    mostrarLoading(mostrar) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
        }
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(message, callback = null) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Sucesso!',
                html: message,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                if (callback) callback();
            });
        } else {
            alert(message);
            if (callback) callback();
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    // Métodos específicos para fechamento de folha
    async carregarFuncionarios() {
        this.mostrarLoading(true);
        try {
            const mes = this.elements.filtroMes.value;
            const ano = this.elements.filtroAno.value;

            const data = await this.fazerRequisicao(
                `/fechamento/funcionarios?ano=${ano}&mes=${mes}`
            );

            if (data && data.success) {
                this.funcionarios = Array.isArray(data.data) ? data.data : [];
                this.renderizarTabela();
                return data;
            }
            console.log(data)
            throw new Error(data?.message || 'Erro ao carregar funcionários');
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            this.funcionarios = [];
            this.renderizarTabela();
            this.showError(error.message || 'Erro ao carregar funcionários');
            return null;
        } finally {
            this.mostrarLoading(false);
        }
    }

    filtrarTabela() {
        const nomeFiltro = this.elements.filtroNome.value.toLowerCase();
        const cargoFiltro = this.elements.filtroCargo.value.toLowerCase();
        const desviosFiltro = this.elements.filtroDesvios.value.toLowerCase();

        const funcionariosFiltrados = this.funcionarios.filter(func => {
            const nomeMatch = func.nome.toLowerCase().includes(nomeFiltro);
            const cargoMatch = func.cargo.toLowerCase().includes(cargoFiltro);
            
            // Verificar desvios (faltas, atrasos, etc.)
            const desviosMatch = 
                func.faltas.toString().includes(desviosFiltro) ||
                func.atrasos.toString().includes(desviosFiltro) ||
                func.saidas_antecipadas.toString().includes(desviosFiltro) ||
                func.pontos_nao_registrados.toString().includes(desviosFiltro);

            return nomeMatch && cargoMatch && desviosMatch;
        });

        this.renderizarTabela(funcionariosFiltrados);
    }

    renderizarTabela(funcionarios = this.funcionarios) {
        const tbody = this.elements.tabelaFuncionarios?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (funcionarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        Nenhum funcionário encontrado para o período selecionado
                    </td>
                </tr>
            `;
            return;
        }

        // Paginação
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedFuncionarios = funcionarios.slice(startIndex, endIndex);

        paginatedFuncionarios.forEach(funcionario => {
            const tr = document.createElement('tr');
            
            const totalDesvios = 
                parseInt(funcionario.faltas || 0) + 
                parseInt(funcionario.atrasos || 0) + 
                parseInt(funcionario.saidas_antecipadas || 0) + 
                parseInt(funcionario.pontos_nao_registrados || 0);
            
            tr.innerHTML = `
                <td>${funcionario.nome}</td>
                <td>${funcionario.cargo}</td>
                <td>${funcionario.horas_trabalhadas || 0}h</td>
                <td>${funcionario.horas_extras || 0}h</td>
                <td>${funcionario.faltas || 0}</td>
                <td>
                    ${totalDesvios > 0 ? 
                        `<span class="badge bg-warning">${totalDesvios} desvios</span>` : 
                        `<span class="badge bg-success">Sem desvios</span>`}
                </td>
                <td>
                    <button data-id="${funcionario.id}" class="btn btn-info btn-sm btn-detalhes">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                    <button 
                        data-id="${funcionario.id}" 
                        class="btn btn-primary btn-sm btn-fechar"
                        ${funcionario.ja_fechado ? 'disabled' : ''}
                    >
                        <i class="fas fa-file-invoice-dollar"></i> Fechar
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });

        this.renderizarPaginacao(funcionarios.length);
    }

    renderizarPaginacao(totalItems) {
        const paginacao = this.elements.paginacao;
        if (!paginacao) return;

        paginacao.innerHTML = '';

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        if (totalPages <= 1) return;

        // Botão Anterior
        if (this.currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '&laquo; Anterior';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.renderizarTabela();
            });
            paginacao.appendChild(prevBtn);
        }

        // Números das páginas
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.renderizarTabela();
            });
            paginacao.appendChild(pageBtn);
        }

        // Botão Próximo
        if (this.currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = 'Próximo &raquo;';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderizarTabela();
            });
            paginacao.appendChild(nextBtn);
        }
    }

    mostrarDetalhesFuncionario(idFuncionario) {
        const funcionario = this.funcionarios.find(f => f.id == idFuncionario);
        if (!funcionario) return;

        this.currentFuncionarioId = idFuncionario;

        // Preencher modal com os dados
        this.elements.modalNome.textContent = funcionario.nome;
        this.elements.modalCargo.textContent = funcionario.cargo;
        this.elements.modalHoras.textContent = `${funcionario.horas_trabalhadas || 0}h`;
        this.elements.modalExtras.textContent = `${funcionario.horas_extras || 0}h`;
        this.elements.modalFaltas.textContent = funcionario.faltas || 0;
        
        // Aqui você pode adicionar lógica para calcular o salário base
        this.elements.modalSalario.textContent = '0,00'; // Substituir por cálculo real

        // Mostrar modal
        this.elements.modal.style.display = 'block';
    }

    abrirModalDesvios() {
        const funcionario = this.funcionarios.find(f => f.id == this.currentFuncionarioId);
        if (!funcionario) return;

        this.elements.conteudoDesvios.innerHTML = `
            <h3>Detalhes dos Desvios</h3>
            <ul>
                <li><strong>Faltas:</strong> ${funcionario.faltas || 0}</li>
                <li><strong>Atrasos:</strong> ${funcionario.atrasos || 0}</li>
                <li><strong>Saídas Antecipadas:</strong> ${funcionario.saidas_antecipadas || 0}</li>
                <li><strong>Pontos não Registrados:</strong> ${funcionario.pontos_nao_registrados || 0}</li>
            </ul>
        `;

        this.elements.modalDesvios.style.display = 'block';
    }

    fecharModalDesvios() {
        this.elements.modalDesvios.style.display = 'none';
    }

    async confirmarFechamentoIndividual(idFuncionario) {
        const funcionario = this.funcionarios.find(f => f.id == idFuncionario);
        if (!funcionario) return;
    
        const periodo = `${this.elements.filtroMes.value}/${this.elements.filtroAno.value}`;
        const desvios = (funcionario.atrasos || 0) + (funcionario.saidas_antecipadas || 0) + (funcionario.pontos_nao_registrados || 0);
    
        const confirmMessage = {
            title: 'Confirmar Fechamento',
            html: `
                <p>Tem certeza que deseja realizar o fechamento para <strong>${funcionario.nome}</strong>?</p>
                <p>Período: ${periodo}</p>
                <div class="text-start">
                    <p><strong>Horas Trabalhadas:</strong> ${funcionario.horas_trabalhadas || 0}h</p>
                    <p><strong>Horas Extras:</strong> ${funcionario.horas_extras || 0}h</p>
                    <p><strong>Faltas:</strong> ${funcionario.faltas || 0}</p>
                    <p><strong>Desvios:</strong> ${desvios}</p>
                </div>
            `,
            confirmText: 'Sim, realizar fechamento'
        };
    
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                ...confirmMessage,
                icon: 'question',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                focusConfirm: false
            });
    
            if (result.isConfirmed) {
                await this.executarFechamento(idFuncionario);
            }
        } else {
            const basicMessage = `Tem certeza que deseja realizar o fechamento para ${funcionario.nome}?\nPeríodo: ${periodo}`;
            if (confirm(basicMessage)) {
                await this.executarFechamento(idFuncionario);
            }
        }
    }
    
    async executarFechamento(idFuncionario) {
        this.mostrarLoading(true);
        try {
            const response = await this.fazerRequisicao(
                `/fechamento/funcionario/${idFuncionario}/fechar`,
                'POST',
                {
                    mes: this.elements.filtroMes.value,
                    ano: this.elements.filtroAno.value,
                    observacoes: this.elements.observacoes.value
                }
            );
    
            if (response.success) {
                this.showSuccess('Fechamento realizado com sucesso!', () => {
                    this.carregarFuncionarios();
                    this.elements.modal.style.display = 'none';
                });
                return response;
            }
            throw new Error(response.message || 'Erro ao realizar fechamento');
        } catch (error) {
            console.error('Erro ao realizar fechamento:', error);
            this.showError(error.message || 'Erro ao realizar fechamento');
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }
}

// Inicialização da classe quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!document.getElementById('tabelaFuncionarios')) {
            return;
        }

        window.fechamentoFolhaFrontend = new FechamentoFolhaFrontend();
    } catch (error) {
        console.error('Falha na inicialização:', error);
        document.getElementById('error-message').textContent = 'Erro ao carregar a página. Por favor, recarregue.';
        document.getElementById('error-message').style.display = 'block';
    }
});