// Configuração inicial
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCompanies();
        setupAdminForm();
    } catch (error) {
        console.error('Initialization error:', error);
        CompanyUI.showError('Failed to initialize the page. Please refresh.');
    }
});

// Módulo de API
const CompanyAPI = {
    async list() {
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

    async remove(id) {
        const response = await fetch(`/api/empresas/remover/${id}`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to remove company');
        }
        
        return await response.json();
    },

    async registerAdmin(data) {
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
const CompanyUI = {
    getTable() {
        const table = document.getElementById('tabela-empresas');
        if (!table) throw new Error('Companies table not found');
        return table;
    },

    renderCompanies(companies) {
        const table = this.getTable();
        table.innerHTML = '';

        if (!Array.isArray(companies)) {
            console.error('Invalid companies data:', companies);
            return this.showError('Invalid companies data received from server');
        }

        if (companies.length === 0) {
            return table.innerHTML = this.createEmptyRow();
        }

        const fragment = document.createDocumentFragment();
        
        companies.forEach(company => {
            if (!company.id || !company.nome) {
                console.warn('Invalid company data:', company);
                return;
            }
            
            fragment.appendChild(this.createCompanyRow(company));
        });
        
        table.appendChild(fragment);
    },

    createEmptyRow() {
        return `<tr><td colspan="5" class="text-center">No companies registered yet</td></tr>`;
    },

    createCompanyRow(company) {
        const row = document.createElement('tr');
        row.setAttribute('data-company-id', company.id);
        
        row.innerHTML = `
            <td>${this.escapeHtml(company.nome)}</td>
            <td>${this.escapeHtml(company.email)}</td>
            <td>${this.escapeHtml(company.ramo_atuacao || 'N/A')}</td>
            <td class="status-cell">${this.escapeHtml(company.status)}</td>
            <td class="actions-cell">
                <button class="btn btn-primary btn-sm btn-cadastrar-admin"
                    data-id="${company.id}" 
                    data-nome="${this.escapeHtml(company.nome)}">
                    <i class="bi bi-person-plus"></i> Register Admin
                </button>
                <button class="btn btn-danger btn-sm btn-remover-empresa"
                    data-id="${company.id}" 
                    data-nome="${this.escapeHtml(company.nome)}">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </td>
        `;
        
        return row;
    },

    showError(message) {
        const table = this.getTable();
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${this.escapeHtml(message)}
                </td>
            </tr>
        `;
    },

    showModal(modalId, companyId = null, companyName = null) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) throw new Error(`Modal ${modalId} not found`);
        
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        
        // If company info is provided, set it in the modal
        if (companyId && companyName) {
            const selectCompany = modalElement.querySelector('#empresaAdmin');
            if (selectCompany) {
                selectCompany.innerHTML = `
                    <option value="${companyId}" selected>${this.escapeHtml(companyName)}</option>
                `;
            }
        }
        
        modal.show();
        return modal;
    },

    escapeHtml(unsafe) {
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
const CompanyEvents = {
    init() {
        this.setupAdminButtons();
        this.setupRemoveButtons();
    },

    setupAdminButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-cadastrar-admin')) {
                const button = e.target.closest('.btn-cadastrar-admin');
                const companyId = button.getAttribute('data-id');
                const companyName = button.getAttribute('data-nome');
                this.openAdminModal(companyId, companyName);
            }
        });
    },

    setupRemoveButtons() {
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-remover-empresa')) {
                const button = e.target.closest('.btn-remover-empresa');
                const companyId = button.getAttribute('data-id');
                const companyName = button.getAttribute('data-nome');
                await this.handleRemoveCompany(companyId, companyName);
            }
        });
    },

    openAdminModal(companyId, companyName) {
        try {
            CompanyUI.showModal('modalAdicionarAdmin', companyId, companyName);
            
            // Foca no primeiro campo do formulário
            const firstInput = document.querySelector('#modalAdicionarAdmin input');
            if (firstInput) firstInput.focus();
        } catch (error) {
            console.error('Error opening admin modal:', error);
            alert('Failed to open admin registration form');
        }
    },

    async handleRemoveCompany(id, name) {
        if (!confirm(`Are you sure you want to permanently remove "${name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const loadingToast = showLoadingToast('Removing company...');
            await CompanyAPI.remove(id);
            loadingToast.hide();
            showSuccessToast(`Company "${name}" removed successfully`);
            await loadCompanies();
        } catch (error) {
            console.error('Remove company error:', error);
            showErrorToast(`Failed to remove company: ${error.message}`);
        }
    }
};

// Funções principais
async function loadCompanies() {
    try {
        CompanyUI.getTable().innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading companies...</p>
                </td>
            </tr>
        `;
        
        const companies = await CompanyAPI.list();
        CompanyUI.renderCompanies(companies);
        CompanyEvents.init();
    } catch (error) {
        console.error('Load companies error:', error);
        CompanyUI.showError(error.message);
    }
}

function setupAdminForm() {
    const form = document.getElementById('formAdicionarAdmin');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Processing...
        `;
        
        try {
            const formData = {
                nome: form.nomeAdmin.value.trim(),
                email: form.emailAdmin.value.trim(),
                senha: form.senhaAdmin.value,
                id_empresa: form.empresaAdmin.value,
                cpf: form.cpfAdmin.value.trim()
            };

            // Basic validation
            if (!formData.id_empresa) {
                throw new Error('No company selected');
            }
            
            if (!formData.nome || !formData.email || !formData.senha || !formData.cpf) {
                throw new Error('Please fill all required fields');
            }

            await CompanyAPI.registerAdmin(formData);
            
            showSuccessToast('Admin registered successfully!');
            form.reset();
            
            const modal = bootstrap.Modal.getInstance(
                document.getElementById('modalAdicionarAdmin')
            );
            modal.hide();
            
            await loadCompanies();
        } catch (error) {
            console.error('Register admin error:', error);
            showErrorToast(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

// Helper functions for notifications
function showLoadingToast(message) {
    console.log('Loading:', message);
    return {
        hide: () => console.log('Loading hidden')
    };
}

function showSuccessToast(message) {
    alert('Success: ' + message);
}

function showErrorToast(message) {
    alert('Error: ' + message);
}