class PointManager {
    constructor() {
      this.currentPage = 1;
      this.itemsPerPage = 10;
      this.initElements();
      this.setupEventListeners();
      this.loadPendingPoints();
    }
  
    initElements() {
      this.elements = {
        filterInput: document.querySelector("#filtro-pontos"),
        pointsTable: document.querySelector("#tabela-pontos"),
        dateFilter: document.querySelector("#filtro-data"),
        departmentFilter: document.querySelector("#filtro-departamento"),
        pagination: document.querySelector("#pagination"),
        loadingOverlay: document.querySelector("#loading-overlay"),
        errorMessage: document.querySelector("#error-message")
      };
    }
  
    setupEventListeners() {
      this.elements.filterInput.addEventListener('input', () => this.loadPendingPoints());
      this.elements.dateFilter.addEventListener('change', () => this.loadPendingPoints());
      this.elements.departmentFilter.addEventListener('change', () => this.loadPendingPoints());
    }
  
    async loadPendingPoints(page = 1) {
      this.showLoading();
      this.currentPage = page;
      
      try {
        const params = new URLSearchParams({
          page,
          limit: this.itemsPerPage,
          search: this.elements.filterInput.value,
          date: this.elements.dateFilter.value,
          department: this.elements.departmentFilter.value
        });
  
        const response = await fetch(`/api/admin/pontos/pendentes?${params}`);
        
        if (!response.ok) throw new Error('Erro ao carregar pontos');
        
        const { data: pontos, total } = await response.json();
        
        this.renderPointsTable(pontos);
        this.renderPagination(total);
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
              <button class="btn btn-sm btn-success" 
                      onclick="pointManager.approvePoint(${ponto.id})">
                <i class="fas fa-check"></i> Aprovar
              </button>
              <button class="btn btn-sm btn-danger" 
                      onclick="pointManager.rejectPoint(${ponto.id})">
                <i class="fas fa-times"></i> Rejeitar
              </button>
              <button class="btn btn-sm btn-info" 
                      onclick="pointManager.showDetails(${ponto.id})">
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
  
    renderPagination(totalItems) {
      const totalPages = Math.ceil(totalItems / this.itemsPerPage);
      
      if (totalPages <= 1) {
        this.elements.pagination.innerHTML = '';
        return;
      }
  
      let paginationHTML = '<ul class="pagination">';
      
      // Botão Anterior
      paginationHTML += `
        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="pointManager.loadPendingPoints(${this.currentPage - 1})">
            &laquo;
          </a>
        </li>
      `;
  
      // Páginas
      for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <li class="page-item ${i === this.currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="pointManager.loadPendingPoints(${i})">
              ${i}
            </a>
          </li>
        `;
      }
  
      // Botão Próximo
      paginationHTML += `
        <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="pointManager.loadPendingPoints(${this.currentPage + 1})">
            &raquo;
          </a>
        </li>
      `;
  
      paginationHTML += '</ul>';
      this.elements.pagination.innerHTML = paginationHTML;
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
      const justification = prompt('Informe o motivo da rejeição:');
      if (!justification) return;
      
      try {
        const response = await fetch(`/api/admin/pontos/${pointId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'Rejeitado',
            justificativa: justification
          })
        });
  
        if (!response.ok) throw new Error('Erro ao rejeitar ponto');
        
        this.loadPendingPoints(this.currentPage);
        this.showToast('Ponto rejeitado com sucesso', 'success');
      } catch (error) {
        this.showError(error.message);
      }
    }
  
    async showDetails(pointId) {
      try {
        const response = await fetch(`/api/admin/pontos/${pointId}/detalhes`);
        
        if (!response.ok) throw new Error('Erro ao carregar detalhes');
        
        const { data: details } = await response.json();
        this.openDetailsModal(details);
      } catch (error) {
        this.showError(error.message);
      }
    }
  
    openDetailsModal(details) {
      // Implementar modal com detalhes do ponto
      // Incluir foto, mapa com localização, horário esperado vs real, etc.
      console.log('Detalhes do ponto:', details);
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
  
    showToast(message, type) {
      // Implementar toast notification
      console.log(`${type}: ${message}`);
    }
  }
  
  // Inicialização quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    window.pointManager = new PointManager();
  });