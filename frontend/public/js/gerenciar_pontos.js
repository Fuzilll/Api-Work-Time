function carregarPontos() {
    const filtro = document.querySelector("#filtro-pontos").value.trim();
    let url = "/api/empresas/carregar-pontos-pendentes";
    if (filtro) {
        url = `/api/empresas/buscar-pontos?filtro=${encodeURIComponent(filtro)}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar os pontos');
            return response.json();
        })
        .then(dados => {
            const tabelaPontos = document.querySelector("#tabela-pontos");
            tabelaPontos.innerHTML = dados.length ? dados.map(ponto => `
                <tr>
                    <td>${ponto.funcionario}</td>
                    <td>${new Date(ponto.data_ponto).toLocaleDateString('pt-BR')}</td>
                    <td>${new Date(ponto.data_ponto).toLocaleTimeString('pt-BR')}</td>
                    <td><span class="badge ${getBadgeClass(ponto.status)}">${ponto.status}</span></td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="atualizarPonto(${ponto.id}, 'Aprovado')">Aprovar</button>
                        <button class="btn btn-danger btn-sm" onclick="atualizarPonto(${ponto.id}, 'Rejeitado')">Rejeitar</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="5" class="text-center">Nenhum ponto encontrado.</td></tr>';
        })
        .catch(error => console.error(error));
}

function getBadgeClass(status) {
    return status === 'Aprovado' ? 'bg-success' : status === 'Pendente' ? 'bg-warning' : 'bg-danger';
}

function atualizarPonto(id, status) {
    fetch(`/api/empresas/atualizar-status/${id}/${status.toLowerCase()}`, { method: 'PUT' })
        .then(response => {
            if (!response.ok) throw new Error(`Erro ao ${status.toLowerCase()} ponto`);
            return response.json();
        })
        .then(result => {
            alert(result.success ? `Ponto ${status.toLowerCase()} com sucesso!` : `Erro ao ${status.toLowerCase()} ponto`);
            carregarPontos();
        })
        .catch(error => console.error(error));
}

document.addEventListener('DOMContentLoaded', carregarPontos);
document.querySelector("#filtro-pontos").addEventListener('input', carregarPontos);
