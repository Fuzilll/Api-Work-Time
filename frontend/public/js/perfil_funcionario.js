class PerfilFuncionario {
  constructor() {
    this.authTokenKey = 'authToken';
    this.initElements();
    this.loadPerfil();
    this.setupEventListeners();
  }

  initElements() {
    this.elements = {
      perfil: document.getElementById('perfil'),
      profilePicture: document.querySelector('#profilePicture'),
      profilePictureInput: document.querySelector('#profilePictureInput')
    };
  }

  setupEventListeners() {
    if (this.elements.profilePictureInput) {
      this.elements.profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureChange(e));
    }

    const profileOverlay = document.querySelector('.profile-overlay');
    const profilePicture = document.querySelector('.profile-picture');

    if (profileOverlay) {
      profileOverlay.addEventListener('click', () => {
        this.elements.profilePictureInput?.click();
      });
    }

    if (profilePicture) {
      profilePicture.addEventListener('click', () => {
        this.elements.profilePictureInput?.click();
      });
    }
  }

  async handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        this.elements.profilePicture.src = e.target.result;
      };
      reader.readAsDataURL(file);

      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Token de autenticação não encontrado');

      const formData = new FormData();
      formData.append('foto', file);

      const response = await fetch('/api/funcionarios/upload-foto-perfil', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar foto de perfil');
      }

      const result = await response.json();
      console.log('Foto atualizada com sucesso:', result);

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Foto de perfil atualizada com sucesso',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Erro ao atualizar foto de perfil:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.message || 'Erro ao atualizar foto de perfil',
        timer: 3000
      });

      const perfilData = JSON.parse(localStorage.getItem('perfilData')) || {};
      this.elements.profilePicture.src = perfilData.fotoPerfilUrl || '/images/default-profile.png';
    }
  }

  async loadPerfil() {
    try {
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Token de autenticação não encontrado');

      const response = await this.makeAuthenticatedRequest('/api/funcionarios/perfil', 'GET', null, token);
      const perfil = response.data ?? response;

      console.log('Dados do perfil recebidos:', perfil);

      localStorage.setItem('perfilData', JSON.stringify(perfil));
      this.renderPerfil(perfil);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      this.showError(error.message || 'Erro ao carregar perfil');
    }
  }

  renderPerfil(perfil) {
    if (!this.elements.perfil) return;

    this.elements.perfil.innerHTML = `
      <div class="row">
        <div class="col-md-12 text-center mb-4">
          <div class="profile-picture-container">
            <img id="profilePicture" src="${perfil.fotoPerfilUrl || '/assets/images/default-profile.png'}" 
                 class="profile-picture img-thumbnail rounded-circle" 
                 alt="Foto de Perfil">
            <div class="profile-overlay">
              <i class="fas fa-camera"></i>
              <span>Alterar Foto</span>
            </div>
            <input type="file" id="profilePictureInput" accept="image/*" style="display: none;">
          </div>
        </div>
      </div>
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
    `;

    this.initElements(); // Atualiza referências para novos elementos
    this.setupEventListeners(); // Reassocia eventos
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

  showError(message) {
    if (this.elements.perfil) {
      this.elements.perfil.innerHTML = `
        <div class="alert alert-danger">${message}</div>
      `;
    }
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  new PerfilFuncionario();
});
