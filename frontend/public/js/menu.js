document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const nivel = localStorage.getItem('nivel'); // Obtém o nível do usuário

    let menuItems = '';

    if (nivel === 'ADMIN') {
        menuItems = `
            <a href="dashboard_admin.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            <a href="cadastrar_funcionarios.html"><i class="fas fa-users"></i> Cadastrar Funcionários</a>
            <a href="gerenciar_pontos.html"><i class="fas fa-clock"></i> Gerenciar Pontos</a>
        `;
    } else if (nivel === 'FUNCIONARIO') {
        menuItems = `
            <a href="#" data-page="registros_ponto"><i class="fas fa-users"></i> Meus Registros</a>
            <a href="#" data-page="perfil_funcionario"><i class="fas fa-clock"></i> Perfil</a>
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
