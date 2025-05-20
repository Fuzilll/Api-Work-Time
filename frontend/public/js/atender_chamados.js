class ITSupportChamados {
  constructor() {
    console.log('[DEBUG] ITSupportChamados - Iniciando construtor');
    this.API_BASE_URL = 'http://localhost:3001/api';
    this.API_TIMEOUT = 1000000;
    this.authTokenKey = 'authToken';
    this.userDataKey = 'userData';
    this.elements = {};
    this.currentChamado = null;
    this.loadingOverlay = document.getElementById('loading-overlay');

    console.log('[DEBUG] ITSupportChamados - Elementos carregados:', {
      loadingOverlay: !!this.loadingOverlay
    });

    this.init();
  }

  async init() {
    console.log('[DEBUG] ITSupportChamados.init - Iniciando');
    try {
      this.initElements();
      this.setupEventListeners();
      await this.checkAuthAndLoad();
      await this.loadEmpresas();
      console.log('[DEBUG] ITSupportChamados.init - Concluído com sucesso');
    } catch (error) {
      console.error('[DEBUG] ITSupportChamados.init - Erro:', error);
      throw error;
    }
  }


  initElements() {
    console.log('[DEBUG] ITSupportChamados.initElements - Iniciando');
    this.elements = {
      filtroStatus: document.getElementById('filtro-status'),
      filtroPrioridade: document.getElementById('filtro-prioridade'),
      filtroEmpresa: document.getElementById('filtro-empresa'),
      tabelaChamados: document.getElementById('tabela-chamados'),
      errorMessage: document.getElementById('error-message'),
      logoutBtn: document.getElementById('logout-btn')
    };

    console.log('[DEBUG] Elementos encontrados:', {
      filtroStatus: !!this.elements.filtroStatus,
      filtroPrioridade: !!this.elements.filtroPrioridade,
      filtroEmpresa: !!this.elements.filtroEmpresa,
      tabelaChamados: !!this.elements.tabelaChamados,
      errorMessage: !!this.elements.errorMessage,
      logoutBtn: !!this.elements.logoutBtn
    });

    const modalElement = document.getElementById('modalDetalhes');
    if (modalElement) {
      this.modalDetalhes = new bootstrap.Modal(modalElement);
      console.log('[DEBUG] Modal de detalhes inicializado');
    } else {
      console.warn('[DEBUG] Modal de detalhes não encontrado');
    }
  }

  setupEventListeners() {
    if (this.elements.filtroStatus) {
      this.elements.filtroStatus.addEventListener('change', () => this.loadChamados());
    }

    if (this.elements.filtroPrioridade) {
      this.elements.filtroPrioridade.addEventListener('change', () => this.loadChamados());
    }

    if (this.elements.filtroEmpresa) {
      this.elements.filtroEmpresa.addEventListener('change', () => this.loadChamados());
    }

    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  }

  // Adicionar método para fazer requisições com tratamento de timeout
  async fetchWithTimeout(resource, options = {}) {
    const { timeout = this.API_TIMEOUT } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(id);

    return response;
  }
  async checkAuthAndLoad() {
    console.log('[DEBUG] ITSupportChamados.checkAuthAndLoad - Iniciando');
    try {
      const token = localStorage.getItem(this.authTokenKey);
      console.log('[DEBUG] Token encontrado:', !!token);

      if (!token) throw new Error('Token de autenticação não encontrado');

      const userData = JSON.parse(localStorage.getItem(this.userDataKey));
      console.log('[DEBUG] Dados do usuário:', userData);

      if (!userData) throw new Error('Dados do usuário não encontrados');

      if (userData.nivel !== 'IT_SUPPORT') {
        throw new Error('Acesso restrito ao suporte técnico');
      }

      this.userData = userData;
      await this.loadChamados();
      console.log('[DEBUG] checkAuthAndLoad - Concluído com sucesso');
    } catch (error) {
      console.error('[DEBUG] checkAuthAndLoad - Erro:', error);
      this.showError(error.message || 'Erro de autenticação');
      setTimeout(() => this.redirectToLogin(), 3000);
    }
  }

  async loadChamados() {
    console.log('[DEBUG] ITSupportChamados.loadChamados - Iniciando');
    this.mostrarLoading(true);

    try {
      const filters = {
        status: this.elements.filtroStatus?.value,
        prioridade: this.elements.filtroPrioridade?.value,
        empresa_id: this.elements.filtroEmpresa?.value
      };

      console.log('[DEBUG] Filtros aplicados:', filters);

      const chamados = await this.buscarChamados(filters);
      console.log('[DEBUG] Chamados recebidos:', chamados);

      this.renderChamados(chamados);
    } catch (error) {
      console.error('[DEBUG] loadChamados - Erro:', {
        error: error.message,
        stack: error.stack
      });

      let errorMessage = error.message;
      if (error.message.includes('500')) {
        errorMessage = 'Erro interno no servidor ao carregar chamados';
      }

      this.showError(errorMessage);
    } finally {
      this.mostrarLoading(false);
      console.log('[DEBUG] loadChamados - Finalizado');
    }
  }

  async buscarChamados(filters = {}) {
    console.log('[DEBUG] ITSupportChamados.buscarChamados - Iniciando com filtros:', filters);
    const token = localStorage.getItem(this.authTokenKey);
    if (!token) {
      console.warn('[DEBUG] Token não encontrado, redirecionando para login');
      this.redirectToLogin();
      throw new Error('Token de autenticação não encontrado');
    }

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
    );

    const queryString = new URLSearchParams(cleanFilters).toString();
    const url = `${this.API_BASE_URL}/chamados${queryString ? `?${queryString}` : ''}`;

    console.log('[DEBUG] URL da requisição:', url);

    try {
      console.log('[DEBUG] Iniciando requisição...');
      const response = await this.fetchWithTimeout(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      console.log('[FRONTEND] Resposta completa:', {
        status: response.status,
        headers: [...response.headers.entries()],
        url: response.url
    });
      console.log('[DEBUG] Resposta recebida:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DEBUG] Erro na resposta:', errorData);

        const errorMsg = errorData.message || `Erro ${response.status}`;
        if (response.status === 401) {
          console.warn('[DEBUG] Não autorizado, redirecionando...');
          this.redirectToLogin();
        }

        throw new Error(errorMsg);
      }

      const responseData = await response.json();
      console.log('[FRONTEND] Dados recebidos:', responseData);

      // Ajuste para a estrutura real da resposta
      if (!responseData?.success) {
          throw new Error(responseData.message || 'Erro na resposta da API');
      }

      return responseData.data?.chamados || responseData.chamados || [];
    } catch (error) {
      console.error('[DEBUG] Erro em buscarChamados:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (error.name === 'AbortError') {
        throw new Error('A requisição demorou muito. Verifique sua conexão.');
      }

      throw error;
    }
  }
  renderChamados(chamados = []) {
    const container = this.elements.tabelaChamados;
    if (!container) return;
  
    if (!Array.isArray(chamados) || chamados.length === 0) {
      container.innerHTML = `<div class="alert alert-info">Nenhum chamado encontrado</div>`;
      return;
    }
  
    const table = document.createElement('div');
    table.className = 'table-responsive';
    table.innerHTML = `
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>ID</th>
            <th>Assunto</th>
            <!-- outros cabeçalhos -->
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
  
    const tbody = table.querySelector('tbody');
    chamados.forEach(chamado => {
      tbody.appendChild(this.renderChamadoRow(chamado));
    });
  
    container.innerHTML = '';
    container.appendChild(table);
    this.setupTableEvents(); // Configura os event listeners
  }

  renderChamadoRow(chamado) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${chamado.id}</td>
      <td>${chamado.assunto}</td>
      <td>${chamado.categoria}</td>
      <td>${this.getPrioridadeBadge(chamado.prioridade)}</td>
      <td>${this.getStatusBadge(chamado.status)}</td>
      <td>${chamado.empresa_nome || 'N/A'}</td>
      <td>${chamado.usuario_nome}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary btn-detalhes" data-id="${chamado.id}">
          <i class="fas fa-eye me-1"></i> Detalhes
        </button>
      </td>
    `;
    return row;
  }
  

  async showDetalhesChamado(id) {
    console.log('[DEBUG] showDetalhesChamado - Iniciando para o ID:', id);
    this.mostrarLoading(true);
  
    try {
      this.currentChamado = await this.buscarChamadoPorId(id);
      console.log('[DEBUG] Dados recebidos do chamado:', this.currentChamado);
      
      this.renderDetalhesChamado();
      this.modalDetalhes.show();
      console.log('[DEBUG] Modal exibido com sucesso');
    } catch (error) {
      console.error('[DEBUG] Erro ao mostrar detalhes:', error);
      this.showError(error.message || 'Erro ao carregar detalhes');
    } finally {
      this.mostrarLoading(false);
    }
  }
  
  // Adicionar carregamento de empresas
  // Atualize o método loadEmpresas
  async loadEmpresas() {
    console.log('[DEBUG] ITSupportChamados.loadEmpresas - Iniciando');
    try {
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) {
        console.warn('[DEBUG] Token não encontrado, redirecionando');
        this.redirectToLogin();
        return;
      }

      const url = `${this.API_BASE_URL}/chamados/empresas/listar`;
      console.log('[DEBUG] URL para carregar empresas:', url);

      const response = await this.fetchWithTimeout(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log('[DEBUG] Resposta das empresas:', {
        status: response.status,
        ok: response.ok
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[DEBUG] Content-Type inválido:', contentType, 'Texto:', text.substring(0, 100));
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DEBUG] Erro na resposta:', errorData);
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const responseData = await response.json();
      console.log('[DEBUG] Dados das empresas:', responseData);

      if (!Array.isArray(responseData.data)) {
        console.error('[DEBUG] Dados das empresas não é array:', responseData);
        throw new Error('Formato de dados inválido para empresas');
      }

      this.renderEmpresas(responseData.data);
      console.log('[DEBUG] Empresas carregadas com sucesso');
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar empresas:', {
        error: error.message,
        stack: error.stack
      });

      this.showError(error.message || 'Erro ao carregar lista de empresas');

      if (error.message.includes('401')) {
        console.warn('[DEBUG] Não autorizado, redirecionando...');
        this.redirectToLogin();
      }
    }
  }


  renderEmpresas(empresas = []) {
    const select = this.elements.filtroEmpresa;
    if (!select) return;

    select.innerHTML = `
        <option value="">Todas</option>
        ${empresas.map(empresa => `
          <option value="${empresa.id}">${empresa.nome}</option>
        `).join('')}
      `;
  }


  async buscarChamadoPorId(id) {
    const token = localStorage.getItem(this.authTokenKey);
    if (!token) throw new Error('Usuário não autenticado');
  
    const response = await fetch(`${this.API_BASE_URL}/chamados/${id}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Erro ao buscar chamado');
    }
  
    const responseData = await response.json();
    
    // Verificar a estrutura da resposta e retornar os dados corretamente
    if (responseData.success && responseData.data) {
      return responseData.data; // Ajuste conforme a estrutura real da sua API
    }
    
    throw new Error('Formato de dados inválido');
  }

  renderDetalhesChamado() {
    if (!this.currentChamado || !this.modalDetalhes) {
      console.error('Chamado ou modal não disponível');
      return;
    }
  
    console.log('[DEBUG] Dados do chamado para renderização:', this.currentChamado);
  
    // Mapeamento de campos do modal
    const campos = {
      'modalAssunto': this.currentChamado.assunto || 'Não informado',
      'modalCategoria': this.currentChamado.categoria || 'Não informado',
      'modalPrioridade': this.getPrioridadeBadge(this.currentChamado.prioridade || 'Não informado'),
      'modalStatus': this.getStatusBadge(this.currentChamado.status || 'Não informado'),
      'modalDescricao': this.currentChamado.descricao || 'Não informado',
      'modalEmpresa': this.currentChamado.empresa_nome || this.currentChamado.empresa?.nome || 'N/A',
      'modalUsuario': this.currentChamado.usuario_nome || this.currentChamado.usuario?.nome || 'N/A',
      'modalData': this.formatarData(this.currentChamado.criado_em) || 'Data não disponível'
    };
  
    // Preencher os campos do modal
    Object.entries(campos).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML = value;
        console.log(`[DEBUG] Campo ${id} preenchido com:`, value);
      } else {
        console.warn(`[DEBUG] Elemento não encontrado: ${id}`);
      }
    });
  
    // Tratar foto
    const fotoContainer = document.getElementById('modalFotoContainer');
    if (fotoContainer) {
      if (this.currentChamado.foto_url) {
        fotoContainer.innerHTML = `<img src="${this.currentChamado.foto_url}" class="img-fluid rounded" alt="Foto do chamado">`;
        console.log('[DEBUG] Foto do chamado carregada:', this.currentChamado.foto_url);
      } else {
        fotoContainer.innerHTML = '<p class="text-muted">Nenhuma foto enviada</p>';
      }
    }
  
    // Tratar anexo
    const anexoLink = document.getElementById('modalAnexoLink');
    if (anexoLink) {
      if (this.currentChamado.anexo_url) {
        anexoLink.href = this.currentChamado.anexo_url;
        anexoLink.innerHTML = '<i class="fas fa-paperclip me-2"></i>Download do anexo';
        anexoLink.classList.remove('d-none');
        console.log('[DEBUG] Anexo do chamado carregado:', this.currentChamado.anexo_url);
      } else {
        anexoLink.classList.add('d-none');
      }
    }
  
    // Configurar botão de atualizar status
    const btnAtualizar = document.getElementById('btnAtualizarStatus');
    if (btnAtualizar) {
      btnAtualizar.onclick = () => this.atualizarStatusChamado();
      console.log('[DEBUG] Botão de atualizar status configurado');
    }
  }

  async atualizarStatusChamado() {
    if (!this.currentChamado) return;

    try {
      const { value: status } = await Swal.fire({
        title: 'Alterar Status',
        input: 'select',
        inputOptions: {
          'Aberto': 'Aberto',
          'Em andamento': 'Em andamento',
          'Resolvido': 'Resolvido',
          'Fechado': 'Fechado'
        },
        inputValue: this.currentChamado.status,
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) return 'Selecione um status válido';
        }
      });

      if (!status) return;

      await this.atualizarChamado(this.currentChamado.id, { status });

      this.showSuccess('Status atualizado com sucesso!', () => {
        this.modalDetalhes.hide();
        this.loadChamados();
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      this.showError(error.message || 'Erro ao atualizar status do chamado');
    }
  }

  async atualizarChamado(id, dados) {
    const token = localStorage.getItem(this.authTokenKey);
    if (!token) throw new Error('Usuário não autenticado');

    const response = await fetch(`${this.API_BASE_URL}/chamados/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Erro ao atualizar chamado');
    }

    return await response.json();
  }
  // Adicione este método para configurar os event listeners
setupTableEvents() {
  const container = this.elements.tabelaChamados;
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-detalhes');
    if (btn) {
      const id = btn.dataset.id;
      this.showDetalhesChamado(id);
    }
  });
}

  mostrarLoading(mostrar) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
    }
  }

  // Adicionar tratamento para erros de rede
  showError(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: message,
        confirmButtonText: 'OK'
      });
    } else {
      console.error('Erro:', message);
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
      'Baixa': 'bg-success',
      'Média': 'bg-info',
      'Alta': 'bg-warning text-dark',
      'Crítica': 'bg-danger'
    };
    const classe = prioridadeClasses[prioridade] || 'bg-light text-dark';
    return `<span class="badge ${classe}">${prioridade}</span>`;
  }

}

// Inicialização com logs
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG] DOM completamente carregado, iniciando ITSupportChamados');
  try {
    window.itSupportChamados = new ITSupportChamados();
    console.log('[DEBUG] ITSupportChamados inicializado com sucesso');
  } catch (error) {
    console.error('[DEBUG] Erro na inicialização:', {
      error: error.message,
      stack: error.stack
    });

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar o sistema de chamados',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/login';
      });
    } else {
      alert('Erro ao carregar o sistema de chamados. Redirecionando para login...');
      window.location.href = '/login';
    }
  }
});