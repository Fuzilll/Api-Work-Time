document.addEventListener("DOMContentLoaded", function () {
    const estados = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];

    const estadoSelect = document.getElementById("estado");
    estados.forEach((estado, index) => {
        let option = document.createElement("option");
        option.value = index + 1; // valor do estado, que deve ser o ID
        option.textContent = estado;
        estadoSelect.appendChild(option);
    });

    document.getElementById("formCadastroEmpresa").addEventListener("submit", function (event) {
        event.preventDefault();

        const empresa = {
            nome: document.getElementById("nome").value,
            cnpj: document.getElementById("cnpj").value,
            cidade: document.getElementById("cidade").value,
            cep: document.getElementById("cep").value,
            rua: document.getElementById("rua").value,
            numero: document.getElementById("numero").value,
            id_estado: document.getElementById("estado").value, // Passando o ID do estado
            ramo_de_atuacao: document.getElementById("ramo").value,
            email: document.getElementById("email").value,
            id_it_support: 1 // ID fixo de suporte para teste por enquanto
        };

        salvarEmpresa(empresa);
    });
});

function salvarEmpresa(empresa) {
    fetch("api/empresas/cadastrar", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresa)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("Erro ao cadastrar empresa: " + data.error);
        } else {
            alert("Empresa cadastrada com sucesso!");
            document.getElementById("formCadastroEmpresa").reset();
        }
    })
    .catch(error => alert("Erro ao conectar ao servidor: " + error));
}
