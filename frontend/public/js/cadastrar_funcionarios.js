class FuncionarioCadastro {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api';
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

            // Validar se todos os campos de horário estão preenchidos
            if (!entradaEl.value || !saidaEl.value || !intervaloInicioEl.value || !intervaloFimEl.value) {
                throw new Error(`Preencha todos os horários para ${label}`);
            }

            // Validar se a hora de saída é depois da hora de entrada
            if (saidaEl.value <= entradaEl.value) {
                throw new Error(`A hora de saída deve ser após a hora de entrada para ${label}`);
            }

            // Validar se o intervalo está dentro do horário de trabalho
            if (intervaloInicioEl.value < entradaEl.value || intervaloFimEl.value > saidaEl.value) {
                throw new Error(`O intervalo deve estar dentro do horário de trabalho para ${label}`);
            }

            return {
                dia_semana: label,
                hora_entrada: entradaEl.value + ':00', // Garantir formato HH:MM:SS
                hora_saida: saidaEl.value + ':00',
                intervalo_inicio: intervaloInicioEl.value + ':00',
                intervalo_fim: intervaloFimEl.value + ':00'
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
            
            // Converter data para formato ISO
            if (dadosEnvio.data_admissao) {
                dadosEnvio.data_admissao = new Date(dadosEnvio.data_admissao).toISOString();
            }

            if (this.definirHorarioCheckbox?.checked) {
                try {
                    this.coletarHorarios();
                    dadosEnvio.horarios = this.horariosPersonalizados;
                } catch (error) {
                    this.mostrarErros([error.message]);
                    return;
                }
            }

            // 3. Enviar para o servidor
            const resultadoFuncionario = await this.salvarFuncionario(dadosEnvio);

            // 4. Se houver horários e o cadastro do funcionário foi bem-sucedido
            if (this.definirHorarioCheckbox?.checked && this.horariosPersonalizados && resultadoFuncionario.id) {
                await this.cadastrarHorarios(resultadoFuncionario.id);
            }

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
            cpf: getValue("cpf") ? getValue("cpf").replace(/\D/g, '') : null, // Remover formatação do CPF
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

    const nome = funcionario.nome?.trim();
    const email = funcionario.email?.trim();
    const senha = funcionario.senha;
    const cpf = funcionario.cpf?.trim();
    const registroEmp = funcionario.registro_emp?.trim();
    const funcao = funcionario.funcao?.trim();
    const dataAdmissao = funcionario.data_admissao;
    const departamento = funcionario.departamento;
    const salario = funcionario.salario_base;
    const tipoContrato = funcionario.tipo_contrato;

    // Nome
    if (!nome || nome.length < 2) {
        erros.push("O nome deve conter pelo menos 2 caracteres.");
    }

    // E-mail
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        erros.push("E-mail inválido.");
    }

    // Senha
    if (!senha || senha.length < 8 || !/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/\d/.test(senha)) {
        erros.push("A senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma minúscula e um número.");
    }

    // CPF (com validação algorítmica)
    if (!cpf || cpf.length !== 11 || !/^\d+$/.test(cpf) || !this.validarCPF(cpf)) {
        erros.push("CPF inválido.");
    }

    // Registro
    if (!registroEmp) {
        erros.push("Registro de empregado é obrigatório.");
    }

    // Função
    if (!funcao) {
        erros.push("Função é obrigatória.");
    }

    // Data de admissão
    const data = new Date(dataAdmissao);
    if (!dataAdmissao || isNaN(data.getTime())) {
        erros.push("Data de admissão inválida.");
    } else if (data > new Date()) {
        erros.push("Data de admissão não pode ser futura.");
    }

    // Departamento
    if (!departamento) {
        erros.push("Departamento é obrigatório.");
    }

    // Salário
    if (!salario || isNaN(salario) || salario <= 0) {
        erros.push("Salário base deve ser um número positivo.");
    }

    // Tipo de contrato
    if (!tipoContrato) {
        erros.push("Tipo de contrato é obrigatório.");
    }

    if (erros.length > 0) {
        this.mostrarErros(erros);
        return false;
    }

    return true;
}
validarCPF(cpf) {
    if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
}


    async salvarFuncionario(funcionario) {
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
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            // Tratamento modificado para diferentes formatos de erro
            if (response.status === 422) {
                let errorMessage = 'Erro de validação';
                
                if (errorData.errors) {
                    // Formato 1: { errors: { campo: ["mensagem1", "mensagem2"] } }
                    if (typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
                        const validationErrors = Object.entries(errorData.errors)
                            .map(([field, messages]) => {
                                // Verifica se messages é um array
                                if (Array.isArray(messages)) {
                                    return `${field}: ${messages.join(', ')}`;
                                }
                                // Se não for array, converte para string
                                return `${field}: ${String(messages)}`;
                            });
                        errorMessage = `Erros de validação:\n${validationErrors.join('\n')}`;
                    } 
                    // Formato 2: { errors: ["mensagem1", "mensagem2"] }
                    else if (Array.isArray(errorData.errors)) {
                        errorMessage = `Erros de validação:\n${errorData.errors.join('\n')}`;
                    }
                    // Formato 3: { errors: "mensagem única" }
                    else {
                        errorMessage = String(errorData.errors);
                    }
                } 
                // Formato 4: { message: "mensagem de erro" }
                else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                throw new Error(errorMessage);
            }
            
            throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    async cadastrarHorarios(idFuncionario) {
        if (!idFuncionario) {
            throw new Error('ID do funcionário não está definido');
        }

        if (!this.horariosPersonalizados || this.horariosPersonalizados.length === 0) {
            throw new Error('Nenhum horário personalizado foi definido');
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
            window.location.href = '/cadastrar_funcionarios.html';
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
        
        // Se for um erro de validação (422), mostra a mensagem diretamente
        if (error.message.includes('Erros de validação') || error.message.includes('Erro de validação')) {
            mensagem = error.message;
        } 
        else if (error.message.includes('500')) {
            mensagem = 'Erro interno no servidor. Verifique os dados e tente novamente.';
        } 
        else if (error.message.includes('Campos obrigatórios faltando')) {
            const camposFaltando = error.message.split(':')[1]?.trim();
            mensagem = `Preencha os seguintes campos obrigatórios: ${camposFaltando}`;
        } 
        else if (error.message.includes('horários')) {
            mensagem = 'Erro no envio dos horários: verifique se todos os campos estão preenchidos corretamente.';
        } 
        else if (error.message) {
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