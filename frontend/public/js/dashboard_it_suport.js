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

        console.log('Empresas carregadas:', empresas); // Exibe os dados no console

        tabelaEmpresas.innerHTML = ''; // Limpa a tabela antes de adicionar os novos dados

        empresas.forEach(empresa => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${empresa.nome}</td>
                <td>${empresa.ramo_de_atuacao}</td>
                <td>${empresa.status}</td>
                <td>
                    <button class="btn btn-info btn-sm">${empresa.status === 'Ativo' ? 'Desativar' : 'Ativar'}</button>
                </td>
            `;

            tabelaEmpresas.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        tabelaEmpresas.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar os dados</td></tr>`;
    }
}
