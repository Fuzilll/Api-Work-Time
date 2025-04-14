document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    let menuItems = '';

    if (userData.nivel === 'IT_SUPPORT') {
        menuItems = `
                <a href="it_support.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a>
                <a href="gerenciar_empresas.html"><i class="fas fa-building"></i><span>Cadastrar Empresas</span></a>
                <a href="gerenciar_usuarios.html"><i class="fas fa-users-cog"></i><span>Gerenciar Empresas</span></a>
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
