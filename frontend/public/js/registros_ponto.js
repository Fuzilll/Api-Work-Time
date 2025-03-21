document.addEventListener("DOMContentLoaded", function () {
    carregarRegistros();
});

// Função para carregar os registros do funcionário
function carregarRegistros() {
    fetch("/api/registros")
        .then(response => response.json())
        .then(data => {
            const tabela = document.getElementById("tabela-registros");
            tabela.innerHTML = "";

            data.forEach(registro => {
                const linha = `
                    <tr>
                        <td>${registro.data}</td>
                        <td>${registro.entrada}</td>
                        <td>${registro.saida || "Não registrado"}</td>
                        <td>${registro.localizacao}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="abrirModalAlteracao('${registro.id}', '${registro.data}')">
                                <i class="fas fa-edit"></i> Solicitar Alteração
                            </button>
                        </td>
                    </tr>`;
                tabela.innerHTML += linha;
            });
        })
        .catch(error => console.error("Erro ao carregar registros:", error));
}

// Função para abrir o modal de solicitação de alteração
function abrirModalAlteracao(idRegistro, data) {
    document.getElementById("dataRegistro").value = data;
    document.getElementById("formSolicitarAlteracao").setAttribute("data-id", idRegistro);
    new bootstrap.Modal(document.getElementById("modalSolicitarAlteracao")).show();
}

// Enviar solicitação de alteração
document.getElementById("formSolicitarAlteracao").addEventListener("submit", function (event) {
    event.preventDefault();

    const idRegistro = this.getAttribute("data-id");
    const novoHorario = document.getElementById("novoHorario").value;
    const motivo = document.getElementById("motivoAlteracao").value;

    fetch("/api/solicitar_alteracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idRegistro, novoHorario, motivo })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.mensagem);
        new bootstrap.Modal(document.getElementById("modalSolicitarAlteracao")).hide();
        carregarRegistros();
    })
    .catch(error => console.error("Erro ao solicitar alteração:", error));
});
