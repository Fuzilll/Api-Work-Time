document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const nivel = localStorage.getItem('nivel'); // Obtém o nível do usuário
    
    let menuItems = '';

    if (nivel === 'IT_SUPPORT') {
        menuItems = `
            <a href="dashboard.html"><i class="fas fa-tools"></i> Suporte</a>
            <a href="usuarios.html"><i class="fas fa-users"></i> Gerenciar Usuários</a>
            <a href="configuracoes.html"><i class="fas fa-cogs"></i> Configurações</a>
        `;
    } else if (nivel === 'ADMIN') {
        menuItems = `
            <a href="dashboard.html"><i class="fas fa-tachometer-alt"></i> Painel</a>
            <a href="empresa.html"><i class="fas fa-building"></i> Empresa</a>
            <a href="relatorios.html"><i class="fas fa-chart-bar"></i> Relatórios</a>
        `;
    } else if (nivel === 'FUNCIONARIO') {
        menuItems = `
            <a href="dashboard_funcionario.html"><i class="fas fa-clock"></i> Meu Ponto</a>
            <a href="perfil.html"><i class="fas fa-user"></i> Meu Perfil</a>
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
