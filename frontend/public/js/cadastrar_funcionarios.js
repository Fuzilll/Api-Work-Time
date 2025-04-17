class FuncionarioCadastro {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.form = document.getElementById("form-cadastrar-funcionario");
        this.errorMessage = document.getElementById("error-message");
        this.loadingOverlay = document.getElementById("loading-overlay");

        // Elementos para gestão de horários
        this.horarioModal = new bootstrap.Modal(document.getElementById('horarioModal'));
        this.horariosPersonalizados = null;
        this.definirHorarioCheckbox = document.getElementById('definir-horario');

        this.init();
    }
    init() {
        if (!this.form) {
            console.error('Formulário não encontrado no DOM');
            return;
        }

        this.configurarEventos();
        this.carregarDiasSemana();
    }

    configurarEventos() {
        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.processarFormulario(e);
        });

        if (this.definirHorarioCheckbox) {
            this.definirHorarioCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.horarioModal.show();
                } else {
                    this.horariosPersonalizados = null;
                }
            });
        }

        const salvarHorariosBtn = document.getElementById('salvar-horarios');
        if (salvarHorariosBtn) {
            salvarHorariosBtn.addEventListener('click', () => {
                this.coletarHorarios();
                this.horarioModal.hide();
            });
        }
    }

    carregarDiasSemana() {
        const container = document.getElementById('horarios-container');
        if (!container) return;

        const dias = [
            { nome: 'segunda', label: 'Segunda' },
            { nome: 'terca', label: 'Terça' },
            { nome: 'quarta', label: 'Quarta' },
            { nome: 'quinta', label: 'Quinta' },
            { nome: 'sexta', label: 'Sexta' }
        ];

        container.innerHTML = dias.map(({ nome, label }) => `
          <div class="row mb-3">
            <div class="col-md-12">
              <h6>${label}</h6>
            </div>
            <div class="col-md-3">
              <label>Entrada</label>
              <input type="time" class="form-control entrada-${nome}" value="09:00">
            </div>
            <div class="col-md-3">
              <label>Saída</label>
              <input type="time" class="form-control saida-${nome}" value="18:00">
            </div>
            <div class="col-md-3">
              <label>Início Intervalo</label>
              <input type="time" class="form-control intervalo-inicio-${nome}" value="12:00">
            </div>
            <div class="col-md-3">
              <label>Fim Intervalo</label>
              <input type="time" class="form-control intervalo-fim-${nome}" value="13:00">
            </div>
          </div>
        `).join('');
    }


    coletarHorarios() {
        const dias = [
            { nome: 'segunda', label: 'Segunda' },
            { nome: 'terca', label: 'Terça' },
            { nome: 'quarta', label: 'Quarta' },
            { nome: 'quinta', label: 'Quinta' },
            { nome: 'sexta', label: 'Sexta' }
        ];

        this.horariosPersonalizados = dias.map(({ nome, label }) => {
            const entradaEl = document.querySelector(`.entrada-${nome}`);
            const saidaEl = document.querySelector(`.saida-${nome}`);
            const intervaloInicioEl = document.querySelector(`.intervalo-inicio-${nome}`);
            const intervaloFimEl = document.querySelector(`.intervalo-fim-${nome}`);

            return {
                dia_semana: label,
                hora_entrada: entradaEl.value,
                hora_saida: saidaEl.value,
                intervalo_inicio: intervaloInicioEl.value,
                intervalo_fim: intervaloFimEl.value
            };
        });
    }

    async processarFormulario(event) {
        try {
            event.preventDefault();
            this.mostrarLoading(true);

            // 1. Obter dados do formulário
            const funcionario = this.obterDadosFormulario();
            if (!this.validarDados(funcionario)) return;

            // 2. Adicionar horários se checkbox estiver marcado
            const dadosEnvio = { ...funcionario };
            if (this.definirHorarioCheckbox?.checked && this.horariosPersonalizados) {
                dadosEnvio.horarios = this.horariosPersonalizados;
            }

            // 3. Enviar para o servidor
            const resultadoFuncionario = await this.salvarFuncionario(dadosEnvio);

            this.mostrarMensagemSucesso(resultadoFuncionario);
            this.resetarFormulario();

        } catch (error) {
            console.error('Erro detalhado:', error);
            this.handleProcessarFormularioError(error);
        } finally {
            this.mostrarLoading(false);
        }
    }


    obterDadosFormulario() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : null;
        };

        const salario = parseFloat(getValue("salario_base")) || null;

        return {
            nome: getValue("nome"),
            email: getValue("email"),
            senha: getValue("senha"),
            cpf: getValue("cpf"),
            registro_emp: getValue("registro_emp"),
            funcao: getValue("funcao"),
            data_admissao: getValue("data_admissao"),
            departamento: getValue("departamento"),
            salario_base: salario,
            tipo_contrato: getValue("tipo_contrato")
        };
    }

    validarDados(funcionario) {
        const erros = [];

        if (!funcionario.nome || funcionario.nome.length < 2) {
            erros.push("O nome deve ter pelo menos 2 caracteres");
        }

        if (!funcionario.email || !funcionario.email.includes('@')) {
            erros.push("E-mail inválido");
        }

        if (!funcionario.senha || funcionario.senha.length < 8) {
            erros.push("A senha deve ter pelo menos 8 caracteres");
        }

        if (!funcionario.cpf || funcionario.cpf.length !== 11 || !/^\d+$/.test(funcionario.cpf)) {
            erros.push("CPF deve ter exatamente 11 dígitos numéricos");
        }

        if (!funcionario.registro_emp || funcionario.registro_emp.trim() === '') {
            erros.push("Registro de empregado é obrigatório");
        }

        if (!funcionario.funcao || funcionario.funcao.trim() === '') {
            erros.push("Função é obrigatória");
        }

        if (!funcionario.data_admissao) {
            erros.push("Data de admissão é obrigatória");
        }

        if (!funcionario.departamento) {
            erros.push("Departamento é obrigatório");
        }

        if (!funcionario.salario_base || isNaN(funcionario.salario_base) || funcionario.salario_base <= 0) {
            erros.push("Salário base deve ser um valor positivo");
        }

        if (!funcionario.tipo_contrato) {
            erros.push("Tipo de contrato é obrigatório");
        }

        if (erros.length > 0) {
            this.mostrarErros(erros);
            return false;
        }

        return true;
    }

    async salvarFuncionario(funcionario) {
        // Verificar campos obrigatórios
        const camposObrigatorios = ['nome', 'email', 'senha', 'cpf', 'registro_emp',
            'funcao', 'data_admissao', 'tipo_contrato'];

        const faltantes = camposObrigatorios.filter(campo => !funcionario[campo]);

        if (faltantes.length > 0) {
            throw new Error(`Preencha todos os campos obrigatórios: ${faltantes.join(', ')}`);
        }

        // Converter salário para número
        if (funcionario.salario_base) {
            funcionario.salario_base = parseFloat(funcionario.salario_base);
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Usuário não autenticado');
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/funcionarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(funcionario)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }
    async cadastrarHorarios(idFuncionario) {
        if (!idFuncionario) {
            throw new Error('ID do funcionário não está definido');
        }

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${this.API_BASE_URL}/admin/funcionarios/${idFuncionario}/horarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ horarios: this.horariosPersonalizados })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Erro ao cadastrar horários');
        }
        return await response.json();
    }

    mostrarMensagemSucesso(funcionario) {
        Swal.fire({
            title: 'Sucesso!',
            text: `Funcionário ${funcionario.nome} cadastrado com sucesso!`,
            icon: 'success',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = '/lista-funcionarios.html';
        });
    }

    resetarFormulario() {
        this.form.reset();
        this.horariosPersonalizados = null;
        if (this.definirHorarioCheckbox) {
            this.definirHorarioCheckbox.checked = false;
        }
    }

    mostrarErros(erros) {
        if (this.errorMessage) {
            this.errorMessage.innerHTML = erros.map(erro => `<p>${erro}</p>`).join('');
            this.errorMessage.style.display = 'block';

            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 5000);
        } else {
            alert(erros.join("\n"));
        }
    }

    handleProcessarFormularioError(error) {
        console.error("Erro no cadastro:", error);

        let mensagem = 'Erro ao cadastrar funcionário';
        if (error.message.includes('500')) {
            mensagem = 'Erro interno no servidor. Verifique os dados e tente novamente.';
        } else if (error.message) {
            mensagem = error.message;
        }

        Swal.fire({
            title: 'Erro!',
            text: mensagem,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }

    mostrarLoading(mostrar) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = mostrar ? 'flex' : 'none';
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new FuncionarioCadastro();
});