class GerenciadorEmpresas {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.loadCompanies();
      this.setupAdminForm();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize the page. Please refresh.');
    }
  }

  // Módulo de API
  api = {
    list: async () => {
      const response = await fetch('/api/empresas/listar');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load companies');
      }
      const result = await response.json();

      let companies;
      if (Array.isArray(result)) {
        companies = result;
      } else if (result.data && Array.isArray(result.data)) {
        companies = result.data;
      } else if (result.empresas && Array.isArray(result.empresas)) {
        companies = result.empresas;
      } else {
        throw new Error('Invalid data format: expected an array of companies');
      }

      return companies;
    },

    remove: async (id) => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication required. Please login again.');
        }

        const response = await fetch(`/api/empresas/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include' // Importante para enviar cookies de sessão
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.message ||
            (response.status === 403 ? 'Permission denied' :
              response.status === 404 ? 'Company not found' :
                'Failed to remove company');
          throw new Error(errorMessage);
        }

        return await response.json();
      } catch (error) {
        console.error('Remove company API error:', error);
        throw error; // Re-throw para ser tratado pelo chamador
      }
    },

    registerAdmin: async (data) => {
      const response = await fetch('/api/empresas/cadastrar-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register admin');
      }

      return await response.json();
    }
  };

  // Módulo de UI
  ui = {
    getTable: () => {
      const table = document.getElementById('tabela-empresas');
      if (!table) throw new Error('Companies table not found');
      return table;
    },

    renderCompanies: (companies) => {
      const table = this.ui.getTable();
      table.innerHTML = '';

      if (!Array.isArray(companies)) {
        console.error('Invalid companies data:', companies);
        return this.ui.showError('Invalid companies data received from server');
      }

      if (companies.length === 0) {
        return table.innerHTML = this.ui.createEmptyRow();
      }

      const fragment = document.createDocumentFragment();

      companies.forEach(company => {
        if (!company.id || !company.nome) {
          console.warn('Invalid company data:', company);
          return;
        }

        fragment.appendChild(this.ui.createCompanyRow(company));
      });

      table.appendChild(fragment);
    },

    createEmptyRow: () => {
      return `<tr><td colspan="5" class="text-center">No companies registered yet</td></tr>`;
    },

    createCompanyRow: (company) => {
      const row = document.createElement('tr');
      row.setAttribute('data-company-id', company.id);

      row.innerHTML = `
          <td>${this.ui.escapeHtml(company.nome)}</td>
          <td>${this.ui.escapeHtml(company.email)}</td>
          <td>${this.ui.escapeHtml(company.ramo_atuacao || 'N/A')}</td>
          <td class="status-cell">${this.ui.escapeHtml(company.status)}</td>
          <td class="actions-cell">
            <button class="btn btn-primary btn-sm btn-cadastrar-admin"
              data-id="${company.id}" 
              data-nome="${this.ui.escapeHtml(company.nome)}">
              <i class="bi bi-person-plus"></i> Register Admin
            </button>
            <button class="btn btn-danger btn-sm btn-remover-empresa"
              data-id="${company.id}" 
              data-nome="${this.ui.escapeHtml(company.nome)}">
              <i class="bi bi-trash"></i> Remove
            </button>
          </td>
        `;

      return row;
    },

    showError: (message) => {
      const table = this.ui.getTable();
      table.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-danger">
              <i class="bi bi-exclamation-triangle"></i> ${this.ui.escapeHtml(message)}
            </td>
          </tr>
        `;
    },

    showModal: (modalId, companyId = null, companyName = null) => {
      const modalElement = document.getElementById(modalId);
      if (!modalElement) throw new Error(`Modal ${modalId} not found`);

      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

      if (companyId && companyName) {
        const selectCompany = modalElement.querySelector('#empresaAdmin');
        if (selectCompany) {
          selectCompany.innerHTML = `
              <option value="${companyId}" selected>${this.ui.escapeHtml(companyName)}</option>
            `;
        }
      }

      modal.show();
      return modal;
    },

    escapeHtml: (unsafe) => {
      if (typeof unsafe !== 'string') return unsafe;
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  // Módulo de Eventos
  events = {
    init: () => {
      this.events.setupAdminButtons();
      this.events.setupRemoveButtons();
    },

    setupAdminButtons: () => {
      document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-cadastrar-admin')) {
          const button = e.target.closest('.btn-cadastrar-admin');
          const companyId = button.getAttribute('data-id');
          const companyName = button.getAttribute('data-nome');
          this.events.openAdminModal(companyId, companyName);
        }
      });
    },

    setupRemoveButtons: () => {
      document.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-remover-empresa')) {
          const button = e.target.closest('.btn-remover-empresa');
          const companyId = button.getAttribute('data-id');
          const companyName = button.getAttribute('data-nome');
          await this.events.handleRemoveCompany(companyId, companyName);
        }
      });
    },

    openAdminModal: (companyId, companyName) => {
      try {
        this.ui.showModal('modalAdicionarAdmin', companyId, companyName);

        const firstInput = document.querySelector('#modalAdicionarAdmin input');
        if (firstInput) firstInput.focus();
      } catch (error) {
        console.error('Error opening admin modal:', error);
        alert('Failed to open admin registration form');
      }
    },

    handleRemoveCompany: async (id, name) => {
      if (!confirm(`ATENÇÃO: Isso removerá permanentemente a empresa "${name}" e TODOS os dados associados (funcionários, registros de ponto, etc.). Deseja continuar?`)) {
        return;
      }

      const loadingToast = this.showLoadingToast(`Removendo empresa ${name} e todos os dados relacionados...`);

      try {
        const result = await this.api.remove(id);

        loadingToast.hide();
        this.showSuccessToast(result.message);

        await this.loadCompanies();
      } catch (error) {
        loadingToast.hide();
        console.error('Error removing company:', error);
        this.showErrorToast(`Falha ao remover empresa: ${error.message}`);
      }
    }
  };

  // Funções principais
  async loadCompanies() {
    try {
      this.ui.getTable().innerHTML = `
          <tr>
            <td colspan="5" class="text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p>Loading companies...</p>
            </td>
          </tr>
        `;

      const companies = await this.api.list();
      this.ui.renderCompanies(companies);
      this.events.init();
    } catch (error) {
      console.error('Load companies error:', error);
      this.ui.showError(error.message);
    }
  }

  setupAdminForm() {
    const form = document.getElementById('formAdicionarAdmin');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = `
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          Processando...
        `;

      try {
        const formData = {
          nome: form.nomeAdmin.value.trim(),
          email: form.emailAdmin.value.trim(),
          senha: form.senhaAdmin.value,
          id_empresa: form.empresaAdmin.value,
          cpf: form.cpfAdmin.value.trim().replace(/\D/g, '') // Remove caracteres não numéricos
        };

        if (!formData.id_empresa) {
          throw new Error('Nenhuma empresa selecionada');
        }

        // Validação básica dos campos
        if (!formData.nome || formData.nome.length < 3) {
          throw new Error('Nome deve ter pelo menos 3 caracteres');
        }

        if (!formData.email.includes('@')) {
          throw new Error('Email inválido');
        }

        if (formData.senha.length < 6) {
          throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        if (formData.cpf.length !== 11) {
          throw new Error('CPF deve ter 11 dígitos');
        }

        const response = await fetch('/api/empresas/cadastrar-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao cadastrar administrador');
        }

        this.showSuccessToast('Administrador cadastrado com sucesso!');
        form.reset();

        const modal = bootstrap.Modal.getInstance(
          document.getElementById('modalAdicionarAdmin')
        );
        modal.hide();

        await this.loadCompanies();
      } catch (error) {
        console.error('Register admin error:', error);
        this.showErrorToast(`Erro: ${error.message}`);
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }


  // Helper functions for notifications
  showLoadingToast(message) {
    console.log('Loading:', message);
    return {
      hide: () => console.log('Loading hidden')
    };
  }

  showSuccessToast(message) {
    alert('Success: ' + message);
  }

  showErrorToast(message) {
    alert('Error: ' + message);
  }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new GerenciadorEmpresas();
});