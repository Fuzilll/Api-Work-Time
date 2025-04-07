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
                <td>${empresa.ramo_atuacao}</td>
                <td class="status-${empresa.id}">${empresa.status}</td>
                <td>
                    <button class="btn btn-info btn-sm btn-toggle-status" data-id="${empresa.id}">
                        ${empresa.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                </td>
            `;

            tabelaEmpresas.appendChild(row);
        });

        adicionarEventosBotoes();
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        tabelaEmpresas.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar os dados</td></tr>`;
    }
}

// Função para adicionar eventos aos botões de ativar/desativar
function adicionarEventosBotoes() {
    document.querySelectorAll('.btn-toggle-status').forEach(botao => {
        botao.addEventListener('click', async () => {
            const empresaId = botao.getAttribute('data-id');

            try {
                const response = await fetch(`/api/empresas/alternar-status/${empresaId}`, { method: 'PUT' });

                if (!response.ok) {
                    throw new Error('Erro ao atualizar status da empresa');
                }

                console.log(`Status da empresa ID ${empresaId} atualizado!`);
                carregarEmpresas(); // Recarregar a lista de empresas
            } catch (error) {
                console.error('Erro ao alterar status:', error);
            }
        });
    });
}
