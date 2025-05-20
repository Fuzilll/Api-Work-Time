class PointManager {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalItems = 0;
    this.initElements();
    this.setupEventListeners();
    this.loadPendingPoints();
  }

  initElements() {
    this.elements = {
      filterInput: document.querySelector("#filtro-pontos"),
      pointsTable: document.querySelector("#tabela-pontos"),
      dateFilterStart: document.querySelector("#filtro-data-inicio"),
      dateFilterEnd: document.querySelector("#filtro-data-fim"),
      departmentFilter: document.querySelector("#filtro-departamento"),
      statusFilter: document.querySelector("#filtro-status"),
      pagination: document.querySelector("#pagination"),
      loadingOverlay: document.querySelector("#loading-overlay"),
      errorMessage: document.querySelector("#error-message"),
      itemsPerPageSelect: document.querySelector("#items-per-page")
    };
  }


  setupEventListeners() {
    this.elements.filterInput.addEventListener('input', () => this.loadPendingPoints());
    this.elements.dateFilterStart.addEventListener('change', () => this.loadPendingPoints());
    this.elements.dateFilterEnd.addEventListener('change', () => this.loadPendingPoints());
    this.elements.statusFilter.addEventListener('change', () => this.loadPendingPoints());
    this.elements.departmentFilter.addEventListener('change', () => this.loadPendingPoints());
    this.elements.itemsPerPageSelect.addEventListener('change', () => {
      this.itemsPerPage = parseInt(this.elements.itemsPerPageSelect.value);
      this.currentPage = 1; // Reset para a primeira página ao mudar o limite
      this.loadPendingPoints();
    });
    this.setupTableEvents();
  }


  async loadPendingPoints(page = 1) {
    this.showLoading();
    this.currentPage = page;
  
    try {
      const params = new URLSearchParams({
        page,
        limit: this.itemsPerPage,
        search: this.elements.filterInput.value,
        nome: this.elements.filterInput.value,
        date_start: this.elements.dateFilterStart.value,
        date_end: this.elements.dateFilterEnd.value,
        department: this.elements.departmentFilter.value,
        status: this.elements.statusFilter.value
      });
  
      const response = await fetch(`/api/admin/pontos/pendentes?${params}`);
  
      if (!response.ok) throw new Error('Erro ao carregar pontos');
  
      const { data: pontos, total } = await response.json();
      this.totalItems = total;
  
      this.renderPointsTable(pontos);
      this.renderPagination();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  renderPointsTable(pontos) {
    this.elements.pointsTable.innerHTML = pontos.length ?
      pontos.map(ponto => this.createPointRow(ponto)).join('') :
      '<tr><td colspan="6" class="text-center">Nenhum ponto pendente encontrado</td></tr>';
  }

  createPointRow(ponto) {
    return `
        <tr data-id="${ponto.id}">
          <td>${ponto.funcionario}</td>
          <td>${ponto.departamento}</td>
          <td>${new Date(ponto.data_hora).toLocaleDateString('pt-BR')}</td>
          <td>${new Date(ponto.data_hora).toLocaleTimeString('pt-BR')}</td>
          <td>${this.getStatusBadge(ponto.status)}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success btn-aprovar" data-id="${ponto.id}">
                <i class="fas fa-check"></i> Aprovar
              </button>
              <button class="btn btn-sm btn-danger btn-rejeitar" data-id="${ponto.id}">
                <i class="fas fa-times"></i> Rejeitar
              </button>
              <button class="btn btn-sm btn-info btn-detalhes" data-id="${ponto.id}">
                <i class="fas fa-info-circle"></i> Detalhes
              </button>
            </div>
          </td>
        </tr>
      `;
  }

  getStatusBadge(status) {
    const classes = {
      'Aprovado': 'bg-success',
      'Pendente': 'bg-warning',
      'Rejeitado': 'bg-danger'
    };
    return `<span class="badge ${classes[status]}">${status}</span>`;
  }

  renderPagination() {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    if (totalPages <= 1) {
      this.elements.pagination.innerHTML = '';
      return;
    }

    let paginationHTML = '<ul class="pagination">';

    // Botão Anterior
    paginationHTML += `
        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${this.currentPage - 1}">
            &laquo;
          </a>
        </li>
      `;

    // Limitar o número de páginas mostradas
    const maxVisiblePages = 5;
    let startPage, endPage;

    if (totalPages <= maxVisiblePages) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);

      if (this.currentPage <= halfVisible + 1) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (this.currentPage >= totalPages - halfVisible) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = this.currentPage - halfVisible;
        endPage = this.currentPage + halfVisible;
      }
    }

    // Primeira página (se necessário)
    if (startPage > 1) {
      paginationHTML += `
          <li class="page-item">
            <a class="page-link" href="#" data-page="1">1</a>
          </li>
          ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        `;
    }

    // Páginas
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
          <li class="page-item ${i === this.currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">
              ${i}
            </a>
          </li>
        `;
    }

    // Última página (se necessário)
    if (endPage < totalPages) {
      paginationHTML += `
          ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
          <li class="page-item">
            <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
          </li>
        `;
    }

    // Botão Próximo
    paginationHTML += `
        <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${this.currentPage + 1}">
            &raquo;
          </a>
        </li>
      `;

    paginationHTML += '</ul>';
    this.elements.pagination.innerHTML = paginationHTML;

    // Adiciona event listeners para os links de paginação
    this.elements.pagination.querySelectorAll('a.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page'));
        if (!isNaN(page)) {
          this.loadPendingPoints(page);
        }
      });
    });
  }
  
  setupTableEvents() {
    this.elements.pointsTable.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;

      const pointId = target.getAttribute('data-id');

      if (target.classList.contains('btn-aprovar')) {
        this.approvePoint(pointId);
      } else if (target.classList.contains('btn-rejeitar')) {
        this.rejectPoint(pointId);
      } else if (target.classList.contains('btn-detalhes')) {
        this.showDetails(pointId);
      }
    });
  }

  async approvePoint(pointId) {
    if (!confirm('Deseja aprovar este registro de ponto?')) return;

    try {
      const response = await fetch(`/api/admin/pontos/${pointId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aprovado' })
      });

      if (!response.ok) throw new Error('Erro ao aprovar ponto');

      this.loadPendingPoints(this.currentPage);
      this.showToast('Ponto aprovado com sucesso', 'success');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async rejectPoint(pointId) {
    if (!confirm('Deseja rejeitar este registro de ponto?')) return;

    const justificativa = prompt('Digite a justificativa para a rejeição:', 'Motivo não especificado');
    if (justificativa === null) return; // Usuário cancelou

    try {
      const response = await fetch(`/api/admin/pontos/${pointId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Rejeitado',
          justificativa: justificativa
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao rejeitar ponto');
      }

      this.loadPendingPoints(this.currentPage);
      this.showToast('Ponto rejeitado com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao rejeitar ponto:', error);
      this.showError(error.message || 'Erro inesperado ao rejeitar ponto.');
    }
  }


  async showDetails(pointId) {
    this.showLoading();
    try {
      const response = await fetch(`/api/admin/pontos/${pointId}/detalhes`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar detalhes');
      }

      const { data: details } = await response.json();
      this.openDetailsModal(details);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      this.showError(error.message);
      this.showToast('Falha ao carregar detalhes do ponto', 'error');
    } finally {
      this.hideLoading();
    }
  }

  openDetailsModal(details) {
    // Formatando a data e hora
    const dataHora = new Date(details.data_hora);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR');

    // Preenchendo os campos do modal
    document.getElementById('detalhes-nome').textContent = details.funcionario || '—';
    document.getElementById('detalhes-matricula').textContent = details.matricula || '—';
    document.getElementById('detalhes-departamento').textContent = details.departamento || '—';
    document.getElementById('detalhes-data').textContent = dataFormatada;
    document.getElementById('detalhes-horario').textContent = horaFormatada;
    document.getElementById('detalhes-tipo').textContent = details.tipo || '—';

    // Status com badge
    const statusBadge = this.getStatusBadge(details.status);
    document.getElementById('detalhes-status').innerHTML = statusBadge;

    document.getElementById('detalhes-justificativa').textContent = details.justificativa || '—';
    document.getElementById('detalhes-dispositivo').textContent = details.dispositivo || '—';
    document.getElementById('detalhes-precisao').textContent = details.precisao_geolocalizacao ?
      `${details.precisao_geolocalizacao}%` : '—';
    document.getElementById('detalhes-aprovador').textContent = details.aprovador || '—';

    // Foto do registro
    const fotoElement = document.getElementById('detalhes-foto');
    if (details.foto_url) {
      fotoElement.src = details.foto_url;
      fotoElement.style.display = 'block';
    } else {
      fotoElement.style.display = 'none';
    }

    // Localização (mapa)
    const mapaElement = document.getElementById('detalhes-mapa');
    if (details.latitude && details.longitude) {
      mapaElement.innerHTML = `
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          scrolling="no" 
          marginheight="0" 
          marginwidth="0" 
          src="https://maps.google.com/maps?q=${details.latitude},${details.longitude}&z=15&output=embed">
        </iframe>
        <p>${details.endereco_registro || 'Localização registrada'}</p>
      `;
    } else {
      mapaElement.innerHTML = '<p class="text-muted">Localização não disponível</p>';
    }

    // Mostrar o modal
    const modal = new bootstrap.Modal(document.getElementById('detalhesModal'));
    modal.show();
  }

  showLoading() {
    this.elements.loadingOverlay.style.display = 'flex';
  }

  hideLoading() {
    this.elements.loadingOverlay.style.display = 'none';
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.style.display = 'block';
    setTimeout(() => {
      this.elements.errorMessage.style.display = 'none';
    }, 5000);
  }

  showToast(message, type = 'success') {
    const toastElement = document.getElementById('liveToast');
    const toastBody = document.getElementById('toast-message');
    const toastTitle = document.getElementById('toast-title');

    // Configura cores e ícones baseados no tipo
    const toastConfig = {
      success: {
        title: 'Sucesso',
        icon: 'fa-check-circle',
        color: 'text-success'
      },
      error: {
        title: 'Erro',
        icon: 'fa-exclamation-circle',
        color: 'text-danger'
      },
      info: {
        title: 'Informação',
        icon: 'fa-info-circle',
        color: 'text-info'
      }
    };

    const config = toastConfig[type] || toastConfig.info;

    // Atualiza o toast
    toastTitle.innerHTML = `<i class="fas ${config.icon} ${config.color} me-2"></i>${config.title}`;
    toastBody.textContent = message;

    // Mostra o toast
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
  }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.pointManager = new PointManager();
});