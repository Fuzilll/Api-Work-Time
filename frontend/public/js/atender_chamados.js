class ITSupportChamados {
    constructor() {
      console.log('[IT SUPPORT CHAMADOS] Inicializando sistema de chamados...');
      this.authTokenKey = 'authToken';
      this.userDataKey = 'usuario';
      this.elements = {};
      this.currentChamado = null;
      this.initElements();
      this.setupEventListeners();
      this.checkAuthAndLoad();
    }
  
    // Métodos de inicialização
    initElements() {
      console.log('[IT SUPPORT CHAMADOS] Inicializando elementos da interface...');
      const elementsConfig = [
        { id: 'filtro-status', property: 'filtroStatus', required: true },
        { id: 'filtro-prioridade', property: 'filtroPrioridade', required: true },
        { id: 'filtro-empresa', property: 'filtroEmpresa', required: true },
        { id: 'tabela-chamados', property: 'tabelaChamados', required: true },
        { id: 'loading-overlay', property: 'loadingOverlay', required: false },
        { id: 'error-message', property: 'errorMessage', required: false },
        { id: 'logout-btn', property: 'logoutBtn', required: false }
      ];
  
      elementsConfig.forEach(({ id, property, required }) => {
        this.elements[property] = document.getElementById(id);
        if (!this.elements[property] && required) {
          console.error(`[IT SUPPORT CHAMADOS] Elemento requerido com ID '${id}' não encontrado.`);
        }
      });
  
      // Inicializar modais
      this.modalDetalhes = new bootstrap.Modal(document.getElementById('modalDetalhes'));
    }
  
    setupEventListeners() {
      console.log('[IT SUPPORT CHAMADOS] Configurando event listeners...');
      
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
  
    // Métodos de autenticação
    logout() {
      console.log('[IT SUPPORT CHAMADOS] Executando logout...');
      localStorage.removeItem(this.authTokenKey);
      localStorage.removeItem(this.userDataKey);
      window.location.href = '/login';
    }
  
    async checkAuthAndLoad() {
      console.log('[IT SUPPORT CHAMADOS] Verificando autenticação...');
      try {
        const isAuthenticated = await this.verifyAuthentication();
        if (isAuthenticated) {
          console.log('[IT SUPPORT CHAMADOS] Autenticação válida, carregando dados...');
          this.loadUserData();
          this.loadChamados();
        }
      } catch (error) {
        console.error('[IT SUPPORT CHAMADOS] Erro de autenticação:', error);
        this.showError(error.message || 'Erro de autenticação');
        setTimeout(() => this.logout(), 3000);
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
        
        if (payload.nivel !== 'IT_SUPPORT') {
          throw new Error('Acesso restrito ao suporte técnico');
        }
        
        return true;
      } catch (e) {
        throw new Error('Token inválido ou acesso não autorizado');
      }
    }
  
    loadUserData() {
      const userData = JSON.parse(localStorage.getItem(this.userDataKey));
      if (!userData) throw new Error('Dados do usuário não encontrados');
      this.userData = userData;
    }
  
    // Métodos principais
    async loadChamados() {
      this.mostrarLoading();
  
      try {
        const status = this.elements.filtroStatus.value;
        const prioridade = this.elements.filtroPrioridade.value;
        const empresa = this.elements.filtroEmpresa.value;
  
        let url = '/api/chamados?';
        if (status) url += `status=${status}&`;
        if (prioridade) url += `prioridade=${prioridade}&`;
        if (empresa) url += `empresa_id=${empresa}`;
  
        const response = await this.fetchWithAuth(url);
        this.renderChamados(response.data);
  
      } catch (error) {
        console.error('[IT SUPPORT CHAMADOS] Erro ao carregar chamados:', error);
        this.showError(error.message || 'Erro ao carregar chamados');
      } finally {
        this.esconderLoading();
      }
    }
  
    renderChamados(chamados) {
      if (!this.elements.tabelaChamados) return;
  
      const tbody = this.elements.tabelaChamados.querySelector('tbody');
      if (!tbody) return;
  
      if (!chamados || chamados.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4">
              <div class="alert alert-info mb-0">
                Nenhum chamado encontrado com os filtros selecionados
              </div>
            </td>
          </tr>
        `;
        return;
      }
  
      tbody.innerHTML = chamados.map(chamado => `
        <tr>
          <td>${chamado.id}</td>
          <td>${chamado.assunto}</td>
          <td>${chamado.categoria}</td>
          <td>${this.getPrioridadeBadge(chamado.prioridade)}</td>
          <td>${this.getStatusBadge(chamado.status)}</td>
          <td>${chamado.empresa_nome || 'N/A'}</td>
          <td>${chamado.usuario_nome}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary" 
              onclick="itSupportChamados.showDetalhesChamado(${chamado.id})">
              <i class="fas fa-eye me-1"></i> Detalhes
            </button>
          </td>
        </tr>
      `).join('');
    }
  
    async showDetalhesChamado(id) {
      this.mostrarLoading();
  
      try {
        const response = await this.fetchWithAuth(`/api/chamados/${id}`);
        this.currentChamado = response.data;
        this.renderDetalhesChamado();
        this.modalDetalhes.show();
  
      } catch (error) {
        console.error('[IT SUPPORT CHAMADOS] Erro ao carregar detalhes:', error);
        this.showError(error.message || 'Erro ao carregar detalhes do chamado');
      } finally {
        this.esconderLoading();
      }
    }
  
    renderDetalhesChamado() {
      if (!this.currentChamado) return;
  
      // Preencher modal com os dados do chamado
      document.getElementById('modalAssunto').textContent = this.currentChamado.assunto;
      document.getElementById('modalCategoria').textContent = this.currentChamado.categoria;
      document.getElementById('modalPrioridade').innerHTML = this.getPrioridadeBadge(this.currentChamado.prioridade);
      document.getElementById('modalStatus').innerHTML = this.getStatusBadge(this.currentChamado.status);
      document.getElementById('modalDescricao').textContent = this.currentChamado.descricao;
      document.getElementById('modalEmpresa').textContent = this.currentChamado.empresa_nome || 'N/A';
      document.getElementById('modalUsuario').textContent = this.currentChamado.usuario_nome;
      document.getElementById('modalData').textContent = this.formatarData(this.currentChamado.criado_em);
  
      // Foto e anexo
      const fotoContainer = document.getElementById('modalFotoContainer');
      if (this.currentChamado.foto_url) {
        fotoContainer.innerHTML = `
          <img src="${this.currentChamado.foto_url}" 
               class="img-fluid rounded border" 
               alt="Foto do chamado">
        `;
      } else {
        fotoContainer.innerHTML = '<p class="text-muted">Nenhuma foto enviada</p>';
      }
  
      const anexoLink = document.getElementById('modalAnexoLink');
      if (this.currentChamado.anexo_url) {
        anexoLink.href = this.currentChamado.anexo_url;
        anexoLink.innerHTML = `
          <i class="fas fa-paperclip me-2"></i>Download do anexo
        `;
        anexoLink.classList.remove('d-none');
      } else {
        anexoLink.classList.add('d-none');
      }
  
      // Configurar botão de atualizar status
      document.getElementById('btnAtualizarStatus').onclick = () => this.atualizarStatusChamado();
    }
  
    async atualizarStatusChamado() {
      if (!this.currentChamado) return;
  
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
  
      try {
        await this.fetchWithAuth(`/api/chamados/${this.currentChamado.id}`, 'PUT', { status });
        
        this.showSuccess('Status atualizado com sucesso!', () => {
          this.modalDetalhes.hide();
          this.loadChamados();
        });
  
      } catch (error) {
        console.error('[IT SUPPORT CHAMADOS] Erro ao atualizar status:', error);
        this.showError(error.message || 'Erro ao atualizar status do chamado');
      }
    }
  
    // Métodos de API
    async fetchWithAuth(url, method = 'GET', body = null) {
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Token não encontrado');
  
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
  
      if (body) options.body = JSON.stringify(body);
  
      const response = await fetch(url, options);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Erro HTTP ${response.status}`);
      }
  
      return await response.json();
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
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
    }
  
    showSuccess(message, callback = null) {
      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745'
      }).then(() => {
        if (callback && typeof callback === 'function') callback();
      });
    }
  
    formatarData(dataString) {
      if (!dataString) return 'N/A';
      const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dataString).toLocaleDateString('pt-BR', options);
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
  
  // Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    try {
      window.itSupportChamados = new ITSupportChamados();
    } catch (error) {
      console.error('Erro na inicialização do ITSupportChamados:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar o sistema de chamados',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/login';
      });
    }
  });