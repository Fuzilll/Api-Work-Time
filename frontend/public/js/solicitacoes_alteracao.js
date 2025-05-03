class SolicitacoesManager {
    constructor() {
      console.log('[SOLICITAÇÕES MANAGER] Inicializando gerenciador de solicitações...');
      try {
        this.authTokenKey = 'authToken';
        this.elements = {};
        this.solicitacoes = [];
        this.solicitacaoSelecionada = null;
        this.acaoSelecionada = null;
        
        console.log('[SOLICITAÇÕES MANAGER] Iniciando inicialização de elementos...');
        this.initElements();
        
        console.log('[SOLICITAÇÕES MANAGER] Configurando event listeners...');
        this.setupEventListeners();
        
        console.log('[SOLICITAÇÕES MANAGER] Verificando autenticação...');
        this.checkAuthAndLoad();
        
        console.log('[SOLICITAÇÕES MANAGER] Inicialização completa');
      } catch (error) {
        console.error('[SOLICITAÇÕES MANAGER] Erro na inicialização:', error);
        this.showError('Erro ao iniciar o sistema');
      }
    }
  
    // Métodos de inicialização
    initElements() {
      console.log('[SOLICITAÇÕES MANAGER] Inicializando elementos da interface...');
      const elementsConfig = [
        { id: 'solicitacoesTable', property: 'tabelaSolicitacoes', required: true },
        { id: 'modalAprovarRejeitar', property: 'modal', required: true },
        { id: 'modalTitulo', property: 'modalTitulo', required: true },
        { id: 'modalFuncionario', property: 'modalFuncionario', required: true },
        { id: 'modalDataHora', property: 'modalDataHora', required: true },
        { id: 'modalMotivo', property: 'modalMotivo', required: true },
        { id: 'motivoAdmin', property: 'motivoAdmin', required: true },
        { id: 'btnConfirmarAcao', property: 'btnConfirmar', required: true },
        { id: 'btnCancelarAcao', property: 'btnCancelar', required: true },
        { id: 'loading-overlay', property: 'loadingOverlay', required: false },
        { id: 'error-message', property: 'errorMessage', required: false },
        { id: 'close-modal', property: 'closeModal', required: false }
      ];
  
      elementsConfig.forEach(({ id, property, required }) => {
        this.elements[property] = document.getElementById(id);
        if (!this.elements[property] && required) {
          console.error(`[SOLICITAÇÕES MANAGER] Elemento requerido com ID '${id}' não encontrado.`);
        }
      });
    }
  
    setupEventListeners() {
      console.log('[SOLICITAÇÕES MANAGER] Configurando event listeners...');
      
      // Eventos do modal
      if (this.elements.closeModal) {
        this.elements.closeModal.addEventListener('click', () => this.fecharModal());
      }
      
      if (this.elements.btnCancelar) {
        this.elements.btnCancelar.addEventListener('click', () => this.fecharModal());
      }
      
      if (this.elements.btnConfirmar) {
        this.elements.btnConfirmar.addEventListener('click', () => this.processarAcao());
      }
      
      // Fechar modal ao clicar fora
      window.addEventListener('click', (event) => {
        if (event.target === this.elements.modal) {
          this.fecharModal();
        }
      });
    }
  
    // Métodos de autenticação (similar ao AdminDashboard)
    async checkAuthAndLoad() {
      console.log('[SOLICITAÇÕES MANAGER] Verificando autenticação...');
      try {
        const isAuthenticated = await this.verifyAuthentication();
        if (isAuthenticated) {
          console.log('[SOLICITAÇÕES MANAGER] Autenticação válida, carregando solicitações...');
          await this.carregarSolicitacoes();
        }
      } catch (error) {
        console.error('[SOLICITAÇÕES MANAGER] Erro de autenticação:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        this.showError(error.message || 'Erro de autenticação');
        setTimeout(() => {
          console.log('[SOLICITAÇÕES MANAGER] Redirecionando para login após erro de autenticação...');
          this.logout();
        }, 3000);
      }
    }
  
    async verifyAuthentication() {
      console.debug('[SOLICITAÇÕES MANAGER] Iniciando verificação de token...');
      const token = localStorage.getItem(this.authTokenKey);
     
      if (!token) {
        console.warn('[SOLICITAÇÕES MANAGER] Nenhum token encontrado no localStorage');
        throw new Error('Token de autenticação não encontrado');
      }
  
      try {
        console.debug('[SOLICITAÇÕES MANAGER] Token encontrado, decodificando...');
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.debug('[SOLICITAÇÕES MANAGER] Payload do token:', payload);
  
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          console.warn('[SOLICITAÇÕES MANAGER] Token expirado', {
            expiration: new Date(payload.exp * 1000),
            currentTime: new Date()
          });
          throw new Error('Token expirado');
        }
       
        if (!payload.nivel) {
          console.warn('[SOLICITAÇÕES MANAGER] Token não contém informação de nível', payload);
          throw new Error('Token incompleto - falta informação de nível de acesso');
        }
       
        if (payload.nivel.toUpperCase() !== 'ADMIN') {
          console.warn('[SOLICITAÇÕES MANAGER] Tentativa de acesso não autorizado', {
            nivelUsuario: payload.nivel,
            required: 'ADMIN'
          });
          throw new Error('Acesso restrito a administradores');
        }
       
        console.log('[SOLICITAÇÕES MANAGER] Token válido e permissões confirmadas');
        return true;
      } catch (e) {
        console.error('[SOLICITAÇÕES MANAGER] Falha na verificação do token', {
          error: e.message,
          stack: e.stack,
          token: token ? 'presente' : 'ausente',
          timestamp: new Date().toISOString()
        });
        throw new Error('Token inválido ou acesso não autorizado');
      }
    }
  
    logout() {
      console.log('[SOLICITAÇÕES MANAGER] Executando logout...');
      localStorage.removeItem(this.authTokenKey);
      console.debug('[SOLICITAÇÕES MANAGER] Token removido do localStorage');
      window.location.href = 'login.html';
    }
  
    // Métodos principais
    async carregarSolicitacoes() {
      console.log('[SOLICITAÇÕES MANAGER] Carregando solicitações...');
      try {
        this.mostrarLoading();
  
        const response = await this.fetchWithAuth('/api/admin/solicitacoes/pendentes');
        this.solicitacoes = response.data || response;
        console.debug('[SOLICITAÇÕES MANAGER] Dados recebidos:', this.solicitacoes);
  
        if (!this.solicitacoes) {
          throw new Error('Dados inválidos das solicitações');
        }
  
        this.renderizarTabela();
  
      } catch (erro) {
        console.error('[SOLICITAÇÕES MANAGER] Erro ao carregar solicitações', {
          error: erro.message,
          stack: erro.stack,
          timestamp: new Date().toISOString()
        });
        this.showError(erro.message || 'Erro ao carregar solicitações');
      } finally {
        this.esconderLoading();
      }
    }
  
    renderizarTabela() {
      console.debug('[SOLICITAÇÕES MANAGER] Renderizando tabela...');
      const tbody = this.elements.tabelaSolicitacoes.querySelector('tbody');
      
      if (!tbody) {
        console.error('[SOLICITAÇÕES MANAGER] Elemento tbody não encontrado');
        return;
      }
  
      tbody.innerHTML = '';
      
      if (this.solicitacoes.length === 0) {
        tbody.innerHTML = `
          <tr class="no-data">
            <td colspan="7">Nenhuma solicitação pendente encontrada</td>
          </tr>
        `;
        return;
      }
      
      this.solicitacoes.forEach(solicitacao => {
        const row = document.createElement('tr');
        row.dataset.id = solicitacao.id;
        
        row.innerHTML = `
          <td>${solicitacao.nome_funcionario}</td>
          <td>${this.formatarDataHora(solicitacao.data_hora_original)}</td>
          <td>${solicitacao.tipo_registro}</td>
          <td>${solicitacao.departamento}</td>
          <td title="${solicitacao.motivo}">
            ${this.truncarTexto(solicitacao.motivo, 50)}
          </td>
          <td><span class="badge badge-pendente">Pendente</span></td>
          <td class="actions">
            <button class="btn btn-approve" data-id="${solicitacao.id}">
              <i class="fas fa-check"></i> Aprovar
            </button>
            <button class="btn btn-reject" data-id="${solicitacao.id}">
              <i class="fas fa-times"></i> Rejeitar
            </button>
          </td>
        `;
        
        tbody.appendChild(row);
      });
  
      // Adiciona listeners aos botões recém-criados
      document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', (e) => this.abrirModal(e.target.closest('button').dataset.id, 'Aprovar'));
      });
      
      document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => this.abrirModal(e.target.closest('button').dataset.id, 'Rejeitar'));
      });
    }
  
    abrirModal(idSolicitacao, acao) {
      console.debug(`[SOLICITAÇÕES MANAGER] Abrindo modal para ${acao} solicitação ${idSolicitacao}`);
      
      this.solicitacaoSelecionada = this.solicitacoes.find(s => s.id == idSolicitacao);
      this.acaoSelecionada = acao;
      
      if (!this.solicitacaoSelecionada) {
        this.showError('Solicitação não encontrada');
        return;
      }
      
      // Preencher modal
      this.elements.modalTitulo.textContent = `${acao} Solicitação`;
      this.elements.modalFuncionario.textContent = this.solicitacaoSelecionada.nome_funcionario;
      this.elements.modalDataHora.textContent = this.formatarDataHora(this.solicitacaoSelecionada.data_hora_original);
      this.elements.modalMotivo.textContent = this.solicitacaoSelecionada.motivo;
      this.elements.motivoAdmin.value = '';
      
      // Configurar botão de confirmação
      this.elements.btnConfirmar.textContent = acao;
      this.elements.btnConfirmar.className = `btn ${acao === 'Aprovar' ? 'btn-success' : 'btn-danger'}`;
      
      // Mostrar modal
      this.elements.modal.style.display = 'block';
    }
  
    fecharModal() {
      console.debug('[SOLICITAÇÕES MANAGER] Fechando modal...');
      this.elements.modal.style.display = 'none';
      this.solicitacaoSelecionada = null;
      this.acaoSelecionada = null;
    }
  
    async processarAcao() {
      console.debug(`[SOLICITAÇÕES MANAGER] Processando ação ${this.acaoSelecionada}...`);
      
      const motivo = this.elements.motivoAdmin.value.trim();
      
      if (!motivo || motivo.length < 5) {
        this.showError('Informe um motivo válido (mínimo 5 caracteres)');
        return;
      }
      
      try {
        this.mostrarLoading();
        
        const response = await this.fetchWithAuth(
          `/api/admin/solicitacoes/${this.solicitacaoSelecionada.id}/processar`,
          'POST',
          {
            acao: this.acaoSelecionada.toLowerCase(),
            motivo: motivo
          }
        );
  
        this.exibirNotificacao(
          response.message || 'Ação processada com sucesso',
          'success'
        );
        
        this.fecharModal();
        await this.carregarSolicitacoes();
      } catch (erro) {
        console.error('[SOLICITAÇÕES MANAGER] Erro ao processar ação:', {
          error: erro.message,
          stack: erro.stack,
          timestamp: new Date().toISOString()
        });
        this.showError(erro.message || 'Erro ao processar solicitação');
      } finally {
        this.esconderLoading();
      }
    }
  
    // Métodos utilitários
    async fetchWithAuth(url, method = 'GET', body = null) {
      console.debug(`[SOLICITAÇÕES MANAGER] Fazendo requisição autenticada: ${method} ${url}`);
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) {
        console.error('[SOLICITAÇÕES MANAGER] Token não encontrado durante requisição');
        throw new Error('Token não encontrado');
      }
  
      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
  
        if (body) {
          options.body = JSON.stringify(body);
        }
  
        const response = await fetch(url, options);
        console.debug(`[SOLICITAÇÕES MANAGER] Resposta recebida: ${response.status}`);
  
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.error('[SOLICITAÇÕES MANAGER] Erro na resposta da API', {
            status: response.status,
            error: error.message || 'Sem mensagem de erro',
            url
          });
          throw new Error(error.message || `Erro HTTP ${response.status}`);
        }
  
        const data = await response.json();
        console.debug('[SOLICITAÇÕES MANAGER] Dados da resposta:', data);
        return data;
      } catch (erro) {
        console.error('[SOLICITAÇÕES MANAGER] Erro na requisição', {
          error: erro.message,
          stack: erro.stack,
          url,
          method,
          timestamp: new Date().toISOString()
        });
        throw erro;
      }
    }
  
    formatarDataHora(dataHora) {
      if (!dataHora) return '-';
      try {
        const dt = new Date(dataHora);
        return dt.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        console.warn('[SOLICITAÇÕES MANAGER] Erro ao formatar data/hora:', {
          dataHora,
          error: error.message
        });
        return dataHora;
      }
    }
  
    truncarTexto(texto, maxLength) {
      if (!texto) return '';
      return texto.length > maxLength 
        ? `${texto.substring(0, maxLength)}...` 
        : texto;
    }
  
    exibirNotificacao(mensagem, tipo = 'success') {
      console.debug(`[SOLICITAÇÕES MANAGER] Exibindo notificação: ${tipo} - ${mensagem}`);
      // Implementação pode usar toastr, alert ou outro sistema de notificação
      if (typeof toastr !== 'undefined') {
        toastr[tipo](mensagem);
      } else {
        alert(`${tipo.toUpperCase()}: ${mensagem}`);
      }
    }
  
    // Métodos de UI
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
      if (this.elements.errorMessage) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        setTimeout(() => {
          if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'none';
          }
        }, 5000);
      } else {
        alert(`Erro: ${message}`);
      }
    }
  }
  
  // Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[SOLICITAÇÕES MANAGER] DOM carregado, iniciando aplicação...');
    try {
      if (window.location.pathname.includes('solicitacoes-alteracao-ponto.html')) {
        window.solicitacoesManager = new SolicitacoesManager();
      }
    } catch (error) {
      console.error('[SOLICITAÇÕES MANAGER] Erro fatal na inicialização', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      alert('Erro ao carregar o gerenciador de solicitações. Redirecionando...');
      window.location.href = 'login.html';
    }
  });