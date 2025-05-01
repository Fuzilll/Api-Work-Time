// Variáveis globais
let solicitacoes = [];
let solicitacaoSelecionada = null;
let acaoSelecionada = null;

// Elementos DOM
const tableBody = document.querySelector('#solicitacoesTable tbody');
const modal = document.getElementById('modalAprovarRejeitar');
const spanClose = document.getElementsByClassName('close')[0];
const btnConfirmarAcao = document.getElementById('btnConfirmarAcao');
const btnCancelarAcao = document.getElementById('btnCancelarAcao');
const modalTitulo = document.getElementById('modalTitulo');
const modalFuncionario = document.getElementById('modalFuncionario');
const modalDataHora = document.getElementById('modalDataHora');
const modalMotivo = document.getElementById('modalMotivo');
const motivoAdmin = document.getElementById('motivoAdmin');

/**
 * Carrega as solicitações de alteração pendentes
 * @async
 */
async function carregarSolicitacoes() {
    try {
        console.log('[Solicitacoes] Carregando solicitações...');
        const response = await fetch('/api/admin/solicitacoes/pendentes');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const { data } = await response.json();
        solicitacoes = data;
        renderizarTabela();
    } catch (error) {
        console.error('[Solicitacoes] Erro ao carregar solicitações:', error);
        exibirNotificacao('Erro ao carregar solicitações. Tente novamente.', 'error');
    }
}

/**
 * Renderiza a tabela de solicitações
 */
function renderizarTabela() {
    tableBody.innerHTML = '';
    
    if (solicitacoes.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-data">
                <td colspan="7">Nenhuma solicitação pendente encontrada</td>
            </tr>
        `;
        return;
    }
    
    solicitacoes.forEach(solicitacao => {
        const row = document.createElement('tr');
        row.dataset.id = solicitacao.id;
        
        row.innerHTML = `
            <td>${solicitacao.nome_funcionario}</td>
            <td>${formatarDataHora(solicitacao.data_hora_original)}</td>
            <td>${solicitacao.tipo_registro}</td>
            <td>${solicitacao.departamento}</td>
            <td title="${solicitacao.motivo}">
                ${truncarTexto(solicitacao.motivo, 50)}
            </td>
            <td><span class="badge badge-pendente">Pendente</span></td>
            <td class="actions">
                <button class="btn btn-approve" data-id="${solicitacao.id}">
                    <i class="fas fa-check"></i> Aprovar
                </button>
                <button class="btn btn-reject" data-id="${solicitacao.id}">
                    <i class="fas fa-times"></i> Rejeitar
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    adicionarListenersBotoes();
}

/**
 * Formata data/hora para exibição
 * @param {string} dataHora - Data/hora no formato ISO
 * @returns {string} Data/hora formatada
 */
function formatarDataHora(dataHora) {
    if (!dataHora) return '-';
    const dt = new Date(dataHora);
    return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Trunca texto para o tamanho especificado
 * @param {string} texto - Texto original
 * @param {number} maxLength - Tamanho máximo
 * @returns {string} Texto truncado
 */
function truncarTexto(texto, maxLength) {
    if (!texto) return '';
    return texto.length > maxLength 
        ? `${texto.substring(0, maxLength)}...` 
        : texto;
}

/**
 * Adiciona listeners aos botões de ação
 */
function adicionarListenersBotoes() {
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', (e) => abrirModal(e.target.dataset.id, 'Aprovar'));
    });
    
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => abrirModal(e.target.dataset.id, 'Rejeitar'));
    });
}

/**
 * Abre o modal para aprovar/rejeitar solicitação
 * @param {string} idSolicitacao - ID da solicitação
 * @param {string} acao - Ação a ser realizada ('Aprovar' ou 'Rejeitar')
 */
function abrirModal(idSolicitacao, acao) {
    solicitacaoSelecionada = solicitacoes.find(s => s.id == idSolicitacao);
    acaoSelecionada = acao;
    
    if (!solicitacaoSelecionada) {
        exibirNotificacao('Solicitação não encontrada', 'error');
        return;
    }
    
    // Preencher modal
    modalTitulo.textContent = `${acao} Solicitação`;
    modalFuncionario.textContent = solicitacaoSelecionada.nome_funcionario;
    modalDataHora.textContent = formatarDataHora(solicitacaoSelecionada.data_hora_original);
    modalMotivo.textContent = solicitacaoSelecionada.motivo;
    motivoAdmin.value = '';
    
    // Configurar botão de confirmação
    btnConfirmarAcao.textContent = acao;
    btnConfirmarAcao.className = `btn ${acao === 'Aprovar' ? 'btn-success' : 'btn-danger'}`;
    
    // Mostrar modal
    modal.style.display = 'block';
}

/**
 * Fecha o modal
 */
function fecharModal() {
    modal.style.display = 'none';
    solicitacaoSelecionada = null;
    acaoSelecionada = null;
}

/**
 * Processa a ação de aprovar/rejeitar
 * @async
 */
async function processarAcao() {
    const motivo = motivoAdmin.value.trim();
    
    if (!motivo || motivo.length < 5) {
        exibirNotificacao('Informe um motivo válido (mínimo 5 caracteres)', 'warning');
        return;
    }
    
    try {
        console.log(`[Solicitacoes] Processando ${acaoSelecionada} para solicitação ${solicitacaoSelecionada.id}`);
        
        const response = await fetch(`/api/admin/solicitacoes/${solicitacaoSelecionada.id}/processar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                acao: acaoSelecionada.toLowerCase(),
                motivo: motivo
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao processar solicitação');
        }
        
        const { message } = await response.json();
        exibirNotificacao(message, 'success');
        fecharModal();
        await carregarSolicitacoes();
    } catch (error) {
        console.error('[Solicitacoes] Erro ao processar ação:', error);
        exibirNotificacao(error.message || 'Erro ao processar solicitação', 'error');
    }
}

/**
 * Exibe uma notificação para o usuário
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo de notificação ('success', 'error', 'warning')
 */
function exibirNotificacao(mensagem, tipo) {
    // Implementação depende da biblioteca de notificação usada
    // Exemplo com Toastr:
    if (typeof toastr !== 'undefined') {
        toastr[tipo](mensagem);
    } else {
        alert(`${tipo.toUpperCase()}: ${mensagem}`);
    }
}

// Event Listeners
spanClose.addEventListener('click', fecharModal);
btnCancelarAcao.addEventListener('click', fecharModal);
btnConfirmarAcao.addEventListener('click', processarAcao);
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        fecharModal();
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('solicitacoes.html')) {
        carregarSolicitacoes();
    }
});