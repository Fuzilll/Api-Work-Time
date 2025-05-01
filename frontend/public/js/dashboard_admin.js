class AdminDashboard {
  constructor() {
    console.log('[ADMIN DASHBOARD] Inicializando dashboard...');
    this.authTokenKey = 'authToken';
    this.elements = {};
    this.graficos = {
      funcionarios: null,
      pontos: null
    };
    this.initElements();
    this.setupEventListeners();
    this.inicializarGraficos();
    this.checkAuthAndLoad();
  }
 
  // Métodos de inicialização
  initElements() {
    console.log('[ADMIN DASHBOARD] Inicializando elementos da interface...');
    const elementsConfig = [
      { id: 'total-funcionarios', property: 'totalFuncionarios', required: true },
      { id: 'funcionarios-ativos', property: 'funcionariosAtivos', required: true },
      { id: 'funcionarios-inativos', property: 'funcionariosInativos', required: true },
      { id: 'total-pontos', property: 'totalPontos', required: true },
      { id: 'pontos-aprovados', property: 'pontosAprovados', required: true },
      { id: 'pontos-pendentes', property: 'pontosPendentes', required: true },
      { id: 'tabela-pontos', property: 'tabelaPontos', required: true },
      { id: 'loading-overlay', property: 'loadingOverlay', required: false },
      { id: 'error-message', property: 'errorMessage', required: false },
      { id: 'logout-btn', property: 'logoutBtn', required: false },
      { id: 'graficoFuncionarios', property: 'graficoFuncionariosCanvas', required: true },
      { id: 'graficoPontos', property: 'graficoPontosCanvas', required: true }
    ];
 
    elementsConfig.forEach(({ id, property, required }) => {
      this.elements[property] = document.getElementById(id);
      if (!this.elements[property] && required) {
        console.error(`[ADMIN DASHBOARD] Elemento requerido com ID '${id}' não encontrado.`);
      }
    });
  }
 
  inicializarGraficos() {
    console.log('[ADMIN DASHBOARD] Inicializando gráficos...');
   
    // Gráfico de Funcionários
    this.graficos.funcionarios = new Chart(this.elements.graficoFuncionariosCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Ativos', 'Inativos'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#2cb67d', '#72757e'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
 
    // Gráfico de Pontos
    this.graficos.pontos = new Chart(this.elements.graficoPontosCanvas, {
      type: 'bar',
      data: {
        labels: ['Aprovados', 'Pendentes'],
        datasets: [{
          label: 'Pontos',
          data: [0, 0],
          backgroundColor: ['#7f5af0', '#fa5246']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
 
  setupEventListeners() {
    console.log('[ADMIN DASHBOARD] Configurando event listeners...');
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', (e) => {
        console.log('[ADMIN DASHBOARD] Logout iniciado pelo usuário');
        e.preventDefault();
        this.logout();
      });
    }
  }
 
  // Métodos de autenticação
  logout() {
    console.log('[ADMIN DASHBOARD] Executando logout...');
    localStorage.removeItem(this.authTokenKey);
    console.debug('[ADMIN DASHBOARD] Token removido do localStorage');
    window.location.href = 'login.html';
  }
 
  async checkAuthAndLoad() {
    console.log('[ADMIN DASHBOARD] Verificando autenticação...');
    try {
      const isAuthenticated = await this.verifyAuthentication();
      if (isAuthenticated) {
        console.log('[ADMIN DASHBOARD] Autenticação válida, carregando dashboard...');
        await this.loadDashboard();
      }
    } catch (error) {
      console.error('[ADMIN DASHBOARD] Erro de autenticação:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      this.showError(error.message || 'Erro de autenticação');
      setTimeout(() => {
        console.log('[ADMIN DASHBOARD] Redirecionando para login após erro de autenticação...');
        this.logout();
      }, 3000);
    }
  }
 
  async verifyAuthentication() {
    console.debug('[ADMIN DASHBOARD] Iniciando verificação de token...');
    const token = localStorage.getItem(this.authTokenKey);
   
    if (!token) {
      console.warn('[ADMIN DASHBOARD] Nenhum token encontrado no localStorage');
      throw new Error('Token de autenticação não encontrado');
    }
 
    try {
      console.debug('[ADMIN DASHBOARD] Token encontrado, decodificando...');
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.debug('[ADMIN DASHBOARD] Payload do token:', payload);
 
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('[ADMIN DASHBOARD] Token expirado', {
          expiration: new Date(payload.exp * 1000),
          currentTime: new Date()
        });
        throw new Error('Token expirado');
      }
     
      if (!payload.nivel) {
        console.warn('[ADMIN DASHBOARD] Token não contém informação de nível', payload);
        throw new Error('Token incompleto - falta informação de nível de acesso');
      }
     
      if (payload.nivel.toUpperCase() !== 'ADMIN') {
        console.warn('[ADMIN DASHBOARD] Tentativa de acesso não autorizado', {
          nivelUsuario: payload.nivel,
          required: 'ADMIN'
        });
        throw new Error('Acesso restrito a administradores');
      }
     
      console.log('[ADMIN DASHBOARD] Token válido e permissões confirmadas');
      return true;
    } catch (e) {
      console.error('[ADMIN DASHBOARD] Falha na verificação do token', {
        error: e.message,
        stack: e.stack,
        token: token ? 'presente' : 'ausente',
        timestamp: new Date().toISOString()
      });
      throw new Error('Token inválido ou acesso não autorizado');
    }
  }
 
  // Métodos principais
  async loadDashboard() {
    console.log('[ADMIN DASHBOARD] Carregando dados do dashboard...');
    try {
      this.mostrarLoading();
 
      const response = await this.fetchWithAuth('/api/dashboard');
      const dados = response.data || response;
      console.debug('[ADMIN DASHBOARD] Dados recebidos:', dados);
 
      if (!dados) {
        throw new Error('Dados inválidos do dashboard');
      }
 
      this.carregarResumo(dados.resumoFuncionarios || {});
      this.carregarRelatorioPontos(dados.relatorioPontos || {});
      this.carregarRegistrosRecentes(dados.pontosPendentes || []);
 
    } catch (erro) {
      console.error('[ADMIN DASHBOARD] Erro ao carregar dashboard', {
        error: erro.message,
        stack: erro.stack,
        timestamp: new Date().toISOString()
      });
      this.showError(erro.message || 'Erro ao carregar dados do dashboard');
    } finally {
      this.esconderLoading();
    }
  }
 
  async fetchWithAuth(url, method = 'GET') {
    console.debug(`[ADMIN DASHBOARD] Fazendo requisição autenticada: ${method} ${url}`);
    const token = localStorage.getItem(this.authTokenKey);
    if (!token) {
      console.error('[ADMIN DASHBOARD] Token não encontrado durante requisição');
      throw new Error('Token não encontrado');
    }
 
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
 
      console.debug(`[ADMIN DASHBOARD] Resposta recebida: ${response.status}`);
 
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[ADMIN DASHBOARD] Erro na resposta da API', {
          status: response.status,
          error: error.message || 'Sem mensagem de erro',
          url
        });
        throw new Error(error.message || `Erro HTTP ${response.status}`);
      }
 
      const data = await response.json();
      console.debug('[ADMIN DASHBOARD] Dados da resposta:', data);
      return data;
    } catch (erro) {
      console.error('[ADMIN DASHBOARD] Erro na requisição', {
        error: erro.message,
        stack: erro.stack,
        url,
        method,
        timestamp: new Date().toISOString()
      });
      throw erro;
    }
  }
 
  // Métodos de renderização
  carregarResumo(resumo) {
    console.debug('[ADMIN DASHBOARD] Carregando resumo...', resumo);
   
    if (!resumo) {
      console.warn('[ADMIN DASHBOARD] Dados de resumo vazios ou indefinidos');
      return;
    }
 
    // Atualiza os elementos de texto
    this.setElementText('totalFuncionarios', resumo.totalFuncionarios || 0);
    this.setElementText('funcionariosAtivos', resumo.funcionariosAtivos || 0);
    this.setElementText('funcionariosInativos', resumo.funcionariosInativos || 0);
 
    // Atualiza o gráfico de funcionários
    try {
      this.graficos.funcionarios.data.datasets[0].data = [
        resumo.funcionariosAtivos || 0,
        resumo.funcionariosInativos || 0
      ];
      this.graficos.funcionarios.update();
      console.debug('[ADMIN DASHBOARD] Gráfico de funcionários atualizado');
    } catch (error) {
      console.error('[ADMIN DASHBOARD] Erro ao atualizar gráfico de funcionários', {
        error: error.message,
        stack: error.stack
      });
    }
  }
 
  carregarRelatorioPontos(relatorio) {
    console.debug('[ADMIN DASHBOARD] Carregando relatório de pontos...', relatorio);
   
    if (!relatorio) {
      console.warn('[ADMIN DASHBOARD] Dados de relatório de pontos vazios ou indefinidos');
      return;
    }
 
    // Atualiza os elementos de texto
    this.setElementText('totalPontos', relatorio.totalPontos || 0);
    this.setElementText('pontosAprovados', relatorio.pontosAprovados || 0);
    this.setElementText('pontosPendentes', relatorio.pontosPendentes || 0);
 
    // Atualiza o gráfico de pontos
    try {
      this.graficos.pontos.data.datasets[0].data = [
        relatorio.pontosAprovados || 0,
        relatorio.pontosPendentes || 0
      ];
      this.graficos.pontos.update();
      console.debug('[ADMIN DASHBOARD] Gráfico de pontos atualizado');
    } catch (error) {
      console.error('[ADMIN DASHBOARD] Erro ao atualizar gráfico de pontos', {
        error: error.message,
        stack: error.stack
      });
    }
  }
 
  carregarRegistrosRecentes(registros) {
    console.debug('[ADMIN DASHBOARD] Carregando registros recentes...', registros);
   
    if (!this.elements.tabelaPontos || !Array.isArray(registros)) {
      console.warn('[ADMIN DASHBOARD] Elemento de tabela não encontrado ou dados inválidos');
      return;
    }
 
    this.elements.tabelaPontos.innerHTML = registros.map(registro => `
      <tr>
        <td>${registro.nomeFuncionario || 'N/A'}</td>
        <td>${this.formatarDataHora(registro.dataHora)}</td>
        <td>${this.formatarStatus(registro.status)}</td>
      </tr>
    `).join('');
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
 
  setElementText(elementKey, text) {
    if (this.elements[elementKey]) {
      this.elements[elementKey].textContent = text;
    }
  }
 
  formatarDataHora(data) {
    try {
      return data ? new Date(data).toLocaleString('pt-BR') : 'N/A';
    } catch {
      return 'N/A';
    }
  }
 
  formatarStatus(status) {
    const statusMap = {
      'APROVADO': 'success',
      'PENDENTE': 'warning',
      'REJEITADO': 'danger'
    };
    const classe = statusMap[status?.toUpperCase()] || 'secondary';
    return `<span class="badge bg-${classe}">${status || 'N/A'}</span>`;
  }
}
 
// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('[ADMIN DASHBOARD] DOM carregado, iniciando aplicação...');
  try {
    window.adminDashboard = new AdminDashboard();
  } catch (error) {
    console.error('[ADMIN DASHBOARD] Erro fatal na inicialização', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    alert('Erro ao carregar o painel. Redirecionando...');
    window.location.href = 'login.html';
  }
});