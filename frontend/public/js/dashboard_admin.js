class AdminDashboard {
  constructor() {
    console.log('[ADMIN DASHBOARD] Inicializando dashboard...');
    this.authTokenKey = 'authToken';
    this.API_BASE_URL = 'http://localhost:3001/api';
    this.elements = {};
    this.graficos = {
      funcionarios: null,
      pontos: null
    };
    this.imageCache = new Map();
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
      { id: 'loading-overlay', property: 'loadingOverlay', required: false },
      { id: 'error-message', property: 'errorMessage', required: false },
      { id: 'logout-btn', property: 'logoutBtn', required: false },
      { id: 'graficoFuncionarios', property: 'graficoFuncionariosCanvas', required: true },
      { id: 'graficoPontos', property: 'graficoPontosCanvas', required: true },
      // Novos elementos para as colunas do dashboard
      { id: 'ultimos-registros-container', property: 'ultimosRegistrosContainer', required: true },
      { id: 'em-jornada-container', property: 'emJornadaContainer', required: true },
      { id: 'em-intervalo-container', property: 'emIntervaloContainer', required: true },
      { id: 'notificacoes-container', property: 'notificacoesContainer', required: true },
      { id: 'refresh-btn', property: 'refreshBtn', required: false },
      { id: 'contador-notificacoes', property: 'contadorNotificacoes', required: false }
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

    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', (e) => {
        console.log('[ADMIN DASHBOARD] Atualização manual solicitada');
        e.preventDefault();
        this.loadDashboard();
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
      const [ultimosRegistros, statusEquipe, notificacoes] = await Promise.all([
        this.processarUltimosRegistros(response.data),
        this.processarStatusEquipe(response.data),
        Promise.resolve(this.criarNotificacoes(response.data))
      ]);

      this.carregarResumo(dados.resumoFuncionarios || {});
      this.carregarRelatorioPontos(dados.relatorioPontos || {});
      this.carregarRegistrosRecentes(dados.pontosPendentes || []);

      requestAnimationFrame(() => {
        this.carregarUltimosRegistros(ultimosRegistros);
        this.carregarStatusEquipe(statusEquipe);
        this.carregarNotificacoes(notificacoes);
        this.atualizarContadorNotificacoes(notificacoes);
      });


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
  async processarResumoFuncionarios(dados) {
    return {
      totalFuncionarios: dados.totalFuncionarios || 0,
      funcionariosAtivos: dados.funcionariosAtivos || 0,
      funcionariosInativos: dados.funcionariosInativos || 0
    };
  }

  async processarRelatorioPontos(dados) {
    return {
      totalPontos: dados.totalPontos || 0,
      pontosAprovados: dados.pontosAprovados || 0,
      pontosPendentes: dados.pontosPendentes || 0
    };
  }
  async obterUrlImagem(pontoId, urlOriginal, tamanho = 50) {
    // Validação mais flexível do pontoId
    const idValido = pontoId !== undefined && pontoId !== null && !isNaN(pontoId) && pontoId > 0;
    
    if (!idValido) {
      console.warn('[ADMIN DASHBOARD] ID do ponto inválido, usando fallback:', pontoId);
      return urlOriginal || '/assets/images/default-profile.png';
    }
  
    const cacheKey = `${pontoId}_${tamanho}`;
    
    // 1. Verifica o cache primeiro
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }
  
    // 2. Se já temos uma URL válida
    if (urlOriginal && (urlOriginal.startsWith('http') || urlOriginal.startsWith('/assets'))) {
      // Otimiza a URL se for Cloudinary
      let urlOtimizada = urlOriginal;
      if (urlOriginal.includes('res.cloudinary.com')) {
        urlOtimizada = urlOriginal.replace(
          '/upload/', 
          `/upload/w_${tamanho},h_${tamanho},c_fill,q_auto,f_auto/`
        );
      }
      
      this.imageCache.set(cacheKey, urlOtimizada);
      return urlOtimizada;
    }
  
    // 3. Busca da API
    try {
      const response = await this.fetchWithAuth(`${this.API_BASE_URL}/ponto/${pontoId}/foto`);
      
      if (!response || !response.foto_url) {
        throw new Error('URL da foto não encontrada na resposta');
      }
  
      let fotoUrl = response.foto_url;
  
      // Otimização para Cloudinary
      if (fotoUrl.includes('res.cloudinary.com')) {
        fotoUrl = fotoUrl.replace(
          '/upload/', 
          `/upload/w_${tamanho},h_${tamanho},c_fill,q_auto,f_auto/`
        );
      }
  
      // Fallback para imagem padrão se a URL for inválida
      if (!fotoUrl.startsWith('http') && !fotoUrl.startsWith('/assets')) {
        fotoUrl = '/assets/images/default-profile.png';
      }
  
      // Atualiza o cache
      this.imageCache.set(cacheKey, fotoUrl);
      return fotoUrl;
  
    } catch (error) {
      console.error('[ADMIN DASHBOARD] Erro ao obter URL da imagem:', {
        error: error.message,
        stack: error.stack,
        pontoId,
        urlOriginal
      });
      
      // Retorna URL original ou imagem padrão em caso de erro
      return urlOriginal || '/assets/images/default-profile.png';
    }
  }

  // Métodos de renderização
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

  carregarUltimosRegistros(registros) {
    if (!this.elements.ultimosRegistrosContainer) return;

    if (!Array.isArray(registros)) {
      console.warn('[ADMIN DASHBOARD] Dados de últimos registros inválidos:', registros);
      this.elements.ultimosRegistrosContainer.innerHTML = '<div class="item">Nenhum registro recente</div>';
      return;
    }
    this.elements.ultimosRegistrosContainer.innerHTML = registros.length > 0
      ? registros.map(registro => `
          <div class="item">
            <img src="${registro.foto}" 
                 class="avatar" 
                 loading="lazy" 
                 alt="Foto de ${registro.nomeFuncionario}"
                 onerror="this.src='https://i.pravatar.cc/36'">
            <div class="hora">${this.formatarHora(registro.dataHora)}</div>
            <div class="texto">${registro.nomeFuncionario} - ${registro.tipo}</div>
          </div>
        `).join('')
      : '<div class="item">Nenhum registro recente</div>';
  }

  carregarStatusEquipe(statusEquipe) {
    console.debug('[ADMIN DASHBOARD] Carregando status da equipe...', statusEquipe);

    const { emJornada = [], emIntervalo = [] } = statusEquipe;

    if (!this.elements.emJornadaContainer || !this.elements.emIntervaloContainer) {
      console.warn('[ADMIN DASHBOARD] Elementos de status não encontrados');
      return;
    }

    this.elements.emJornadaContainer.innerHTML = emJornada.map(funcionario => `
      <div class="item">
        <img src="${funcionario.foto}" 
             class="avatar" 
             loading="lazy" 
             alt="Foto de ${funcionario.nome_completo}"
             onerror="this.src='https://i.pravatar.cc/50'">
        <div class="texto">
          ${funcionario.nome_completo}<br>
          <span class="hora cinza">${funcionario.ultima_acao}</span>
          <span class="tempo ${funcionario.cor_status}">${this.formatarDuracao(funcionario.tempo_jornada)}</span>
        </div>
      </div>
    `).join('');

    this.elements.emIntervaloContainer.innerHTML = emIntervalo.map(funcionario => `
      <div class="item">
        <img src="${funcionario.foto}" 
             class="avatar" 
             loading="lazy" 
             alt="Foto de ${funcionario.nome_completo}"
             onerror="this.src='https://i.pravatar.cc/50'">
        <div class="texto">
          ${funcionario.nome_completo}<br>
          <span class="hora cinza">${funcionario.horario_intervalo}</span>
          <span class="tempo verde">${this.formatarDuracao(funcionario.duracao_intervalo)}</span>
        </div>
      </div>
    `).join('');
  }

  carregarNotificacoes(notificacoes) {
    console.debug('[ADMIN DASHBOARD] Carregando notificações...', notificacoes);

    if (!this.elements.notificacoesContainer || !Array.isArray(notificacoes)) {
      console.warn('[ADMIN DASHBOARD] Elemento de notificações não encontrado ou dados inválidos');
      return;
    }

    this.elements.notificacoesContainer.innerHTML = notificacoes.map(notificacao => `
        <div class="notificacao">
          <div class="texto">
            ${notificacao.mensagem}<br>
            <span class="hora cinza">${this.formatarDataHora(notificacao.data_hora)}</span>
            ${!notificacao.resolvida ? '<span class="roxo">não lida</span>' : ''}
          </div>
        </div>
      `).join('');

    // Atualiza o contador de notificações
    if (this.elements.contadorNotificacoes) {
      const naoLidas = notificacoes.filter(n => !n.resolvida).length;
      this.elements.contadorNotificacoes.textContent = `${naoLidas} notificação${naoLidas !== 1 ? 'es' : ''}`;
    }
  }

  async processarUltimosRegistros(dados) {
    if (!dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) return [];

    return Promise.all(
      dados.pontosPendentes
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
        .slice(0, 10)
        .map(async ponto => ({
          ...ponto,
          dataHora: new Date(ponto.dataHora).toLocaleTimeString('pt-BR'),
          foto: await this.obterUrlImagem(ponto.id, ponto.foto, 36)
        }))
    );
  }

  async extrairEmJornada(dados) {
    if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) return [];

    const agora = new Date();
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);
    console.log(dados, 'Teste aqui para ver ser o id do registro esta vindo')

    const funcionarios = dados.pontosPendentes
      .filter(ponto => {
        const dataPonto = new Date(ponto.dataHora);
        return dataPonto >= inicioDia;
      })
      .reduce((acc, ponto) => {
        const existente = acc.find(item => item.id_funcionario === ponto.id_funcionario);

        if (!existente) {
          acc.push({
            id_funcionario: ponto.id_funcionario,
            nome_completo: ponto.nomeFuncionario,
            ultima_acao: ponto.dataHora,
            tipo_ultima_acao: ponto.tipo,
            foto: ponto.foto
          });
        } else if (new Date(ponto.dataHora) > new Date(existente.ultima_acao)) {
          existente.ultima_acao = ponto.dataHora;
          existente.tipo_ultima_acao = ponto.tipo;
        }

        return acc;
      }, [])
      .filter(funcionario => {
        return funcionario.tipo_ultima_acao === 'Entrada' &&
          !dados.pontosPendentes.some(p =>
            p.id_funcionario === funcionario.id_funcionario &&
            p.tipo === 'Saída' &&
            new Date(p.dataHora) > new Date(funcionario.ultima_acao)
          );
      });

    return Promise.all(
      funcionarios.map(async funcionario => {
        const ultimaAcaoDate = new Date(funcionario.ultima_acao);
        const minutosDesdeUltimaAcao = Math.floor((agora - ultimaAcaoDate) / (1000 * 60));

        return {
          ...funcionario,
          foto: await this.obterUrlImagem(funcionario.id_funcionario, funcionario.foto, 50),
          ultima_acao: ultimaAcaoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tempo_jornada: minutosDesdeUltimaAcao,
          cor_status: minutosDesdeUltimaAcao > 120 ? 'vermelho' : 'verde'
        };
      })
    );
  }
  async extrairEmIntervalo(dados) {
    if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
      console.warn('[ADMIN DASHBOARD] Dados inválidos para extrair em intervalo');
      return [];
    }

    const agora = new Date();
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    const funcionarios = dados.pontosPendentes
      .filter(ponto => {
        const dataPonto = new Date(ponto.dataHora);
        return dataPonto >= inicioDia && ponto.tipo === 'Intervalo';
      })
      .reduce((acc, ponto) => {
        const existente = acc.find(item => item.id_funcionario === ponto.id_funcionario);
        const temRetorno = dados.pontosPendentes.some(p =>
          p.id_funcionario === ponto.id_funcionario &&
          p.tipo === 'Retorno' &&
          new Date(p.dataHora) > new Date(ponto.dataHora)
        );

        if (!temRetorno && (!existente || new Date(ponto.dataHora) > new Date(existente.horario_intervalo))) {
          if (existente) {
            existente.horario_intervalo = ponto.dataHora;
          } else {
            acc.push({
              id_funcionario: ponto.id_funcionario,
              nome_completo: ponto.nomeFuncionario,
              horario_intervalo: ponto.dataHora,
              foto: ponto.foto
            });
          }
        }

        return acc;
      }, []);

    return Promise.all(
      funcionarios.map(async funcionario => {
        const intervaloDate = new Date(funcionario.horario_intervalo);
        const minutosEmIntervalo = Math.floor((agora - intervaloDate) / (1000 * 60));

        return {
          ...funcionario,
          foto: await this.obterUrlImagem(funcionario.id_funcionario, funcionario.foto, 50),
          horario_intervalo: intervaloDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          duracao_intervalo: minutosEmIntervalo
        };
      })
    );
  }
  extrairEmIntervaloSincrono(dados) {
    if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
      return [];
    }

    const agora = new Date();
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    return dados.pontosPendentes
      .filter(ponto => {
        const dataPonto = new Date(ponto.dataHora);
        return dataPonto >= inicioDia && ponto.tipo === 'Intervalo';
      })
      .reduce((acc, ponto) => {
        const existente = acc.find(item => item.id_funcionario === ponto.id_funcionario);
        const temRetorno = dados.pontosPendentes.some(p =>
          p.id_funcionario === ponto.id_funcionario &&
          p.tipo === 'Retorno' &&
          new Date(p.dataHora) > new Date(ponto.dataHora)
        );

        if (!temRetorno && (!existente || new Date(ponto.dataHora) > new Date(existente.horario_intervalo))) {
          if (existente) {
            existente.horario_intervalo = ponto.dataHora;
          } else {
            acc.push({
              id_funcionario: ponto.id_funcionario,
              nome_completo: ponto.nomeFuncionario,
              horario_intervalo: ponto.dataHora,
              foto: ponto.foto,
              duracao_intervalo: Math.floor((agora - new Date(ponto.dataHora)) / (1000 * 60))
            });
          }
        }

        return acc;
      }, []);
  }
  criarNotificacoes(dados) {
    if (!dados || !dados.pontosPendentes || !Array.isArray(dados.pontosPendentes)) {
      console.warn('[ADMIN DASHBOARD] Dados inválidos para criar notificações');
      return [];
    }

    const agora = new Date();
    const notificacoes = [];
    const funcionariosComEntrada = new Set();

    // Verifica funcionários que não registraram saída
    dados.pontosPendentes.forEach(ponto => {
      const dataPonto = new Date(ponto.dataHora);

      if (ponto.tipo === 'Entrada') {
        funcionariosComEntrada.add(ponto.id_funcionario);
      }
      else if (ponto.tipo === 'Saída') {
        funcionariosComEntrada.delete(ponto.id_funcionario);
      }
    });

    funcionariosComEntrada.forEach(id => {
      const funcionario = dados.pontosPendentes.find(p => p.id_funcionario === id);
      if (funcionario) {
        notificacoes.push({
          mensagem: `${funcionario.nomeFuncionario} não registrou ponto de saída`,
          data_hora: new Date().toISOString(),
          resolvida: false,
          prioridade: 'Alta'
        });
      }
    });

    // Verifica intervalos prolongados (> 60 minutos)
    const funcionariosEmIntervalo = this.extrairEmIntervaloSincrono(dados);
    if (Array.isArray(funcionariosEmIntervalo)) {
      funcionariosEmIntervalo.forEach(funcionario => {
        if (funcionario.duracao_intervalo > 60) {
          notificacoes.push({
            mensagem: `${funcionario.nome_completo} está há mais de ${funcionario.duracao_intervalo} minutos em intervalo`,
            data_hora: new Date().toISOString(),
            resolvida: false,
            prioridade: 'Média'
          });
        }
      });
    }

    return notificacoes.sort((a, b) => {
      const prioridades = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
      return prioridades[a.prioridade] - prioridades[b.prioridade];
    });
  }


  async processarStatusEquipe(dados) {
    return {
      emJornada: await this.extrairEmJornada(dados),
      emIntervalo: await this.extrairEmIntervalo(dados)
    };
  }
  atualizarContadorNotificacoes(notificacoes) {
    const contador = document.getElementById('notificacao-contador');
    if (contador) {
      const naoLidas = notificacoes.filter(n => !n.resolvida).length;
      contador.textContent = naoLidas > 0 ? naoLidas : '';
      contador.style.display = naoLidas > 0 ? 'block' : 'none';
    }
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

  formatarHora(horaString) {
    try {
      if (!horaString) return 'N/A';
      const [horas, minutos] = horaString.split(':');
      return `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;
    } catch {
      return 'N/A';
    }
  }
  formatarDuracao(minutos) {
    if (isNaN(minutos)) return '0:00';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}:${mins.toString().padStart(2, '0')}`;
  }
  formatarDataHora(dataString) {
    try {
      const data = new Date(dataString);
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' +
        data.toLocaleDateString('pt-BR');
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