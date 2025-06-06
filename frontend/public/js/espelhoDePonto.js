class EspelhoDePonto {
  constructor() {
    console.log('[ESPELHO DE PONTO] Inicializando módulo...');
    this.authTokenKey = 'authToken';
    this.userDataKey = 'userData';
    this.API_BASE_URL = 'http://localhost:3001/api';
    this.elements = {};
    this.imageCache = new Map();
    this.funcionarios = [];
    this.departamentos = [];
    this.filtros = {
      status: '',
      departamento: '',
      nome: '',
      matricula: ''
    };
    this.currentFuncionarioId = null;
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.errorMessage = document.getElementById('error-message');
    
    this.initElements();
    this.setupEventListeners();
    this.checkAuthAndLoad();
  }

  /**
   * Inicializa todos os elementos da interface
   */
  initElements() {
    console.log('[ESPELHO DE PONTO] Inicializando elementos da interface...');

    this.elements = {
      dataInicialInput: document.getElementById('data-inicial'),
      dataFinalInput: document.getElementById('data-final'),
      gerarRelatorioBtn: document.getElementById('btn-gerar-relatorio'),
      tabelaBody: document.getElementById('tabela-body'),
      userInfoDiv: document.getElementById('user-info'),
      userImg: document.getElementById('user-img'),
      userName: document.getElementById('user-name'),
      exportExcelBtn: document.getElementById('btn-exportar-excel') || document.getElementById('export-button'),
      exportPdfBtn: document.getElementById('btn-exportar-pdf'),
      filtroStatus: document.getElementById('filtroStatus'),
      filtroDepartamento: document.getElementById('filtroDepartamento'),
      filtroNome: document.getElementById('filtroNome'),
      filtroMatricula: document.getElementById('filtroMatricula'),
    };

    this.setupInitialDates();
  }

  createSearchButton() {
    const btn = document.createElement('button');
    btn.id = 'btn-gerar-relatorio';
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
    btn.addEventListener('click', () => this.pesquisarFuncionario());
    
    const container = document.querySelector('.filters .row.g-3');
    if (container) {
      const div = document.createElement('div');
      div.className = 'col-md-6 col-lg-3 d-flex align-items-end';
      div.appendChild(btn);
      container.appendChild(div);
    }
    
    return btn;
  }

  /**
   * Configura as datas inicial e final com valores padrão
   */
  setupInitialDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Formata as datas para o input (YYYY-MM-DD)
    const formatForInput = date => date.toISOString().split('T')[0];

    if (this.elements.dataInicialInput && this.elements.dataFinalInput) {
      this.elements.dataInicialInput.value = formatForInput(firstDayOfMonth);
      this.elements.dataFinalInput.value = formatForInput(today);

      // Adiciona validação para garantir que a data final não seja menor que a inicial
      this.elements.dataInicialInput.addEventListener('change', () => {
        if (new Date(this.elements.dataInicialInput.value) > new Date(this.elements.dataFinalInput.value)) {
          this.elements.dataFinalInput.value = this.elements.dataInicialInput.value;
        }
      });

      this.elements.dataFinalInput.addEventListener('change', () => {
        if (new Date(this.elements.dataFinalInput.value) < new Date(this.elements.dataInicialInput.value)) {
          this.elements.dataInicialInput.value = this.elements.dataFinalInput.value;
        }
      });
    }
  }

  /**
   * Configura os event listeners
   */
  setupEventListeners() {
    console.log('[ESPELHO DE PONTO] Configurando event listeners...');

    if (this.elements.gerarRelatorioBtn) {
      this.elements.gerarRelatorioBtn.addEventListener('click', () => this.loadEspelhoPonto());
      this.elements.gerarRelatorioBtn.addEventListener('click', () => this.pesquisarFuncionario());

    }

    if (this.elements.exportExcelBtn) {
      this.elements.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
    }

    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.addEventListener('click', () => {
        this.showError('Exportação para PDF ainda não implementada');
      });
    }

    // Event listeners para os filtros
    if (this.elements.filtroStatus) {
      this.elements.filtroStatus.addEventListener('change', (e) => {
        this.filtros.status = e.target.value;
      });
    }

    if (this.elements.filtroDepartamento) {
      this.elements.filtroDepartamento.addEventListener('change', (e) => {
        this.filtros.departamento = e.target.value;
      });
    }

    if (this.elements.filtroNome) {
      this.elements.filtroNome.addEventListener('input', (e) => {
        this.filtros.nome = e.target.value;
      });
    }

    if (this.elements.filtroMatricula) {
      this.elements.filtroMatricula.addEventListener('input', (e) => {
        this.filtros.matricula = e.target.value;
      });
    }

  }

  async pesquisarFuncionario() {
    this.mostrarLoading(true);
    try {
      const params = new URLSearchParams(this.filtros);
      const data = await this.fazerRequisicao(`/admin/funcionarios?${params.toString()}`);

      if (data && data.success) {
        this.funcionarios = data.data || [];
        
        if (this.funcionarios.length > 0) {
          // Seleciona o primeiro funcionário encontrado
          this.currentFuncionarioId = this.funcionarios[0].id;
          await this.loadUserInfo();
          await this.loadEspelhoPonto();
        } else {
          this.showError('Nenhum funcionário encontrado com os critérios de pesquisa');
          this.limparDadosFuncionario();
        }
        return data;
      }
      throw new Error(data?.message || 'Erro ao pesquisar funcionários');
    } catch (error) {
      console.error('Erro ao pesquisar funcionários:', error);
      this.showError(error.message || 'Erro ao pesquisar funcionários');
      this.limparDadosFuncionario();
      return null;
    } finally {
      this.mostrarLoading(false);
    }
  }

  limparDadosFuncionario() {
    this.currentFuncionarioId = null;
    if (this.elements.userName) {
      this.elements.userName.textContent = 'Nenhum funcionário selecionado';
    }
    if (this.elements.userImg) {
      this.elements.userImg.src = '/assets/images/default-user.png';
    }
    if (this.elements.tabelaBody) {
      this.elements.tabelaBody.innerHTML = '';
      const emptyRow = this.createEmptyRow(this.elements.dataInicialInput.value, 'Nenhum funcionário selecionado');
      this.elements.tabelaBody.appendChild(emptyRow);
    }
  }

  /**
   * Verifica a autenticação e carrega os dados iniciais
   */
  async checkAuthAndLoad() {
    console.log('[ESPELHO DE PONTO] Verificando autenticação...');
    try {
      const isAuthenticated = await this.verifyAuthentication();
      if (isAuthenticated) {
        console.log('[ESPELHO DE PONTO] Autenticação válida, carregando dados...');
        await Promise.all([
          this.carregarDepartamentos(),
          this.loadUserInfo(),
          this.loadEspelhoPonto()
        ]);
      }
    } catch (error) {
      console.error('[ESPELHO DE PONTO] Erro de autenticação:', error);
      this.showError(error.message || 'Erro de autenticação');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
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
      throw new Error('Token inválido ou acesso não autorizado');
    }
  }

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

  /**
   * Exporta os dados para Excel
   */
  async exportToExcel() {
    try {
      this.mostrarLoading(true);

      const funcionarioId = this.currentFuncionarioId;
      const dataInicial = this.elements.dataInicialInput.value;
      const dataFinal = this.elements.dataFinalInput.value;

      if (!funcionarioId) {
        throw new Error('Nenhum funcionário selecionado para exportação');
      }

      if (!dataInicial || !dataFinal) {
        throw new Error('Selecione o período para exportação');
      }

      // Extrair mês/ano
      const dataObj = new Date(dataInicial);
      const mes = dataObj.getMonth() + 1;
      const ano = dataObj.getFullYear();

      // Obter token e ID do admin
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Sessão expirada');

      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const idAdmin = tokenData.id;
      if (!idAdmin) throw new Error('Permissão insuficiente');

      // Montar URL correta
      const url = new URL(`${this.API_BASE_URL}/exportar-excel/exportar-dados-excel`);
      url.searchParams.append('id_funcionario', funcionarioId);
      url.searchParams.append('mes', mes);
      url.searchParams.append('ano', ano);
      url.searchParams.append('id_admin', idAdmin);

      console.log('URL de exportação:', url.toString());

      // Fazer requisição
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error === "Nenhum dado encontrado para exportação") {
            throw new Error('Nenhum dado encontrado para o período selecionado');
          }
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      // Processar download
      const blob = await response.blob();
      const urlObj = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = `espelho_ponto_${mes}_${ano}.xlsx`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
      }, 100);

    } catch (error) {
      console.error('Export Error:', error);
      this.showError(error.message || 'Falha na exportação');
    } finally {
      this.mostrarLoading(false);
    }
  }

  /**
   * Carrega as informações do usuário
   */
  async loadUserInfo() {
    try {
      if (!this.currentFuncionarioId) {
        this.limparDadosFuncionario();
        return;
      }

      const userInfo = await this.getUserInfo(this.currentFuncionarioId);

      if (this.elements.userName) {
        this.elements.userName.textContent = userInfo.nome;
      }

      if (this.elements.userImg) {
        this.elements.userImg.src = userInfo.fotoUrl || '/assets/images/default-user.png';
        this.elements.userImg.alt = `Foto de ${userInfo.nome}`;
      }
    } catch (error) {
      console.error('[ESPELHO DE PONTO] Erro ao carregar informações do usuário:', error);
      this.limparDadosFuncionario();
    }
  }

  /**
   * Carrega os dados do espelho de ponto
   */
  async loadEspelhoPonto() {
    console.log('[ESPELHO DE PONTO] Carregando dados do espelho de ponto...');

    try {
      this.mostrarLoading(true);

      if (!this.currentFuncionarioId) {
        this.limparDadosFuncionario();
        return;
      }

      const dataInicial = this.elements.dataInicialInput.value;
      const dataFinal = this.elements.dataFinalInput.value;

      if (!dataInicial || !dataFinal) {
        throw new Error('Por favor, selecione ambas as datas');
      }

      const registros = await this.fetchEspelhoPonto(this.currentFuncionarioId, dataInicial, dataFinal);
      this.carregarDadosTabela(registros);
    } catch (erro) {
      console.error('[ESPELHO DE PONTO] Erro ao carregar dados:', erro);
      this.showError(erro.message || 'Erro ao carregar espelho de ponto');
      this.limparDadosFuncionario();
    } finally {
      this.mostrarLoading(false);
    }
  }

  /**
   * Busca os dados do espelho de ponto na API
   */
  async fetchEspelhoPonto(funcionarioId, dataInicial, dataFinal) {
    console.debug('[FRONT] Buscando espelho de ponto:', { funcionarioId, dataInicial, dataFinal });

    try {
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const url = new URL(`${this.API_BASE_URL}/espelho-ponto/${encodeURIComponent(funcionarioId)}`);
      url.searchParams.append('dataInicial', encodeURIComponent(dataInicial));
      url.searchParams.append('dataFinal', encodeURIComponent(dataFinal));

      console.debug('[FRONT] URL completa:', url.toString());

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.debug('[FRONT] Resposta bruta:', response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Erro ${response.status}: ${response.statusText}`
        }));
        console.error('[FRONT] Erro na resposta:', errorData);
        throw new Error(errorData.message || 'Erro desconhecido na requisição');
      }

      const data = await response.json();
      console.debug('[FRONT] Dados recebidos:', data);
      return data;
    } catch (error) {
      console.error('[FRONT] Erro completo:', {
        message: error.message,
        stack: error.stack,
        params: { funcionarioId, dataInicial, dataFinal }
      });
      throw error;
    }
  }

  /**
   * Obtém informações do usuário
   */
  async getUserInfo(funcionarioId) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/funcionarios/${funcionarioId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(this.authTokenKey)}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao obter informações do usuário');
      }

      const data = await response.json();
      return {
        nome: data.nome || 'Nome não disponível',
        fotoUrl: data.foto_url || '/assets/images/default-user.png'
      };
    } catch (error) {
      console.error('[ESPELHO DE PONTO] Erro ao obter info do usuário:', error);
      return {
        nome: 'Nome não disponível',
        fotoUrl: '/assets/images/default-user.png'
      };
    }
  }

  /**
   * Carrega os dados na tabela
   */
  carregarDadosTabela(registros) {
    if (!this.elements.tabelaBody) return;

    // Limpa a tabela
    this.elements.tabelaBody.innerHTML = '';

    if (!registros || registros.length === 0) {
      const emptyRow = this.createEmptyRow(this.elements.dataInicialInput.value, 'Nenhum registro encontrado');
      this.elements.tabelaBody.appendChild(emptyRow);
      return;
    }

    // Ordena registros por data (mais recente primeiro)
    registros.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Adiciona cada registro à tabela
    registros.forEach(registro => {
      const row = this.createTableRow(registro);
      this.elements.tabelaBody.appendChild(row);
    });
  }

  /**
   * Cria uma linha da tabela com os dados do registro
   */
  createTableRow(registro) {
    const row = document.createElement('tr');

    // Célula de data com formatação especial
    const dataCell = document.createElement('td');
    dataCell.textContent = this.formatDateDisplay(registro.data_formatada || registro.data);
    row.appendChild(dataCell);

    // Adiciona células para cada campo
    [
      registro.entrada1, registro.saida1,       // 1ª entrada/saída
      registro.entrada2, registro.saida2,       // 2ª entrada/saída
      registro.credito_jornada || '0:00',       // Crédito de jornada
      registro.debito_jornada || '0:00',        // Débito de jornada
      registro.intervalo || '0:00',             // Intervalo
      registro.hora_trabalhada || '0:00',       // Horas trabalhadas
      registro.he_50 || '0:00',                 // HE 50%
      registro.he_100 || '0:00',                // HE 100%
      registro.adicional_noturno || '0:00',     // Adicional noturno
      '',                                       // Ícone (vazio)
      registro.saldo || '0:00'                  // Saldo
    ].forEach(content => {
      row.appendChild(this.createCell(content));
    });

    // Célula de observação
    const obsCell = document.createElement('td');
    obsCell.className = 'obs';
    obsCell.textContent = registro.observacao || '';
    row.appendChild(obsCell);

    return row;
  }

  /**
   * Cria uma célula da tabela
   */
  createCell(content) {
    const cell = document.createElement('td');
    cell.textContent = content;
    return cell;
  }

  /**
   * Cria uma linha vazia para quando não há dados
   */
  createEmptyRow(data, motivo) {
    const row = document.createElement('tr');
    row.className = 'empty-row';

    const dataCell = document.createElement('td');
    dataCell.textContent = this.formatDateDisplay(data);
    row.appendChild(dataCell);

    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 13;
    emptyCell.textContent = motivo;
    row.appendChild(emptyCell);

    const obsCell = document.createElement('td');
    obsCell.className = 'obs';
    row.appendChild(obsCell);

    return row;
  }

  /**
   * Formata a data para exibição (ex: "Seg, 01/04/2020")
   */
  formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${dayName}, ${day}/${month}/${year}`;
  }

  /**
   * Mostra o overlay de loading
   */
  mostrarLoading(mostrar = true) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
    }
  }

  /**
   * Esconde o overlay de loading
   */
  esconderLoading() {
    this.mostrarLoading(false);
  }

  /**
   * Mostra uma mensagem de erro
   */
  showError(message) {
    if (!message) return;

    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';

      setTimeout(() => {
        if (this.errorMessage) {
          this.errorMessage.style.display = 'none';
        }
      }, 5000);
    } else {
      alert(`Erro: ${message}`);
    }
  }

  async fazerRequisicao(url, method = 'GET', body = null) {
    try {
      console.log('Requisição para:', `${this.API_BASE_URL}${url}`);

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(this.authTokenKey)}`
        },
        credentials: 'include'
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

  redirectToLogin() {
    localStorage.removeItem(this.authTokenKey);
    localStorage.removeItem(this.userDataKey);
    sessionStorage.removeItem('pendingRequests');

    const currentPath = window.location.pathname;
    if (!currentPath.includes('login') && !currentPath.includes('auth')) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&session=expired`;
    }
  }
}

// Inicializa o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.espelhoDePonto = new EspelhoDePonto();
  } catch (error) {
    console.error('[ESPELHO DE PONTO] Erro na inicialização:', error);
    alert('Erro ao carregar o espelho de ponto. Por favor, recarregue a página.');
  }
});