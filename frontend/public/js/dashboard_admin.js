// Função para buscar o resumo de funcionários
function fetchResumoFuncionarios() {
    fetch('/api/empresas/admin-resumoFuncionarios') 
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-funcionarios').textContent = data.total_funcionarios;
            document.getElementById('funcionarios-ativos').textContent = data.funcionarios_ativos;
            document.getElementById('funcionarios-inativos').textContent = data.funcionarios_inativos;
        })
        .catch(error => {
            console.error('Erro ao buscar resumo de funcionários:', error);
        });
}

// Função para buscar o relatório de pontos
function fetchRelatorioPontos() {
    fetch('/api/empresas/admin-relatorioPontos') 
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-pontos').textContent = data.total_pontos;
            document.getElementById('pontos-aprovados').textContent = data.pontos_aprovados;
            document.getElementById('pontos-pendentes').textContent = data.pontos_pendentes;
        })
        .catch(error => {
            console.error('Erro ao buscar relatório de pontos:', error);
        });
}

// Função para buscar os últimos registros de ponto
function fetchUltimosRegistrosPonto() {
    fetch('/api/empresas/admin-ultimosRegistrosPonto') // Endpoint que retorna os últimos registros de ponto
        .then(response => response.json())
        .then(data => {
            const tabelaPontos = document.getElementById('tabela-pontos');
            tabelaPontos.innerHTML = ''; // Limpa a tabela antes de adicionar os novos registros

            data.forEach(registro => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${registro.funcionario}</td>
                    <td>${registro.data}</td>
                    <td>${registro.status}</td>
                `;
                tabelaPontos.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Erro ao buscar últimos registros de ponto:', error);
        });
}

// Chama as funções quando a página for carregada
document.addEventListener('DOMContentLoaded', function () {
    fetchResumoFuncionarios();
    fetchRelatorioPontos();
    fetchUltimosRegistrosPonto();
});
