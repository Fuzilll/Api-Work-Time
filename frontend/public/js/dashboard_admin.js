const idEmpresa = localStorage.getItem('id_empresa');

// Verificar autenticação antes de fazer as requisições
document.addEventListener('DOMContentLoaded', function () {
    if (!idEmpresa || !localStorage.getItem('id_usuario')) {
        window.location.href = 'login.html';
        return;
    }
    fetchResumoFuncionarios();
    fetchRelatorioPontos();
    fetchUltimosRegistrosPonto();
});

// Função para buscar o resumo de funcionários
function fetchResumoFuncionarios() {
    
    const url = `http://localhost:3000/api/empresas/${idEmpresa}/admin/resumo`;

    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Adicione se usar token
        }
    })
    .then(response => {
      console.log('Resposta recebida, status:', response.status);
      if (!response.ok) throw new Error('Erro na requisição: ' + response.status);
      return response.json();
    })
    .then(data => {
        document.getElementById('total-funcionarios').textContent = data.total_funcionarios || 0;
        document.getElementById('funcionarios-ativos').textContent = data.funcionarios_ativos || 0;
        document.getElementById('funcionarios-inativos').textContent = data.funcionarios_inativos || 0;
    })
    .catch(error => {
        console.error('Erro ao buscar resumo de funcionários:', error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html';
        }
    });
}

// Função para buscar o relatório de pontos
function fetchRelatorioPontos() {
    fetch(`/api/empresas/${idEmpresa}/admin/relatorios/pontos`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro na requisição');
        return response.json();
    })
    .then(data => {
        document.getElementById('total-pontos').textContent = data.total_pontos || 0;
        document.getElementById('pontos-aprovados').textContent = data.pontos_aprovados || 0;
        document.getElementById('pontos-pendentes').textContent = data.pontos_pendentes || 0;
    })
    .catch(error => {
        console.error('Erro ao buscar relatório de pontos:', error);
    });
}

// Função para buscar os últimos registros de ponto
function fetchUltimosRegistrosPonto() {
    fetch(`/api/empresas/${idEmpresa}/admin/registros-recentes`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro na requisição');
        return response.json();
    })
    .then(data => {
        const tabelaPontos = document.getElementById('tabela-pontos');
        tabelaPontos.innerHTML = '';

        // Verifica se os dados estão no formato esperado
        const registros = Array.isArray(data) ? data : (data.registros || []);
        
        if (registros.length === 0) {
            tabelaPontos.innerHTML = '<tr><td colspan="3">Nenhum registro encontrado</td></tr>';
            return;
        }

        registros.forEach(registro => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${registro.funcionario || 'N/A'}</td>
                <td>${registro.data || 'N/A'}</td>
                <td>${registro.status || 'N/A'}</td>
            `;
            tabelaPontos.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Erro ao buscar últimos registros de ponto:', error);
        document.getElementById('tabela-pontos').innerHTML = 
            '<tr><td colspan="3">Erro ao carregar registros</td></tr>';
    });
}