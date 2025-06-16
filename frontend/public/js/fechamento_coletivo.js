class FechamentoColetivo {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3001/api/admin';
    this.funcionarios = [];
    this.currentFuncionarioId = null;
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();

    this.initElements();
    this.setupEventListeners();
    this.carregarDados();
  }

  initElements() {
    this.elements = {
      containerFuncionarios: document.getElementById('containerFuncionarios'),
      inputPesquisa: document.getElementById('inputPesquisa'),
      selectMes: document.getElementById('selectMes'),
      selectAno: document.getElementById('selectAno'),
      btnFecharTodos: document.getElementById('btnFecharTodos'),
      modalConfirmacao: new bootstrap.Modal('#modalConfirmacao'),
      modalTexto: document.getElementById('modalTexto'),
      observacoes: document.getElementById('observacoes'),
      btnConfirmarFechamento: document.getElementById('btnConfirmarFechamento'),
      loadingOverlay: document.getElementById('loading-overlay')
    };

    // Preencher selects de mês/ano
    this.popularSelects();
  }

  popularSelects() {
    // Meses
    const meses = [
      { value: 1, text: 'Janeiro' },
      { value: 2, text: 'Fevereiro' },
      // ... outros meses
    ];
    
    meses.forEach(mes => {
      const option = document.createElement('option');
      option.value = mes.value;
      option.textContent = mes.text;
      if (mes.value === this.currentMonth) option.selected = true;
      this.elements.selectMes.appendChild(option);
    });

    // Anos (últimos 5 anos)
    for (let i = this.currentYear - 2; i <= this.currentYear + 2; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      if (i === this.currentYear) option.selected = true;
      this.elements.selectAno.appendChild(option);
    }
  }

  setupEventListeners() {
    this.elements.selectMes.addEventListener('change', () => this.carregarDados());
    this.elements.selectAno.addEventListener('change', () => this.carregarDados());
    this.elements.inputPesquisa.addEventListener('input', () => this.filtrarFuncionarios());
    this.elements.btnConfirmarFechamento.addEventListener('click', () => this.executarFechamento());
    this.elements.btnFecharTodos.addEventListener('click', () => this.confirmarFechamentoTodos());
  }

  async carregarDados() {
    this.mostrarLoading(true);
    try {
      const mes = this.elements.selectMes.value;
      const ano = this.elements.selectAno.value;

      const response = await fetch(
        `${this.API_BASE_URL}/fechamento/todos?ano=${ano}&mes=${mes}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar dados');

      const { data } = await response.json();
      this.funcionarios = data;
      this.renderizarFuncionarios();

    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao carregar dados dos funcionários');
    } finally {
      this.mostrarLoading(false);
    }
  }

  renderizarFuncionarios() {
    this.elements.containerFuncionarios.innerHTML = '';

    if (this.funcionarios.length === 0) {
      this.elements.containerFuncionarios.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-users-slash fa-3x mb-3 text-muted"></i>
          <h4 class="text-muted">Nenhum funcionário encontrado</h4>
        </div>
      `;
      return;
    }

    this.funcionarios.forEach(funcionario => {
      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';
      card.innerHTML = `
        <div class="card card-funcionario h-100">
          <div class="card-body">
            <h5 class="card-title">${funcionario.nome}</h5>
            <p class="card-text text-muted">${funcionario.cargo} • ${funcionario.empresa_nome}</p>
            
            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="p-2 border rounded text-center">
                  <small class="text-muted">Horas Normais</small>
                  <div class="fw-bold">${funcionario.horas_normais}h</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 border rounded text-center">
                  <small class="text-muted">Horas Extras</small>
                  <div class="fw-bold">${funcionario.horas_extras}h</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 border rounded text-center">
                  <small class="text-muted">Faltas</small>
                  <div class="fw-bold">${funcionario.total_faltas}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 border rounded text-center">
                  <small class="text-muted">Atrasos</small>
                  <div class="fw-bold">${funcionario.total_atrasos}min</div>
                </div>
              </div>
            </div>

            <button class="btn btn-primary w-100 btn-fechar" 
              data-id="${funcionario.id}"
              ${funcionario.ja_fechado ? 'disabled' : ''}>
              ${funcionario.ja_fechado ? 'Ponto Fechado' : 'Fechar Ponto'}
            </button>
          </div>
        </div>
      `;
      
      card.querySelector('.btn-fechar').addEventListener('click', (e) => {
        this.currentFuncionarioId = e.target.dataset.id;
        this.elements.modalTexto.textContent = `Confirmar fechamento para ${funcionario.nome}?`;
        this.elements.modalConfirmacao.show();
      });

      this.elements.containerFuncionarios.appendChild(card);
    });
  }

  async executarFechamento() {
    this.mostrarLoading(true);
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/fechamento/funcionario/${this.currentFuncionarioId}/fechar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            ano: this.elements.selectAno.value,
            mes: this.elements.selectMes.value,
            observacoes: this.elements.observacoes.value
          })
        }
      );

      if (!response.ok) throw new Error('Erro ao confirmar fechamento');

      const result = await response.json();

      if (result.success) {
        alert('Fechamento realizado com sucesso!');
        this.elements.modalConfirmacao.hide();
        this.carregarDados();
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      this.mostrarLoading(false);
    }
  }

  mostrarLoading(mostrar) {
    this.elements.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  new FechamentoColetivo();
});