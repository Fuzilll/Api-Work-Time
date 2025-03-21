// Função para carregar os registros de ponto
async function carregarPontos() {
    try {
        const filtro = document.querySelector("#filtro-pontos").value;
        const response = await fetch(`/api/pontos?filtro=${filtro}`);
        const dados = await response.json();

        // Preencher a tabela de registros de ponto
        const tabelaPontos = document.querySelector("#tabela-pontos tbody");
        tabelaPontos.innerHTML = '';
        dados.forEach(ponto => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ponto.funcionario}</td>
                <td>${ponto.data}</td>
                <td>${ponto.entrada}</td>
                <td>${ponto.saida}</td>
                <td><span class="badge ${ponto.status === 'Aprovado' ? 'bg-success' : ponto.status === 'Pendente' ? 'bg-warning' : 'bg-danger'}">${ponto.status}</span></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="aprovarPonto(${ponto.id})">Aprovar</button>
                    <button class="btn btn-danger btn-sm" onclick="rejeitarPonto(${ponto.id})">Rejeitar</button>
                </td>
            `;
            tabelaPontos.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar os pontos', error);
    }
}

// Função para aprovar ponto
async function aprovarPonto(id) {
    try {
        const response = await fetch(`/api/pontos/${id}/aprovar`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            alert('Ponto aprovado!');
            carregarPontos();  // Atualizar a lista de pontos
        } else {
            alert('Erro ao aprovar ponto');
        }
    } catch (error) {
        console.error('Erro ao aprovar ponto', error);
    }
}

// Função para rejeitar ponto
async function rejeitarPonto(id) {
    try {
        const response = await fetch(`/api/pontos/${id}/rejeitar`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            alert('Ponto rejeitado!');
            carregarPontos();  // Atualizar a lista de pontos
        } else {
            alert('Erro ao rejeitar ponto');
        }
    } catch (error) {
        console.error('Erro ao rejeitar ponto', error);
    }
}

// Carregar dados ao carregar a página
document.addEventListener('DOMContentLoaded', carregarPontos);

// Filtro de pesquisa
document.querySelector("#filtro-pontos").addEventListener('input', carregarPontos);
