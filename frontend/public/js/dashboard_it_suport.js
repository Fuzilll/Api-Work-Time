document.addEventListener('DOMContentLoaded', async () => {
    await carregarEmpresas();
});

async function carregarEmpresas() {
    const tabelaEmpresas = document.getElementById('tabela-empresas');

    if (!tabelaEmpresas) {
        console.error('Elemento tabela-empresas não encontrado!');
        return;
    }

    try {
        const response = await fetch('/api/empresas/listar');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar empresas');
        }

        const result = await response.json();
        
        // Verifica se a resposta contém um array de empresas
        if (!Array.isArray(result.data)) {
            throw new Error('Formato de dados inválido');
        }

        const empresas = result.data;
        console.log('Empresas carregadas:', empresas);

        tabelaEmpresas.innerHTML = ''; 

        if (empresas.length === 0) {
            tabelaEmpresas.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma empresa cadastrada</td></tr>`;
            return;
        }

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
        tabelaEmpresas.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar os dados: ${error.message}</td></tr>`;
    }
}

function adicionarEventosBotoes() {
    document.querySelectorAll('.btn-toggle-status').forEach(botao => {
        botao.addEventListener('click', async () => {
            const empresaId = botao.getAttribute('data-id');
            const acao = botao.textContent.trim();

            if (!confirm(`Tem certeza que deseja ${acao} esta empresa?`)) {
                return;
            }

            try {
                const response = await fetch(`/api/empresas/${empresaId}/status`, { 
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao atualizar status da empresa');
                }

                console.log(`Status da empresa ID ${empresaId} atualizado!`);
                await carregarEmpresas();
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                alert(`Erro ao alterar status: ${error.message}`);
            }
        });
    });
}