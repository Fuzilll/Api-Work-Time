document.addEventListener("DOMContentLoaded", function () {
    carregarPerfil();
});

// Carregar os dados do funcionário
function carregarPerfil() {
    fetch("/api/perfil")
        .then(response => response.json())
        .then(data => {
            document.getElementById("nomeFuncionario").value = data.nome;
            document.getElementById("emailFuncionario").value = data.email;
            document.getElementById("cpfFuncionario").value = data.cpf;
            document.getElementById("funcaoFuncionario").value = data.funcao;
        })
        .catch(error => console.error("Erro ao carregar perfil:", error));
}

// Atualizar a senha do funcionário
document.getElementById("formPerfil").addEventListener("submit", function (event) {
    event.preventDefault();

    const novaSenha = document.getElementById("senhaFuncionario").value;

    if (!novaSenha) {
        alert("Digite uma nova senha.");
        return;
    }

    fetch("/api/atualizar_senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: novaSenha })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.mensagem);
        document.getElementById("senhaFuncionario").value = "";
    })
    .catch(error => console.error("Erro ao atualizar senha:", error));
});
