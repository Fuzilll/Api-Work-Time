class EmpresaCadastro {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3000/api';
    this.estadoSelect = document.getElementById("estado");
    this.form = document.getElementById("formCadastroEmpresa");
    this.init();
  }

  init() {
    if (!this.estadoSelect || !this.form) {
      console.error('Elementos necessários não encontrados no DOM');
      return;
    }
    this.configurarEventos();
    this.carregarEstados();
  }

  async carregarEstados() {
    try {
      console.log('Carregando estados...');
      
      // Estado de carregamento
      this.estadoSelect.disabled = true;
      this.estadoSelect.innerHTML = '<option value="">Carregando estados...</option>';
      
      const estados = await this.fetchEstados();
      this.preencherSelectEstados(estados);
    } catch (error) {
      console.error('Erro ao carregar estados:', error);
      this.mostrarErroEstados('Falha ao carregar estados. Tente novamente mais tarde.');
    } finally {
      this.estadoSelect.disabled = false;
    }
  }

  async fetchEstados() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/estados/listar`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data.data)) {
        throw new Error('Formato de dados inválido');
      }
      
      return data.data;  // Assumindo que os estados estão dentro de "data"
    } catch (error) {
      console.error('Erro na requisição de estados:', error);
      throw error;
    }
  }

  preencherSelectEstados(estados) {
    this.estadoSelect.innerHTML = '<option value="">Selecione um estado</option>';
    
    estados.forEach(estado => {
      const option = document.createElement("option");
      option.value = estado.id;
      option.textContent = `${estado.sigla} - ${estado.nome}`;
      this.estadoSelect.appendChild(option);
    });
  }

  mostrarErroEstados(mensagem) {
    this.estadoSelect.innerHTML = `<option value="">${mensagem}</option>`;
    
    // Opcional: adicionar botão para recarregar
    const reloadBtn = document.createElement("button");
    reloadBtn.textContent = "Tentar novamente";
    reloadBtn.className = "btn btn-sm btn-secondary mt-2";
    reloadBtn.onclick = () => this.carregarEstados();
    
    const container = document.createElement("div");
    container.className = "text-center";
    container.appendChild(reloadBtn);
    
    this.estadoSelect.parentNode.appendChild(container);
  }

  configurarEventos() {
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.processarFormulario();
    });
  }

  async processarFormulario() {
    try {
      const empresa = this.obterDadosFormulario();

      if (!this.validarDados(empresa)) {
        return;
      }

      const resultado = await this.salvarEmpresa(empresa);
      this.mostrarMensagemSucesso(resultado);
      this.resetarFormulario();
    } catch (error) {
      this.handleProcessarFormularioError(error);
    }
  }

  obterDadosFormulario() {
    return {
      nome: document.getElementById("nome").value.trim(),
      cnpj: document.getElementById("cnpj").value.trim(),
      cidade: document.getElementById("cidade").value.trim(),
      cep: document.getElementById("cep").value.trim(),
      rua: document.getElementById("rua").value.trim(),
      numero: document.getElementById("numero").value.trim(),
      id_estado: parseInt(document.getElementById("estado").value),
      ramo_atuacao: document.getElementById("ramo").value.trim(),
      email: document.getElementById("email").value.trim(),
      telefone: document.getElementById("telefone").value.trim(),
    };
  }

  validarDados(empresa) {
    const erros = [];
    
    if (!empresa.nome || empresa.nome.length < 2) {
      erros.push("O nome da empresa deve ter pelo menos 2 caracteres");
    }

    if (!empresa.cnpj || empresa.cnpj.length < 14) {
      erros.push("CNPJ inválido");
    }

    if (!empresa.id_estado) {
      erros.push("Selecione um estado");
    }

    if (!empresa.email || !empresa.email.includes('@')) {
      erros.push("E-mail inválido");
    }

    if (erros.length > 0) {
      alert(erros.join("\n"));
      return false;
    }

    return true;
  }

  async salvarEmpresa(empresa) {
    const response = await fetch(`${this.API_BASE_URL}/empresas/cadastrar`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(empresa)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Erro ao cadastrar empresa");
    }

    return await response.json();
  }

  mostrarMensagemSucesso(empresa) {
    alert(`Empresa ${empresa.nome} cadastrada com sucesso!`);
  }

  resetarFormulario() {
    this.form.reset();
    this.estadoSelect.innerHTML = '<option value="">Selecione um estado</option>';
  }

  handleProcessarFormularioError(error) {
    console.error("Erro no processamento do formulário:", error);
    alert(`Erro ao cadastrar empresa: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new EmpresaCadastro();
});
