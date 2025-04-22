class FuncionarioDashboard {
  constructor() {
    this.authTokenKey = 'authToken';
    this.elements = {};
    this.initElements();
    this.setupEventListeners();
    this.checkAuthAndLoad();
  }

  // Métodos de inicialização
  initElements() {
    const elementsConfig = [
      { id: 'total-pontos', property: 'totalPontos' },
      { id: 'solicitacoes-pendentes', property: 'solicitacoesPendentes' },
      { id: 'registrar-ponto', property: 'registrarPontoBtn' },
      { id: 'tabela-ultimos-pontos', property: 'tabelaUltimosPontos' },
      { id: 'logoutBtn', property: 'logoutBtn' }
    ];

    elementsConfig.forEach(({ id, property }) => {
      this.elements[property] = document.getElementById(id);
      if (!this.elements[property]) {
        console.error(`[DASHBOARD] Elemento com ID '${id}' não encontrado.`);
      }
    });
  }

  setupEventListeners() {
    if (this.elements.registrarPontoBtn) {
      this.elements.registrarPontoBtn.addEventListener('click', () => this.registrarPonto());
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
    localStorage.removeItem(this.authTokenKey);
    window.location.href = 'login.html';
  }

  async checkAuthAndLoad() {
    try {
      await this.verifyAuthentication();
      await this.loadDashboard();
    } catch (error) {
      console.error('[DASHBOARD] Erro de autenticação:', error);
      this.showError(error.message);
      this.logout();
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
      return true;
    } catch (e) {
      console.error('[DASHBOARD] Erro ao verificar token:', e);
      throw new Error('Token inválido');
    }
  }

  async loadDashboard() {
    try {
      const token = localStorage.getItem(this.authTokenKey);
      const response = await this.makeAuthenticatedRequest('/api/funcionarios/dashboard', 'GET', null, token);

      const data = response.data ?? response;
      console.log('Dados completos recebidos:', data);

      const resumo = data.resumo || {};
      const pontosHoje = Array.isArray(data.pontosHoje) ? data.pontosHoje : (data.pontosHoje ? [data.pontosHoje] : []);
      const ultimosPontos = Array.isArray(data.ultimosPontos) ? data.ultimosPontos : (data.ultimosPontos ? [data.ultimosPontos] : []);

      console.log('Resumo:', resumo);
      console.log('Pontos hoje:', pontosHoje);
      console.log('Últimos pontos:', ultimosPontos);

      this.renderResumo(resumo);
      this.renderPontosHoje(pontosHoje);
      this.renderUltimosPontos(ultimosPontos);

    } catch (error) {
      console.error('[DASHBOARD] Erro ao carregar:', error);
      this.showError(error.message || 'Erro ao carregar dados do dashboard');
      if (error.message.includes('autenticação') || error.message.includes('401')) {
        this.logout();
      }
    }
  }

  async makeAuthenticatedRequest(url, method = 'GET', body = null, token) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(10000)
    };

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }

    if (!contentType.includes('application/json')) {
      throw new Error('Resposta da API não está no formato JSON');
    }

    return await response.json();
  }

  // Métodos de renderização
  renderResumo(resumo = {}) {
    this.setElementText('totalPontos', resumo.total_pontos ?? resumo.totalRegistros ?? '0');
    this.setElementText('solicitacoesPendentes', resumo.pontos_pendentes ?? resumo.registrosPendentes ?? '0');
  }

  renderPontosHoje(pontosHoje = []) {
    if (!Array.isArray(pontosHoje) || pontosHoje.length === 0) {
      this.setElementText('horarioUltimoRegistro', 'Nenhum registro hoje');
      return;
    }

    pontosHoje.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
    const ultimoPonto = pontosHoje[0];
    const dataHora = new Date(ultimoPonto.data_hora);

    this.setElementText('horarioUltimoRegistro',
      `${dataHora.toLocaleTimeString('pt-BR')} (${ultimoPonto.tipo})`);
  }

  renderUltimosPontos(pontos = []) {
    if (!this.elements.tabelaUltimosPontos) return;

    if (!Array.isArray(pontos) || pontos.length === 0) {
      this.elements.tabelaUltimosPontos.innerHTML = '<tr><td colspan="3">Nenhum registro encontrado</td></tr>';
      return;
    }

    const pontosOrdenados = [...pontos].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));

    this.elements.tabelaUltimosPontos.innerHTML = pontosOrdenados.map(ponto => {
      const dataHora = new Date(ponto.data_hora);
      return `
        <tr>
          <td>${dataHora.toLocaleString('pt-BR')}</td>
          <td>${ponto.tipo}</td>
          <td>${this.getStatusBadge(ponto.status)}</td>
        </tr>
      `;
    }).join('');
  }

  // Métodos auxiliares de UI
  setBotaoRegistroCarregando(loading) {
    if (!this.elements.registrarPontoBtn) return;

    this.elements.registrarPontoBtn.disabled = loading;
    this.elements.registrarPontoBtn.innerHTML = loading
      ? '<i class="fas fa-spinner fa-spin"></i> Registrando...'
      : '<i class="fas fa-fingerprint"></i> Registrar Ponto';
  }

  setElementText(elementKey, text) {
    if (this.elements[elementKey]) {
      this.elements[elementKey].textContent = text;
    }
  }

  // Métodos de registro de ponto
  async registrarPonto() {
    if (!this.elements.registrarPontoBtn) return;

    try {
      this.setBotaoRegistroCarregando(true);
      const position = await this.getCurrentPosition();
      const token = localStorage.getItem(this.authTokenKey);

      const response = await this.makeAuthenticatedRequest(
        '/api/funcionarios/pontos',
        'POST',
        {
          tipo: this.getTipoRegistroAdequado(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        token
      );

      this.showSuccess('Ponto registrado com sucesso!');
      await this.loadDashboard();

    } catch (error) {
      console.error('[DASHBOARD] Erro ao registrar ponto:', error);
      this.showError(error.message || 'Erro ao registrar ponto');
    } finally {
      this.setBotaoRegistroCarregando(false);
    }
  }

  getTipoRegistroAdequado() {
    const horaAtual = new Date().getHours();
    return horaAtual < 12 ? 'Entrada' : (horaAtual < 14 ? 'Saída Almoço' : 'Saida');
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        err => reject(new Error('Erro ao obter localização: ' + err.message)),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // Métodos de notificação
  showSuccess(message) {
    this.showAlert('success', 'Sucesso', message);
  }

  showError(message) {
    this.showAlert('error', 'Erro', message);
  }

  showAlert(icon, title, text) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon, title, text });
    } else {
      alert(`${title}: ${text}`);
    }
  }

  // Utilitários
  getStatusBadge(status) {
    const statusClasses = {
      'Aprovado': 'bg-success',
      'Pendente': 'bg-warning',
      'Rejeitado': 'bg-danger'
    };
    return `<span class="badge ${statusClasses[status] || 'bg-secondary'}">${status}</span>`;
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.funcionarioDashboard = new FuncionarioDashboard();
  } catch (error) {
    console.error('Erro fatal ao inicializar dashboard:', error);
    alert('Ocorreu um erro ao carregar o dashboard. Redirecionando para login...');
    window.location.href = 'login.html';
  }
});          
