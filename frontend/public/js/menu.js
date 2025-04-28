document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const menu = document.getElementById('menu');
    let menuItems = '';

    switch (userData.nivel) {
        case 'ADMIN':
            menuItems = `
                <a href="dashboard_admin.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a>
                <a href="cadastrar_funcionarios.html"><i class="fas fa-users"></i><span>Funcionários</span></a>
                <a href="gerenciar_pontos.html"><i class="fas fa-clock"></i><span>Registros de Ponto</span></a>
                <a href="pagina_suporte_usuarios.html" class="d-flex align-items-center"><i class="fas fa-users-cog fa-lg mr-2"></i><span>Central de Suporte</span></a>

            `;
            break;

        case 'FUNCIONARIO':
            menuItems = `
                <a href="dashboard_funcionario.html"><i class="fas fa-tachometer-alt"></i><span>Meu Dashboard</span></a>
                <a href="historico_pontos_funcionario.html"><i class="fas fa-clock"></i><span>Meus Registros</span></a>
                <a href="perfil_funcionario.html"><i class="fas fa-user"></i><span>Meu Perfil</span></a>
                <a href="pagina_suporte_usuarios.html" class="d-flex align-items-center"><i class="fas fa-users-cog fa-lg mr-2"></i><span>Central de Suporte</span></a>
            `;
            break;

        case 'IT_SUPPORT':
            menuItems = `
                <a href="it_suport.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a>
                <a href="cadastrar_empresas.html"><i class="fas fa-building"></i><span>Cadastrar Empresas</span></a>
                <a href="gerenciar_empresas.html"><i class="fas fa-users-cog"></i><span>Gerenciar Empresas</span></a>
            `;
            break;
    }

    menu.innerHTML = menuItems;

    // Adiciona handler para o botão de logout
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await AuthService.logout();
        } catch (error) {
            console.error('Erro durante logout:', error);
            // Força logout mesmo com erro
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
});
