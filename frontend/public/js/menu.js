document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const menu = document.getElementById('menu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    let menuItems = '';
    switch (userData.nivel) {
        case 'ADMIN':
            menuItems = `
                <a href="dashboard_admin.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a>
                <a href="cadastrar_funcionarios.html"><i class="fas fa-users"></i><span>Funcionários</span></a>
                <a href="gerenciar_pontos.html"><i class="fa fa-hourglass" aria-hidden="true"></i><span>Registros de Ponto</span></a>
                <a href="fechamento_coletivo.html"><i class="fas fa-clipboard-check"></i><span>Fechamentos de Ponto</span></a>
                <a href="fechamento_aprovacao.html"><i class="fas fa-check-circle"></i><span>Aprovar Fechamentos</span></a>
                <a href="solicitacoes-alteracao-ponto.html"><i class="fas fa-calendar"></i><span>Alterações de Ponto</span></a>
                <a href="gerenciar_funcionarios.html"><i class="fas fa-users-cog fa-lg mr-2"></i><span>Gerenciar Funcionários</span></a>
                <a href="pagina_suporte_usuarios.html"><i class="fas fa-question-circle fa-lg mr-2"></i><span>Central de Suporte</span></a>
                <a href="relatorio_de_pontos.html"><i class="fas fa-user-clock"></i><span>Relatórios</span></a>
            `;
            break;
        case 'FUNCIONARIO':
            menuItems = `
                <a href="dashboard_funcionario.html"><i class="fas fa-tachometer-alt"></i><span>Meu Dashboard</span></a>
                <a href="historico_pontos_funcionario.html"><i class="fas fa-clock"></i><span>Meus Registros</span></a>
                <a href="perfil_funcionario.html"><i class="fas fa-user"></i><span>Meu Perfil</span></a>
                <a href="pagina_suporte_usuarios.html"><i class="fas fa-question-circle"></i><span>Central de Suporte</span></a>
            `;
            break;
        case 'IT_SUPPORT':
            menuItems = `
                <a href="it_suport.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a>
                <a href="cadastrar_empresas.html"><i class="fas fa-building"></i><span>Cadastrar Empresas</span></a>
                <a href="gerenciar_empresas.html"><i class="fas fa-users-cog"></i><span>Gerenciar Empresas</span></a>
                <a href="atender-chamado.html"><i class="fa fa-cog" aria-hidden="true"></i><span>Atender Chamado</span></a>
             `;
            break;
    }

    if (menu) menu.innerHTML = menuItems;
    if (mobileMenu) mobileMenu.innerHTML = menuItems + `<a href="#" id="logoutBtnMobile"><i class="fas fa-sign-out-alt"></i><span>Sair</span></a>`;

    // Configurar logout para ambas as versões
    const setupLogout = (btnId) => {
        const btn = document.getElementById(btnId);
        btn?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await AuthService.logout();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erro durante logout:', error);
                window.location.href = 'login.html';
            }
        });
    };

    setupLogout('logoutBtn');
    setupLogout('logoutBtnMobile');
});