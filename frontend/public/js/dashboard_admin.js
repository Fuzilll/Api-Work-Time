document.addEventListener('DOMContentLoaded', async () => {
  try {
    mostrarLoading();

    const dados = await buscarDados('/api/dashboard');
    console.log('🔍 Dados recebidos do /api/dashboard:', dados);

    if (!dados || !dados.data) throw new Error('Dados inválidos do dashboard');

    carregarResumo(dados.data.resumoFuncionarios);
    carregarRelatorioPontos(dados.data.relatorioPontos);
    carregarRegistrosRecentes(dados.data.pontosPendentes);

  } catch (erro) {
    console.error('Erro ao carregar o dashboard:', erro);
    exibirErro('Erro ao carregar o painel. Tente recarregar a página.');
  } finally {
    esconderLoading();
  }
});
const graficoFuncionarios = new Chart(document.getElementById('graficoFuncionarios'), {
  type: 'doughnut',
  data: {
      labels: ['Ativos', 'Inativos'],
      datasets: [{
          data: [0, 0],
          backgroundColor: ['#2cb67d', '#72757e'],
          borderWidth: 1
      }]
  },
  options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: {
              position: 'bottom',
              labels: {
                  boxWidth: 12,
                  padding: 20
              }
          },
          tooltip: {
              callbacks: {
                  label: function (context) {
                      const label = context.label || '';
                      const value = context.raw || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${label}: ${value} (${percentage}%)`;
                  }
              }
          }
      },
      cutout: '70%'
  }
});

const graficoPontos = new Chart(document.getElementById('graficoPontos'), {
  type: 'bar',
  data: {
      labels: ['Aprovados', 'Pendentes'],
      datasets: [{
          label: 'Pontos',
          data: [110, 10],
          backgroundColor: ['#7f5af0', '#fa5246']
      }]
  },
  options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
  }
});
// Utils: loading
function mostrarLoading() {
  const loadingElement = document.getElementById('loading-overlay');
  if (loadingElement) loadingElement.style.display = 'flex';
}

function esconderLoading() {
  const loadingElement = document.getElementById('loading-overlay');
  if (loadingElement) loadingElement.style.display = 'none';
}

// Utils: mensagens
function exibirErro(mensagem) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.style.display = 'block';
    errorDiv.innerText = mensagem;
    setTimeout(() => errorDiv.style.display = 'none', 5000);
  }
}
// Funções principais
// Funções principais
function carregarResumo(resumo) {
  console.log('➡️ Dados recebidos para carregarResumo():', resumo);

  if (!resumo) {
    console.warn('⚠️ Resumo de funcionários ausente ou inválido:', resumo);
    return;
  }

  const { totalFuncionarios, funcionariosAtivos, funcionariosInativos } = resumo;

  console.log('✅ Resumo recebido do backend:', {
    totalFuncionarios,
    funcionariosAtivos,
    funcionariosInativos
  });

  // Atualiza os textos
  atualizarTexto('total-funcionarios', totalFuncionarios);
  atualizarTexto('funcionarios-ativos', funcionariosAtivos);
  atualizarTexto('funcionarios-inativos', funcionariosInativos);

  // Atualiza o gráfico doughnut
  graficoFuncionarios.data.datasets[0].data = [funcionariosAtivos, funcionariosInativos];
  graficoFuncionarios.update();
}

function carregarRelatorioPontos(relatorio = {}) {
  atualizarTexto('total-pontos', relatorio.totalPontos || 0);
  atualizarTexto('pontos-aprovados', relatorio.pontosAprovados || 0);
  atualizarTexto('pontos-pendentes', relatorio.pontosPendentes || 0);
}

function carregarRegistrosRecentes(pontosPendentes = []) {
  const tabela = document.getElementById('tabela-pontos');
  if (!tabela) return;

  tabela.innerHTML = '';

  pontosPendentes.forEach(registro => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${registro.nomeFuncionario || 'Desconhecido'}</td>
      <td>${formatarDataHora(registro.dataHora)}</td>
      <td>${formatarStatus(registro.status)}</td>
    `;
    tabela.appendChild(linha);
  });
}


// Funções auxiliares
async function buscarDados(url) {
  try {
    const resposta = await fetch(url, {
      credentials: 'include'
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const json = await resposta.json();
    return json;
  } catch (erro) {
    console.error(`❌ Erro ao buscar dados de ${url}:`, erro);
    throw erro;
  }
}


function atualizarTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = valor ?? 0;
  }
}
function formatarStatus(status) {
  if (!status) status = 'DESCONHECIDO';

  const mapa = {
    'APROVADO': { classe: 'success', texto: 'Aprovado' },
    'PENDENTE': { classe: 'warning', texto: 'Pendente' },
    'REJEITADO': { classe: 'danger', texto: 'Rejeitado' }
  };

  const item = mapa[status.toUpperCase()] || { classe: 'secondary', texto: 'Desconhecido' };
  return `<span class="badge bg-${item.classe}">${item.texto}</span>`;
}

function formatarDataHora(data) {
  if (!data) return 'Data não informada';

  try {
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Data inválida';
  }
}


