document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const nivel = localStorage.getItem('nivel'); // Obtém o nível do usuário
    
    let menuItems = '';

    if (nivel === 'IT_SUPPORT') {
        menuItems = `
            <a href="it_suport.html"><i class="fas fa-home"></i> Dashboard</a>
            <a href="cadastrar_empresas.html"><i class="fas fa-users"></i> Cadastrar Empresas</a>
            <a href="gerenciar_empresas.html"><i class="fas fa-clock"></i> Gerenciar Empresas</a>
        `;
    } else {
        menuItems = `<a href="index.html"><i class="fas fa-home"></i> Home</a>`;
    }

    menu.innerHTML = menuItems;
});



// Função para logout
function logout() {
    localStorage.removeItem('nivel');
    window.location.href = 'index.html';
}
