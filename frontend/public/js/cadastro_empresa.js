document.addEventListener("DOMContentLoaded", function () {
    const estados = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];

    const estadoSelect = document.getElementById("estado");
    estados.forEach((estado, index) => {
        let option = document.createElement("option");
        option.value = index + 1;
        option.textContent = estado;
        estadoSelect.appendChild(option);
    });

    document.getElementById("formCadastroEmpresa").addEventListener("submit", function (event) {
        event.preventDefault();

        // Coletar todos os dados do formulário
        const empresa = {
            nome: document.getElementById("nome").value.trim(),
            cnpj: document.getElementById("cnpj").value.trim(),
            cidade: document.getElementById("cidade").value.trim(),
            cep: document.getElementById("cep").value.trim(),
            rua: document.getElementById("rua").value.trim(),
            numero: document.getElementById("numero").value.trim(),
            id_estado: document.getElementById("estado").value,
            ramo_atuacao: document.getElementById("ramo").value.trim(),
            email: document.getElementById("email").value.trim(),
            telefone: document.getElementById("telefone").value.trim()
        };

        // Validação dos campos obrigatórios
        if (!empresa.nome || !empresa.cnpj || !empresa.cidade || !empresa.cep || 
            !empresa.rua || !empresa.numero || !empresa.id_estado || 
            !empresa.ramo_atuacao || !empresa.email) {
            alert("Por favor, preencha todos os campos obrigatórios!");
            return;
        }

        // Validação específica do ramo de atuação
        if (empresa.ramo_atuacao.length < 2) {
            alert("O ramo de atuação deve ter pelo menos 2 caracteres!");
            return;
        }

        salvarEmpresa(empresa);
    });
});

function salvarEmpresa(empresa) {
    fetch("/api/empresas/cadastrar", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresa)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        alert(`Empresa ${data.nome} cadastrada com sucesso! ID: ${data.id}`);
        document.getElementById("formCadastroEmpresa").reset();
    })
    .catch(error => {
        console.error("Erro:", error);
        alert("Erro ao cadastrar empresa: " + (error.message || error.error || 'Erro desconhecido'));
    });
}