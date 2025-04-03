document.addEventListener('DOMContentLoaded', async () => {
    await carregarHistoricoPontos();
});

async function carregarHistoricoPontos() {
    const tabelaPontos = document.getElementById('tabela-pontos').getElementsByTagName('tbody')[0];

    try {
        const response = await fetch('/api/funcionario/historico-pontos', { method: 'GET' });
        const pontos = await response.json();

        if (!response.ok) {
            throw new Error(pontos.message || 'Erro ao carregar histórico de pontos');
        }

        tabelaPontos.innerHTML = '';

        pontos.forEach(ponto => {
            const row = tabelaPontos.insertRow();
            row.innerHTML = `
                <td>${new Date(ponto.data_ponto).toLocaleString()}</td>
                <td>${ponto.status}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="abrirModalAlteracao(${ponto.id})">
                        Solicitar Alteração
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar histórico de pontos:', error);
    }
}

function abrirModalAlteracao(idRegistro) {
    const modal = new bootstrap.Modal(document.getElementById('modalAlteracao'));

    // Limpar os campos do modal
    document.getElementById('idRegistro').value = idRegistro;
    document.getElementById('novoHorario').value = '';
    document.getElementById('motivoAlteracao').value = '';

    // Exibir o modal para solicitar alteração
    modal.show();
}

// Enviar solicitação de alteração
document.getElementById('formSolicitarAlteracao').addEventListener('submit', async function (event) {
    event.preventDefault();

    const idRegistro = document.getElementById('idRegistro').value;
    const novoHorario = document.getElementById('novoHorario').value;
    const motivo = document.getElementById('motivoAlteracao').value;

    try {
        const response = await fetch('/api/funcionario/pedir-alteracao-ponto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_registro: idRegistro, novo_horario: novoHorario, motivo: motivo })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Erro ao solicitar alteração');
        }

        alert('Solicitação de alteração registrada com sucesso!');
        carregarHistoricoPontos(); // Recarregar histórico de pontos
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAlteracao'));
        modal.hide();
    } catch (error) {
        console.error('Erro ao solicitar alteração de ponto:', error);
        alert('Erro ao solicitar alteração de ponto');
    }
});
