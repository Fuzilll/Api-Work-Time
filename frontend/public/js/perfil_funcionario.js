class PerfilFuncionario {
    constructor() {
      this.authTokenKey = 'authToken';
      this.initElements();
      this.loadPerfil();
    }
  
    initElements() {
      this.elements = {
        perfil: document.getElementById('perfil')
      };
    }
  
    async loadPerfil() {
      try {
        const token = localStorage.getItem(this.authTokenKey);
        if (!token) throw new Error('Token de autenticação não encontrado');
  
        const response = await this.makeAuthenticatedRequest('/api/funcionario/perfil', 'GET', null, token);
        const perfil = response.data ?? response;
  
        this.renderPerfil(perfil);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        this.showError(error.message || 'Erro ao carregar perfil');
      }
    }
  
    async makeAuthenticatedRequest(url, method = 'GET', body = null, token) {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : null
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
  
    renderPerfil(perfil) {
      if (!this.elements.perfil) return;
  
      this.elements.perfil.innerHTML = `
        <div class="card-body">
          <ul class="list-group">
            <li class="list-group-item"><strong>Nome:</strong> ${perfil.nome}</li>
            <li class="list-group-item"><strong>Email:</strong> ${perfil.email}</li>
            <li class="list-group-item"><strong>Função:</strong> ${perfil.funcao}</li>
            <li class="list-group-item"><strong>Registro:</strong> ${perfil.registro_emp}</li>
            <li class="list-group-item"><strong>Departamento:</strong> ${perfil.departamento || 'Não informado'}</li>
            <li class="list-group-item"><strong>Data de Admissão:</strong> ${new Date(perfil.data_admissao).toLocaleDateString()}</li>
            <li class="list-group-item"><strong>Tipo de Contrato:</strong> ${perfil.tipo_contrato}</li>
            <li class="list-group-item"><strong>Empresa:</strong> ${perfil.empresa_nome}</li>
          </ul>
        </div>
      `;
    }
  
    showError(message) {
      if (this.elements.perfil) {
        this.elements.perfil.innerHTML = `
          <div class="alert alert-danger">
            ${message}
          </div>
        `;
      }
    }
  }
  
  // Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    new PerfilFuncionario();
  });