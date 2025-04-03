document.addEventListener('DOMContentLoaded', async () => {
    carregarEmpresas();
});

async function carregarEmpresas() {
    const tabelaEmpresas = document.getElementById('tabela-empresas');

    if (!tabelaEmpresas) {
        console.error('Elemento tabela-empresas não encontrado!');
        return;
    }

    try {
        const response = await fetch('/api/empresas/listar-empresas');
        const empresas = await response.json();

        if (!response.ok) {
            throw new Error(empresas.message || 'Erro ao carregar empresas');
        }

        console.log('Empresas carregadas:', empresas);

        tabelaEmpresas.innerHTML = '';

        empresas.forEach(empresa => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${empresa.nome}</td>
                <td>${empresa.email}</td>
                <td>${empresa.ramo_de_atuacao}</td>
                <td>${empresa.status}</td>
                <td>
                    <button class="btn btn-primary btn-sm btn-cadastrar-admin"
                        data-id="${empresa.id}" 
                        data-nome="${empresa.nome}">
                        Cadastrar Admin
                    </button>
                    <button class="btn btn-danger btn-sm btn-remover-empresa"
                        data-id="${empresa.id}" 
                        data-nome="${empresa.nome}">
                        Excluir Empresa
                    </button>
                </td>
            `;

            tabelaEmpresas.appendChild(row);
        });

        adicionarEventosBotoes();
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        tabelaEmpresas.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar os dados</td></tr>`;
    }
}

// Adicionar eventos aos botões
function adicionarEventosBotoes() {
    document.querySelectorAll('.btn-cadastrar-admin').forEach(botao => {
        botao.addEventListener('click', () => {
            const empresaId = botao.getAttribute('data-id');
            const empresaNome = botao.getAttribute('data-nome');
            abrirModalCadastroAdmin(empresaId, empresaNome);
        });
    });

    document.querySelectorAll('.btn-remover-empresa').forEach(botao => {
        botao.addEventListener('click', async () => {
            const empresaId = botao.getAttribute('data-id');
            const empresaNome = botao.getAttribute('data-nome');

            if (confirm(`Tem certeza que deseja remover a empresa "${empresaNome}"?`)) {
                try {
                    const response = await fetch(`/api/empresas/remover/${empresaId}`, { method: 'DELETE' });

                    if (!response.ok) {
                        throw new Error('Erro ao remover a empresa');
                    }

                    alert('Empresa removida com sucesso!');
                    carregarEmpresas();
                } catch (error) {
                    console.error('Erro ao remover empresa:', error);
                    alert('Erro ao remover empresa. Tente novamente.');
                }
            }
        });
    });
}

// Abrir modal de cadastro do administrador
function abrirModalCadastroAdmin(empresaId, empresaNome) {
    const modal = new bootstrap.Modal(document.getElementById('modalAdicionarAdmin'));

    // Preencher dropdown com a empresa selecionada
    const selectEmpresa = document.getElementById('empresaAdmin');
    selectEmpresa.innerHTML = `<option value="${empresaId}" selected>${empresaNome}</option>`;

    modal.show();
}
// Evento para cadastrar administrador
document.getElementById('formAdicionarAdmin').addEventListener('submit', async function (event) {
    event.preventDefault();

    const nome = document.getElementById('nomeAdmin').value;
    const email = document.getElementById('emailAdmin').value;
    const senha = document.getElementById('senhaAdmin').value;
    const empresaId = document.getElementById('empresaAdmin').value; 

    if (!empresaId) {
        alert('Erro: Nenhuma empresa foi selecionada.');
        return;
    }

    try {
        const response = await fetch('/api/empresas/cadastrar-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, id_empresa: empresaId }) // Ajustado para garantir que id_empresa seja enviado
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao cadastrar administrador');
        }

        alert('Administrador cadastrado com sucesso!');
        document.getElementById('formAdicionarAdmin').reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAdicionarAdmin'));
        modal.hide();

        carregarEmpresas();
    } catch (error) {
        console.error('Erro ao cadastrar administrador:', error);
        alert('Erro ao cadastrar administrador. Verifique os dados e tente novamente.');
    }
});
