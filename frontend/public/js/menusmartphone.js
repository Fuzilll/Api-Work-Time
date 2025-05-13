document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) return;

    const mobileMenu = document.getElementById('mobileMenu');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.style.display = 'none'; // Oculta botão de colapso lateral no mobile

    let menuItems = '';
    switch (userData.nivel) {
        case 'ADMIN':
            menuItems = `
                <a href="dashboard_admin.html">Dashboard</a>
                <a href="cadastrar_funcionarios.html">Funcionários</a>
                <a href="gerenciar_pontos.html">Registros de Ponto</a>
                <a href="solicitacoes-alteracao-ponto.html">Alterações de Ponto</a>
                <a href="gerenciar_funcionarios.html">Gerenciar Funcionários</a>
                <a href="pagina_suporte_usuarios.html">Central de Suporte</a>
            `;
            break;
        case 'FUNCIONARIO':
            menuItems = `
                <a href="dashboard_funcionario.html">Meu Dashboard</a>
                <a href="historico_pontos_funcionario.html">Meus Registros</a>
                <a href="perfil_funcionario.html">Meu Perfil</a>
                <a href="pagina_suporte_usuarios.html">Central de Suporte</a>
            `;
            break;
        case 'IT_SUPPORT':
            menuItems = `
                <a href="it_suport.html">Dashboard</a>
                <a href="cadastrar_empresas.html">Cadastrar Empresas</a>
                <a href="gerenciar_empresas.html">Gerenciar Empresas</a>
                <a href="atender-chamado.html">Atender Chamado</a>
            `;
            break;
    }

    mobileMenu.innerHTML = `
        <div class="mobile-menu-content">
            ${menuItems}
            <a href="#" id="mobileLogout">Sair</a>
        </div>
    `;

    // Ação de logout no mobile
    const logoutLink = document.getElementById('mobileLogout');
    logoutLink?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await AuthService.logout();
        } catch (e) {
            console.error('Erro no logout:', e);
        } finally {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    });

    // Controle de abertura do menu mobile
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    hamburgerBtn?.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

document.getElementById('toggle-menu').addEventListener('click', function () {
  document.getElementById('sidebar').classList.toggle('active');
});

});
