class EspelhoDePonto {
  constructor() {
    console.log('[ESPELHO DE PONTO] Inicializando módulo...');
    this.authTokenKey = 'authToken';
    this.API_BASE_URL = 'http://localhost:3001/api';
    this.elements = {};
    this.imageCache = new Map();
    this.initElements();
    this.setupEventListeners();
    this.checkAuthAndLoad();
  }

  /**
   * Inicializa todos os elementos da interface
   */
  initElements() {
    console.log('[ESPELHO DE PONTO] Inicializando elementos da interface...');
    
    // Configuração centralizada dos elementos
    this.elements = {
      dataInicialInput: document.getElementById('data-inicial'),
      dataFinalInput: document.getElementById('data-final'),
      gerarRelatorioBtn: document.getElementById('btn-gerar-relatorio'),
      tabelaBody: document.getElementById('tabela-body'),
      userInfoDiv: document.getElementById('user-info'),
      userImg: document.getElementById('user-img'),
      userName: document.getElementById('user-name'),
      loadingOverlay: document.getElementById('loading-overlay'),
      errorMessage: document.getElementById('error-message'),
      exportExcelBtn: document.getElementById('btn-exportar-excel'),
      exportPdfBtn: document.getElementById('btn-exportar-pdf')
    };

    // Configuração inicial das datas
    this.setupInitialDates();
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
        this.loadEspelhoPonto();
      });
      
      this.elements.dataFinalInput.addEventListener('change', () => {
        if (new Date(this.elements.dataFinalInput.value) < new Date(this.elements.dataInicialInput.value)) {
          this.elements.dataInicialInput.value = this.elements.dataFinalInput.value;
        }
        this.loadEspelhoPonto();
      });
    }
  }

  /**
   * Configura os event listeners
   */
  setupEventListeners() {
    console.log('[ESPELHO DE PONTO] Configurando event listeners...');
    
    // Evento para gerar relatório
    if (this.elements.gerarRelatorioBtn) {
      this.elements.gerarRelatorioBtn.addEventListener('click', () => this.loadEspelhoPonto());
    }
    
    // Eventos para exportação (placeholders)
    if (this.elements.exportExcelBtn) {
      this.elements.exportExcelBtn.addEventListener('click', () => {
        this.showError('Exportação para Excel ainda não implementada');
      });
    }
    
    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.addEventListener('click', () => {
        this.showError('Exportação para PDF ainda não implementada');
      });
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
        await this.loadUserInfo();
        await this.loadEspelhoPonto();
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

  /**
   * Carrega as informações do usuário
   */
  async loadUserInfo() {
    try {
      const funcionarioId = await this.getFuncionarioId();
      const userInfo = await this.getUserInfo(funcionarioId);
      
      if (this.elements.userName) {
        this.elements.userName.textContent = userInfo.nome;
      }
      
      if (this.elements.userImg) {
        this.elements.userImg.src = userInfo.fotoUrl || '/assets/images/default-user.png';
        this.elements.userImg.alt = `Foto de ${userInfo.nome}`;
      }
    } catch (error) {
      console.error('[ESPELHO DE PONTO] Erro ao carregar informações do usuário:', error);
    }
  }

  /**
   * Carrega os dados do espelho de ponto
   */
  async loadEspelhoPonto() {
    console.log('[ESPELHO DE PONTO] Carregando dados do espelho de ponto...');
    
    try {
      this.mostrarLoading();
      
      const funcionarioId = await this.getFuncionarioId();
      const dataInicial = this.elements.dataInicialInput.value;
      const dataFinal = this.elements.dataFinalInput.value;
      
      if (!dataInicial || !dataFinal) {
        throw new Error('Por favor, selecione ambas as datas');
      }
      
      const registros = await this.fetchEspelhoPonto(funcionarioId, dataInicial, dataFinal);
      this.carregarDadosTabela(registros);
    } catch (erro) {
      console.error('[ESPELHO DE PONTO] Erro ao carregar dados:', erro);
      this.showError(erro.message || 'Erro ao carregar espelho de ponto');
    } finally {
      this.esconderLoading();
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

        // Encoding dos parâmetros
        const url = new URL(`${this.API_BASE_URL}/espelho-ponto/${encodeURIComponent(funcionarioId)}`);
        url.searchParams.append('dataInicial', encodeURIComponent(dataInicial));
        url.searchParams.append('dataFinal', encodeURIComponent(dataFinal));

        console.debug('[FRONT] URL completa:', url.toString());

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
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
   * Obtém o ID do funcionário (simulado)
   */
  async getFuncionarioId() {
    // Em uma implementação real, isso viria do token JWT ou de outra fonte
    return 1;
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
   * Formata o horário (remove segundos se existirem)
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
  }

  /**
   * Mostra o overlay de loading
   */
  mostrarLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Esconde o overlay de loading
   */
  esconderLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Mostra uma mensagem de erro
   */
  showError(message) {
    if (!message) return;
    
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

// Inicializa o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.espelhoDePonto = new EspelhoDePonto();
  } catch (error) {
    console.error('[ESPELHO DE PONTO] Erro na inicialização:', error);
    alert('Erro ao carregar o espelho de ponto. Por favor, recarregue a página.');
  }
});