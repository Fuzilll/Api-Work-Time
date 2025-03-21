document.addEventListener("DOMContentLoaded", function () {
    // Não chama loadPage("dashboard") diretamente. Agora o conteúdo inicial é vazio.
    loadPageIfNeeded(); // Verifica se deve carregar uma página ou não ao inicializar

    document.getElementById("menu").addEventListener("click", function (event) {
        if (event.target.tagName === "A") {
            const page = event.target.getAttribute("data-page");
            loadPage(page); // Carrega a página clicada
        }
    });
});

// Função para carregar a página apenas quando necessário
function loadPageIfNeeded() {
    const currentPage = window.location.hash.replace('#', '');
    if (!currentPage || currentPage === '') {
        // Caso não haja página específica, pode-se carregar uma página de boas-vindas ou de dashboard inicial
        document.getElementById("main-content").innerHTML = `
            <h2>Bem-vindo</h2>
            <p>Escolha uma opção do menu para navegar.</p>
        `;
    } else {
        loadPage(currentPage); // Carrega a página baseada no hash da URL, caso o usuário tenha clicado em algo
    }
}

function loadPage(page) {
    fetch(`/pages/${page}.html`)
        .then(response => response.text())
        .then(html => {
            document.getElementById("main-content").innerHTML = html;
            window.location.hash = page; // Atualiza a URL com o nome da página carregada
        })
        .catch(error => {
            console.error("Erro ao carregar página:", error);
            // Caso o arquivo não seja encontrado, você pode exibir uma mensagem amigável
            document.getElementById("main-content").innerHTML = `<p>Erro ao carregar a página solicitada.</p>`;
        });
}
