class ChamadoManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.authTokenKey = 'authToken';
        this.userDataKey = 'userData'; // <- Alterado aqui
        this.elements = {};
        this.currentChamado = null;
        this.loadingOverlay = document.getElementById('loading-overlay');

        this.init();
    }

    init() {
        this.initElements();
        this.setupEventListeners();
        this.checkAuthAndLoad();
    }

    initElements() {
        this.elements = {
            formChamado: document.getElementById('form-chamado'),
            assuntoInput: document.getElementById('assunto'),
            descricaoInput: document.getElementById('descricao'),
            prioridadeSelect: document.getElementById('prioridade'),
            categoriaSelect: document.getElementById('categoria'),
            anexoInput: document.getElementById('anexo'),
            chamadosContainer: document.getElementById('chamados-container'),
            errorMessage: document.getElementById('error-message'),
            logoutBtn: document.getElementById('logout-btn')
        };

        const modalElement = document.getElementById('modalDetalhes');
        if (modalElement) {
            this.modalDetalhes = new bootstrap.Modal(modalElement);
        }
    }


    setupEventListeners() {
        if (this.elements.formChamado) {
            this.elements.formChamado.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmitChamado(e).catch(error => {
                    this.showError(error.message);
                });
            });
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async checkAuthAndLoad() {
        try {
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) throw new Error('Token não encontrado');

            const userDataFromStorage = JSON.parse(localStorage.getItem(this.userDataKey));

            if (!userDataFromStorage) {
                const tokenPayload = this.decodeJWT(token);
                if (!tokenPayload) throw new Error('Token inválido');

                this.userData = {
                    id: tokenPayload.id || tokenPayload.sub,
                    nome: tokenPayload.nome || 'Usuário',
                    email: tokenPayload.email || '',
                    nivel: tokenPayload.nivel || 'FUNCIONARIO',
                    empresa_id: tokenPayload.empresa_id || tokenPayload.id_empresa || null
                };
            } else {
                this.userData = {
                    id: userDataFromStorage.id,
                    nome: userDataFromStorage.nome || 'Usuário',
                    email: userDataFromStorage.email || '',
                    nivel: userDataFromStorage.nivel || 'FUNCIONARIO',
                    empresa_id: userDataFromStorage.empresa_id || userDataFromStorage.id_empresa || null
                };
            }

            console.log('Dados do usuário carregados:', this.userData);

            if (window.location.pathname.includes('meus-chamados') && this.elements.chamadosContainer) {
                await this.loadChamados();
            }
        } catch (error) {
            console.error('Erro na autenticação:', error);
            this.showError('Sessão inválida. Redirecionando para login...');
            setTimeout(() => this.redirectToLogin(), 2000);
        }
    }

    decodeJWT(token) {
        try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64);
            return JSON.parse(payloadJson);
        } catch (e) {
            console.error('Erro ao decodificar JWT:', e);
            return null;
        }
    }

    async handleSubmitChamado(event) {
        this.mostrarLoading(true);
    
        try {
            const formData = new FormData(this.elements.formChamado);
            const anexo = this.elements.anexoInput?.files[0];
    
            if (!formData.get('assunto') || !formData.get('descricao')) {
                throw new Error('Assunto e descrição são obrigatórios');
            }
    
            const empresaId = this.userData.empresa_id ? parseInt(this.userData.empresa_id) : null;
    
            // Criar objeto com os dados do chamado
            const chamadoData = {
                usuario_id: this.userData.id,
                empresa_id: empresaId,
                assunto: formData.get('assunto'),
                descricao: formData.get('descricao'),
                prioridade: formData.get('prioridade') || 'media',
                categoria: formData.get('categoria') || 'outros'
            };
    
            // 1. Primeiro cria o chamado
            const response = await this.salvarChamado(chamadoData);
            
            if (!response || !response.data || !response.data.id) {
                throw new Error('Não foi possível obter o ID do chamado criado');
            }
    
            const chamadoId = response.data.id;
    
            // 2. Se houver anexo, envia após a criação do chamado
            if (anexo) {
                try {
                    await this.enviarMidia(chamadoId, 'foto', anexo);
                } catch (anexoError) {
                    console.error('Erro ao enviar anexo:', anexoError);
                    this.showError('Chamado criado, mas o anexo não foi enviado: ' + anexoError.message);
                }
            }
    
            this.showSuccess('Chamado criado com sucesso!', () => {
                this.elements.formChamado.reset();
                if (this.elements.chamadosContainer) {
                    this.loadChamados();
                }
            });
    
        } catch (error) {
            console.error('Erro ao enviar chamado:', error);
            this.handleProcessarFormularioError(error);
        } finally {
            this.mostrarLoading(false);
        }
    }
    async salvarChamado(chamadoData) {
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) {
            throw new Error('Usuário não autenticado');
        }

        try {
            const dadosParaEnvio = { ...chamadoData };
            if (dadosParaEnvio.empresa_id === null) {
                delete dadosParaEnvio.empresa_id;
            }

            const response = await fetch(`${this.API_BASE_URL}/chamados`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(dadosParaEnvio)
            });

            const responseData = await response.json();

            if (!response.ok) {
                let errorMessage = responseData.message || `Erro ${response.status}`;

                if (response.status === 400 && errorMessage.toLowerCase().includes('empresa')) {
                    errorMessage = 'ID da empresa inválido ou não encontrado';
                }

                if (responseData.errors) {
                    errorMessage = Object.values(responseData.errors).join(', ');
                }

                throw new Error(errorMessage);
            }

            // Verifica se a resposta tem a estrutura esperada
            if (!responseData || !responseData.success) {
                console.error('Resposta inesperada da API:', responseData);
                throw new Error('Estrutura de resposta da API inválida');
            }

            return responseData;

        } catch (error) {
            console.error('Erro na requisição:', error);

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
            }

            throw error;
        }
    }

    async enviarAnexo(chamadoId, anexo) {
        // Validação dos parâmetros
        if (!chamadoId) {
            throw new Error('ID do chamado é obrigatório');
        }
        if (!anexo) {
            throw new Error('Arquivo de anexo é obrigatório');
        }

        try {
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) {
                throw new Error('Usuário não autenticado');
            }

            const formData = new FormData();
            formData.append('anexo', anexo);
            formData.append('tipo', 'anexo');

            const response = await fetch(`${this.API_BASE_URL}/chamados/${chamadoId}/anexo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Erro ao enviar anexo');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar anexo:', error);
            throw new Error('Falha ao enviar anexo: ' + error.message);
        }
    }
    async enviarMidia(chamadoId, tipo, file) {
        console.log('[enviarMidia] Iniciando upload:', { chamadoId, tipo, file });
        this.mostrarLoading(true);

        try {
            const token = localStorage.getItem(this.authTokenKey);
            if (!token) {
                throw new Error('Usuário não autenticado');
            }

            const formData = new FormData();
            formData.append('file', file);
            console.log('[enviarMidia] Arquivo adicionado ao FormData');

            const response = await fetch(`${this.API_BASE_URL}/chamados/${chamadoId}/midia`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('[enviarMidia] Resposta recebida:', response);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('[enviarMidia] Erro na resposta:', error);
                throw new Error(error.message || 'Erro ao enviar mídia');
            }

            const result = await response.json();
            console.log('[enviarMidia] Upload bem-sucedido:', result);
            return result;
        } catch (error) {
            console.error('[enviarMidia] Erro no upload:', error);
            throw error;
        } finally {
            this.mostrarLoading(false);
        }
    }

    // Método para lidar com upload de foto no formulário
    async handleFotoUpload(chamadoId, fileInput) {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            return;
        }

        const file = fileInput.files[0];

        // Verificar tipo de arquivo
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            this.showError('Tipo de arquivo inválido. Use apenas imagens (JPEG, PNG, GIF)');
            return;
        }

        // Verificar tamanho do arquivo (limite de 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('A imagem deve ter no máximo 5MB');
            return;
        }

        try {
            await this.enviarMidia(chamadoId, 'foto', file);
            this.showSuccess('Foto enviada com sucesso!');
            if (this.currentChamado && this.currentChamado.id === chamadoId) {
                await this.loadChamadoDetails(chamadoId); // Recarrega os detalhes
            }
        } catch (error) {
            this.showError(error.message || 'Erro ao enviar foto');
        }
    }

    async loadChamados() {
        if (!this.elements.chamadosContainer) return;

        this.mostrarLoading(true);

        try {
            const filters = {};
            if (this.userData.nivel === 'FUNCIONARIO') {
                filters.usuario_id = this.userData.id;
            }

            const chamados = await this.buscarChamados(filters);
            this.renderChamados(chamados);
        } catch (error) {
            console.error('Erro ao carregar chamados:', error);
            this.showError(error.message || 'Erro ao carregar chamados');
        } finally {
            this.mostrarLoading(false);
        }
    }

    async buscarChamados(filters = {}) {
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) {
            throw new Error('Usuário não autenticado');
        }

        const queryString = new URLSearchParams(filters).toString();
        const url = `${this.API_BASE_URL}/chamados${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Erro ao buscar chamados');
        }

        return await response.json();
    }

    renderChamados(chamados = []) {
        const container = this.elements.chamadosContainer;
        if (!container) return;

        if (chamados.length === 0) {
            container.innerHTML = `<div class="alert alert-info">Nenhum chamado encontrado</div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Assunto</th>
                            <th>Data</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th class="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chamados.map(chamado => this.renderChamadoRow(chamado)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderChamadoRow(chamado) {
        return `
            <tr>
                <td>${chamado.id}</td>
                <td>${chamado.assunto}</td>
                <td>${this.formatarData(chamado.criado_em)}</td>
                <td>${this.getStatusBadge(chamado.status)}</td>
                <td>${this.getPrioridadeBadge(chamado.prioridade)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" 
                        onclick="chamadoManager.showDetalhesChamado(${chamado.id})">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </td>
            </tr>
        `;
    }

    async showDetalhesChamado(id) {
        if (!this.modalDetalhes) {
            this.showError('Modal de detalhes não está disponível');
            return;
        }

        this.mostrarLoading(true);

        try {
            this.currentChamado = await this.buscarChamadoPorId(id);
            this.renderDetalhesChamado();
            this.modalDetalhes.show();
        } catch (error) {
            console.error('Erro ao mostrar detalhes:', error);
            this.showError(error.message || 'Erro ao carregar detalhes');
        } finally {
            this.mostrarLoading(false);
        }
    }

    async buscarChamadoPorId(id) {
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) {
            throw new Error('Usuário não autenticado');
        }

        const response = await fetch(`${this.API_BASE_URL}/chamados/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Erro ao buscar chamado');
        }

        return await response.json();
    }

    renderDetalhesChamado() {
        if (!this.currentChamado || !this.modalDetalhes) return;

        const campos = {
            'modalAssunto': this.currentChamado.assunto,
            'modalCategoria': this.currentChamado.categoria,
            'modalPrioridade': this.getPrioridadeBadge(this.currentChamado.prioridade),
            'modalStatus': this.getStatusBadge(this.currentChamado.status),
            'modalDescricao': this.currentChamado.descricao,
            'modalEmpresa': this.currentChamado.empresa_nome || 'N/A',
            'modalUsuario': this.currentChamado.usuario_nome,
            'modalData': this.formatarData(this.currentChamado.criado_em)
        };

        Object.entries(campos).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = value;
        });

        const fotoContainer = document.getElementById('modalFotoContainer');
        if (fotoContainer) {
            fotoContainer.innerHTML = this.currentChamado.foto_url
                ? `<img src="${this.currentChamado.foto_url}" class="img-fluid rounded" alt="Foto do chamado">`
                : '<p class="text-muted">Nenhuma foto enviada</p>';
        }

        const anexoLink = document.getElementById('modalAnexoLink');
        if (anexoLink) {
            if (this.currentChamado.anexo_url) {
                anexoLink.href = this.currentChamado.anexo_url;
                anexoLink.innerHTML = '<i class="fas fa-paperclip me-2"></i>Download do anexo';
                anexoLink.classList.remove('d-none');
            } else {
                anexoLink.classList.add('d-none');
            }
        }
    }

    mostrarLoading(mostrar) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
        }
    }

    showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: message,
                confirmButtonText: 'OK'
            });
        } else if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.elements.errorMessage.style.display = 'none';
            }, 5000);
        } else {
            alert(`Erro: ${message}`);
        }
    }

    showSuccess(message, callback = null) {
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

    handleProcessarFormularioError(error) {
        let mensagem = 'Erro ao cadastrar chamado';

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

    redirectToLogin() {
        localStorage.removeItem(this.authTokenKey);
        localStorage.removeItem(this.userDataKey);
        window.location.href = '/login';
    }

    logout() {
        this.redirectToLogin();
    }

    formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            const options = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Date(dataString).toLocaleDateString('pt-BR', options);
        } catch (e) {
            console.error('Erro ao formatar data:', e);
            return 'Data inválida';
        }
    }

    getStatusBadge(status) {
        const statusClasses = {
            'Aberto': 'bg-warning text-dark',
            'Em andamento': 'bg-primary',
            'Resolvido': 'bg-success',
            'Fechado': 'bg-secondary'
        };
        const classe = statusClasses[status] || 'bg-light text-dark';
        return `<span class="badge ${classe}">${status}</span>`;
    }

    getPrioridadeBadge(prioridade) {
        const prioridadeClasses = {
            'baixa': 'bg-success',
            'media': 'bg-info',
            'alta': 'bg-warning text-dark',
            'critica': 'bg-danger'
        };
        const classe = prioridadeClasses[prioridade] || 'bg-light text-dark';
        return `<span class="badge ${classe}">${prioridade}</span>`;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.chamadoManager = new ChamadoManager();
    } catch (error) {
        console.error('Falha na inicialização:', error);
        window.location.href = '/login';
    }
});