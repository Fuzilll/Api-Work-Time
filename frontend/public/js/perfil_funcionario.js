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
      profilePicture: document.getElementById('profilePicture'),
      profilePictureInput: document.getElementById('profilePictureInput')
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
      // Mostrar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        this.elements.profilePicture.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Fazer upload para o Cloudinary
      const formData = new FormData();
      formData.append('foto', file);

      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Token de autenticação não encontrado');

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

      // Mostrar mensagem de sucesso
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

      // Reverter para a imagem original em caso de erro
      const perfilData = JSON.parse(localStorage.getItem('perfilData')) || {};
      this.elements.profilePicture.src = perfilData.foto_perfil_url || '/images/default-profile.png';
    }
  }
  async loadPerfil() {
    try {
      const token = localStorage.getItem(this.authTokenKey);
      if (!token) throw new Error('Token de autenticação não encontrado');

      const response = await this.makeAuthenticatedRequest('/api/funcionarios/perfil', 'GET', null, token);
      const perfil = response.data ?? response;

      // Salvar dados do perfil localmente para uso posterior
      localStorage.setItem('perfilData', JSON.stringify(perfil));

      this.renderPerfil(perfil);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      this.showError(error.message || 'Erro ao carregar perfil');
    }
  }

  renderPerfil(perfil) {
    if (!this.elements.perfil) return;

    this.elements.perfil.querySelector('.card-body').innerHTML = `
            <div class="row">
                <div class="col-md-12 text-center mb-4">
                    <div class="profile-picture-container">
                        <img id="profilePicture" src="${perfil.foto_perfil_url || '/assets/images/default-profile.png'}" 
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

    // Re-inicializar os elementos e event listeners após renderizar
    this.initElements();
    this.setupEventListeners();
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