class FuncionariosManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.authTokenKey = 'authToken';
        this.userDataKey = 'userData';
        this.funcionarios = [];
        this.departamentos = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFuncionarioId = null;
        this.currentAction = null;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.errorMessage = document.getElementById('error-message');
        this.elements = {};
        this.isSavingHorarios = false;

        this.init();
    }

    init() {
        // Verificar se estamos na URL correta
        if (!window.location.pathname.includes('/gerenciar_funcionarios.html')) {
            console.warn('Acesso incorreto - redirecionando');
            window.location.href = '/gerenciar_funcionarios.html';
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
            formFiltros: document.getElementById('formFiltros'),
            btnSalvarHorarios: document.getElementById('btnSalvarHorarios'),
            btnConfirmarAcao: document.getElementById('btnConfirmarAcao'),
            btnNovoFuncionario: document.getElementById('btnNovoFuncionario'),
            btnExport: document.getElementById('btnExport'),
            horariosBody: document.getElementById('horariosBody'),
            confirmacaoTitulo: document.getElementById('confirmacaoTitulo'),
            confirmacaoMensagem: document.getElementById('confirmacaoMensagem'),
            filtroStatus: document.getElementById('filtroStatus'),
            filtroDepartamento: document.getElementById('filtroDepartamento'),
            filtroNome: document.getElementById('filtroNome'),
            filtroMatricula: document.getElementById('filtroMatricula')
        };

        // Inicializa modais apenas se existirem no DOM
        const modalHorariosEl = document.getElementById('modalHorarios');
        const modalConfirmacaoEl = document.getElementById('modalConfirmacao');

        if (modalHorariosEl) {
            this.elements.modalHorarios = new bootstrap.Modal(modalHorariosEl);
        }
        if (modalConfirmacaoEl) {
            this.elements.modalConfirmacao = new bootstrap.Modal(modalConfirmacaoEl);
        }
    }

    setupEventListeners() {
        if (this.elements.formFiltros) {
            this.elements.formFiltros.addEventListener('submit', (e) => {
                e.preventDefault();
                this.currentPage = 1;
                this.carregarFuncionarios();
            });
        }

        if (this.elements.btnNovoFuncionario) {
            this.elements.btnNovoFuncionario.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'cadastrar_funcionarios.html';
            });
        }

        if (this.elements.btnSalvarHorarios) {
            this.elements.btnSalvarHorarios.addEventListener('click', (e) => {
                e.preventDefault();
                this.salvarHorarios();
            });
        }

        if (this.elements.btnConfirmarAcao) {
            this.elements.btnConfirmarAcao.addEventListener('click', () => this.executarAcao());
        }

        if (this.elements.btnExport) {
            this.elements.btnExport.addEventListener('click', () => this.exportarDados());
        }
    }
    async checkAuthAndLoad() {
        try {

            await Promise.all([
                this.carregarDepartamentos().catch(e => console.error('Erro departamentos:', e)),
                this.carregarFuncionarios().catch(e => console.error('Erro funcionários:', e))
            ]);
        } catch (error) {
            console.error('Erro no carregamento inicial:', error);
        }
        // Verificação em duas etapas
        const token = localStorage.getItem(this.authTokenKey);
        const userData = localStorage.getItem(this.userDataKey);

        console.log('Token:', localStorage.getItem(this.authTokenKey));
        console.log('UserData:', localStorage.getItem(this.userDataKey));

        if (!token || !userData) {
            throw new Error('Dados de autenticação ausentes');
        }

        // Verificação síncrona antes de qualquer requisição
        if (this.isTokenExpired(token)) {
            throw new Error('Token expirado');
        }

        // Decodificação segura do token
        try {
            this.userData = JSON.parse(userData) || this.decodeJWT(token);
            if (!this.userData?.id) {
                throw new Error('Dados do usuário inválidos');
            }
        } catch (e) {
            throw new Error('Token inválido');
        }

        // Verificação de permissões
        if (this.userData.nivel !== 'ADMIN') {
            this.showError('Acesso restrito');
            return;
        }

        // Carregamento paralelo seguro
        await Promise.allSettled([
            this.carregarDepartamentos(),
            this.carregarFuncionarios()
        ]);

    } catch(error) {
        console.error('Falha na verificação de autenticação:', error);
        if (!error.message.includes('Acesso restrito')) {
            this.showError('Sessão expirada. Redirecionando...');
            this.redirectToLogin();
        }
    }


    // Método auxiliar para verificar token
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch {
            return true; // Considera expirado se houver erro na decodificação
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
                empresa_id: payload.empresa_id || payload.id_empresa || null
            };
        } catch (e) {
            console.error('Erro ao decodificar JWT:', e);
            return null;
        }
    }

    async fazerRequisicao(url, method = 'GET', body = null) {
        try {
            const response = await fetch(`${this.API_BASE_URL}${url}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem(this.authTokenKey)}`
                },
                credentials: 'include' // Importante para cookies de sessão
            });

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
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
        }
    }

    showError(message) {
        console.error('Erro:', message);
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
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
        // Limpeza completa
        localStorage.removeItem(this.authTokenKey);
        localStorage.removeItem(this.userDataKey);
        sessionStorage.removeItem('pendingRequests');

        // Evitar loop de redirecionamento
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login') && !currentPath.includes('auth')) {
            // Adiciona parâmetro para tratamento especial no login
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&session=expired`;
        }
    }
    // No método carregarDepartamentos
    async carregarDepartamentos() {
        this.mostrarLoading(true);
        try {
            const data = await this.fazerRequisicao('/admin/departamentos');
            if (data?.success) {
                this.departamentos = Array.isArray(data.data) ? data.data : [];
                this.preencherSelectDepartamentos();
                return true;
            }
            throw new Error(data?.message || 'Resposta inválida do servidor');
        } catch (error) {
            console.error('Erro ao carregar departamentos:', error);
            this.showError('Não foi possível carregar os departamentos');
            return false;
        } finally {
            this.mostrarLoading(false);
        }
    }
    preencherSelectDepartamentos() {
        const select = this.elements.filtroDepartamento;
        if (!select) return;

        select.innerHTML = '<option value="">Todos</option>';

        this.departamentos.forEach(depto => {
            const option = document.createElement('option');
            option.value = depto;
            option.textContent = depto;
            select.appendChild(option);
        });
    }

    async carregarFuncionarios() {
        this.mostrarLoading(true);
        try {
            const params = new URLSearchParams({
                ...this.obterFiltros(),
                page: this.currentPage,
                limit: this.itemsPerPage
            });

            const data = await this.fazerRequisicao(`/admin/funcionarios?${params.toString()}`);

            if (data && data.success) {
                this.funcionarios = data.data || [];
                this.totalItems = data.total || this.funcionarios.length; // Adicionado suporte para paginação no backend
                this.renderizarTabela();
                this.renderizarPaginacao();
                return data;
            }
            throw new Error(data?.message || 'Erro ao carregar funcionários');
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            this.funcionarios = [];
            this.renderizarTabela();
            this.renderizarPaginacao();

            // Mostrar mensagem mais amigável
            if (error.message.includes('404')) {
                this.showError('Endpoint não encontrado. Atualize a página.');
            } else {
                this.showError('Não foi possível carregar os funcionários. Tente novamente.');
            }

            return null;
        } finally {
            this.mostrarLoading(false);
        }
    }


    obterFiltros() {
        return {
            status: this.elements.filtroStatus?.value || '',
            departamento: this.elements.filtroDepartamento?.value || '',
            nome: this.elements.filtroNome?.value || '',
            registro_emp: this.elements.filtroMatricula?.value || '',
            page: this.currentPage,
            limit: this.itemsPerPage
        };
    }

    renderizarTabela() {
        if (!this.elements.paginacao) return;

        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

        const tbody = this.elements.tabelaFuncionarios?.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const funcionariosPagina = this.obterFuncionariosPagina();

        if (funcionariosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Nenhum funcionário encontrado</td></tr>`;
            return;
        }

        funcionariosPagina.forEach(funcionario => {
            const tr = this.criarLinhaFuncionario(funcionario);
            tbody.appendChild(tr);
        });

        this.adicionarEventosBotoes();
    }

    obterFuncionariosPagina() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.funcionarios.length);
        return this.funcionarios.slice(startIndex, endIndex);
    }

    criarLinhaFuncionario(funcionario) {
        const tr = document.createElement('tr');
        tr.className = 'funcionario-card';

        tr.innerHTML = `
            <td>${funcionario.nome}</td>
            <td>${funcionario.registro_emp}</td>
            <td>${funcionario.departamento || '-'}</td>
            <td>${funcionario.funcao}</td>
            <td>${this.criarBadgeStatus(funcionario.status)}</td>
            <td>${funcionario.total_registros || 0}</td>
            <td class="text-end">
                <div class="d-flex gap-2 justify-content-end">
                    <button class="btn btn-sm btn-outline-primary btn-horarios" data-id="${funcionario.id}" title="Horários">
                        <i class="fas fa-clock"></i>
                    </button>
                    ${funcionario.status === 'Ativo' ?
                `<button class="btn btn-sm btn-outline-warning btn-desativar" data-id="${funcionario.id}" title="Desativar">
                            <i class="fas fa-user-times"></i>
                        </button>` :
                `<button class="btn btn-sm btn-outline-success btn-reativar" data-id="${funcionario.id}" title="Reativar">
                            <i class="fas fa-user-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-excluir" data-id="${funcionario.id}" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>`
            }
                </div>
            </td>
        `;

        return tr;
    }

    criarBadgeStatus(status) {
        const statusClass = status === 'Ativo' ? 'bg-success' : 'bg-secondary';
        return `<span class="badge ${statusClass}">${status}</span>`;
    }

    adicionarEventosBotoes() {
        document.querySelectorAll('.btn-horarios').forEach(btn => {
            btn.addEventListener('click', () => this.abrirModalHorarios(btn.dataset.id));
        });

        document.querySelectorAll('.btn-desativar').forEach(btn => {
            btn.addEventListener('click', () => this.confirmarAcao(btn.dataset.id, 'desativar'));
        });

        document.querySelectorAll('.btn-reativar').forEach(btn => {
            btn.addEventListener('click', () => this.confirmarAcao(btn.dataset.id, 'reativar'));
        });

        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', () => this.confirmarAcao(btn.dataset.id, 'excluir'));
        });
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
        else {
            mensagem = error.message;
        }

        this.showError(mensagem);
    }
    renderizarPaginacao() {
        if (!this.elements.paginacao) return;

        const totalPages = Math.ceil(this.funcionarios.length / this.itemsPerPage);

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
        for (let i = 1; i <= totalPages; i++) {
            this.elements.paginacao.appendChild(this.criarBotaoPaginacao(
                i,
                i,
                i === this.currentPage,
                () => this.mudarPagina(i)
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
        li.className = `page-item ${disabled ? 'disabled' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${content}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            if (!disabled) onClick();
        });
        return li;
    }

    mudarPagina(novaPagina) {
        this.currentPage = novaPagina;
        this.renderizarTabela();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async abrirModalHorarios(funcionarioId) {
        this.mostrarLoading(true);
        try {
            this.currentFuncionarioId = funcionarioId;
            const funcionario = this.funcionarios.find(f => f.id == funcionarioId);

            if (!funcionario) {
                throw new Error('Funcionário não encontrado');
            }

            if (this.elements.modalHorarios) {
                // Configure o modal para não fechar ao clicar fora ou pressionar ESC
                this.elements.modalHorarios._element.addEventListener('hide.bs.modal', (e) => {
                    // Adicione lógica para verificar se pode fechar
                    if (this.isSavingHorarios) {
                        e.preventDefault();
                    }
                });

                const modalTitle = this.elements.modalHorarios._element.querySelector('.modal-title');
                if (modalTitle) {
                    modalTitle.textContent = `Horários de Trabalho - ${funcionario.nome}`;
                }

                const data = await this.fazerRequisicao(`/admin/funcionarios/${funcionarioId}/horarios`);

                if (data.success) {
                    this.preencherTabelaHorarios(data.data);
                    this.elements.modalHorarios.show();
                }
            }
        } catch (error) {
            console.error('Erro ao abrir modal de horários:', error);
            this.showError(error.message || 'Erro ao carregar horários');
        } finally {
            this.mostrarLoading(false);
        }
    }

    preencherTabelaHorarios(horarios) {
        if (!this.elements.horariosBody) return;

        this.elements.horariosBody.innerHTML = '';
        const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

        diasSemana.forEach(dia => {
            const horarioExistente = horarios.find(h => h.dia_semana === dia);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dia}</td>
                <td><input type="time" class="form-control time-input" name="hora_entrada_${dia}" 
                    value="${horarioExistente?.hora_entrada || '08:00'}"></td>
                <td><input type="time" class="form-control time-input" name="hora_saida_${dia}" 
                    value="${horarioExistente?.hora_saida || '17:00'}"></td>
                <td><input type="time" class="form-control time-input" name="intervalo_inicio_${dia}" 
                    value="${horarioExistente?.intervalo_inicio || '12:00'}"></td>
                <td><input type="time" class="form-control time-input" name="intervalo_fim_${dia}" 
                    value="${horarioExistente?.intervalo_fim || '13:00'}"></td>
            `;

            this.elements.horariosBody.appendChild(tr);
        });
    }

    async salvarHorarios() {
        if (this.isSavingHorarios) return;

        this.isSavingHorarios = true;
        this.mostrarLoading(true);

        try {
            const horarios = this.obterHorariosFormulario();
            const data = await this.fazerRequisicao(
                `/admin/funcionarios/${this.currentFuncionarioId}/horarios`,
                'PUT',
                { horarios }
            );

            if (data.success) {
                this.showSuccess('Horários atualizados com sucesso!', () => {
                    if (this.elements.modalHorarios) {
                        this.elements.modalHorarios.hide();
                    }
                    this.carregarFuncionarios();
                });
                return data;
            }
            throw new Error(data.message || 'Erro ao salvar horários');
        } catch (error) {
            console.error('Erro ao salvar horários:', error);
            this.handleProcessarFormularioError(error);
            throw error;
        } finally {
            this.isSavingHorarios = false;
            this.mostrarLoading(false);
        }
    }

    obterHorariosFormulario() {
        const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
        const horarios = [];

        diasSemana.forEach(dia => {
            const entrada = document.querySelector(`input[name="hora_entrada_${dia}"]`)?.value;
            const saida = document.querySelector(`input[name="hora_saida_${dia}"]`)?.value;
            const intervaloInicio = document.querySelector(`input[name="intervalo_inicio_${dia}"]`)?.value;
            const intervaloFim = document.querySelector(`input[name="intervalo_fim_${dia}"]`)?.value;

            if (entrada && saida) {
                horarios.push({
                    dia_semana: dia,
                    hora_entrada: entrada,
                    hora_saida: saida,
                    intervalo_inicio: intervaloInicio || null,
                    intervalo_fim: intervaloFim || null
                });
            }
        });

        return horarios;
    }

    confirmarAcao(funcionarioId, action) {
        this.currentFuncionarioId = funcionarioId;
        this.currentAction = action;

        const funcionario = this.funcionarios.find(f => f.id == funcionarioId);
        if (!funcionario) return;

        const mensagens = {
            desativar: {
                titulo: 'Confirmar Desativação',
                mensagem: `
                    <p>Tem certeza que deseja desativar o funcionário <strong>${funcionario.nome}</strong>?</p>
                    <p class="text-muted">O funcionário não poderá mais acessar o sistema, mas seus dados serão mantidos.</p>
                `
            },
            reativar: {
                titulo: 'Confirmar Reativação',
                mensagem: `
                    <p>Tem certeza que deseja reativar o funcionário <strong>${funcionario.nome}</strong>?</p>
                    <p class="text-muted">O funcionário terá seu acesso ao sistema restabelecido.</p>
                `
            },
            excluir: {
                titulo: 'Confirmar Exclusão',
                mensagem: `
                    <p class="text-danger"><strong>Atenção:</strong> Esta ação é irreversível!</p>
                    <p>Tem certeza que deseja excluir permanentemente o funcionário <strong>${funcionario.nome}</strong>?</p>
                    <p class="text-muted">Todos os dados relacionados a este funcionário serão removidos do sistema.</p>
                `
            }
        };

        if (this.elements.confirmacaoTitulo) {
            this.elements.confirmacaoTitulo.textContent = mensagens[action].titulo;
        }
        if (this.elements.confirmacaoMensagem) {
            this.elements.confirmacaoMensagem.innerHTML = mensagens[action].mensagem;
        }
        if (this.elements.modalConfirmacao) {
            this.elements.modalConfirmacao.show();
        }
    }

    async executarAcao() {
        this.mostrarLoading(true);
        try {
            const { endpoint, method, message } = this.obterConfigAcao();
            const data = await this.fazerRequisicao(endpoint, method);

            if (data.success) {
                this.showSuccess(message);
                if (this.elements.modalConfirmacao) {
                    this.elements.modalConfirmacao.hide();
                }
                await this.carregarFuncionarios(); // Recarrega os dados após ação
                return data;
            }
            throw new Error(data.message || 'Ação não foi bem sucedida');
        } catch (error) {
            console.error(`Erro ao ${this.currentAction} funcionário:`, error);
            this.handleProcessarFormularioError(error);
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }

    obterConfigAcao() {
        const config = {
            desativar: {
                endpoint: `/admin/funcionarios/${this.currentFuncionarioId}/desativar`,
                method: 'PUT',
                message: 'Funcionário desativado com sucesso!'
            },
            reativar: {
                endpoint: `/admin/funcionarios/${this.currentFuncionarioId}/reativar`,
                method: 'PUT',
                message: 'Funcionário reativado com sucesso!'
            },
            excluir: {
                endpoint: `/admin/funcionarios/${this.currentFuncionarioId}`,
                method: 'DELETE',
                message: 'Funcionário excluído com sucesso!'
            }
        };

        return config[this.currentAction];
    }

    async exportarDados() {
        this.mostrarLoading(true);
        try {
            const params = new URLSearchParams(this.obterFiltros());
            const token = localStorage.getItem(this.authTokenKey);

            if (!token) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(`${this.API_BASE_URL}/admin/funcionarios/export?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Erro ao exportar dados');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `funcionarios_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showSuccess('Exportação realizada com sucesso!');
            return true;
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.handleProcessarFormularioError(error);
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!document.getElementById('tabelaFuncionarios')) {
            return;
        }

        // Verifica dependências
        if (typeof bootstrap === 'undefined') {
            throw new Error('Biblioteca Bootstrap não carregada');
        }

        // Inicializa o manager
        window.funcionariosManager = new FuncionariosManager();
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

        // Redireciona para login se não estiver autenticado
        if (!localStorage.getItem('authToken') && !window.location.pathname.includes('/login')) {
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        }
    }
});