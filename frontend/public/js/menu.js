// js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const menu = document.getElementById('menu');
    let menuItems = '';

    switch(userData.nivel) {
        case 'ADMIN':
            menuItems = `
                <a href="dashboard_admin.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="cadastrar_funcionarios.html"><i class="fas fa-users"></i> Funcionários</a>
                <a href="gerenciar_pontos.html"><i class="fas fa-clock"></i> Registros de Ponto</a>
                <a href="gerenciar_empresas.html"><i class="fas fa-building"></i> Empresas</a>
            `;
            break;
            
        case 'FUNCIONARIO':
            menuItems = `
                <a href="dashboard.html"><i class="fas fa-tachometer-alt"></i> Meu Dashboard</a>
                <a href="registros_ponto.html"><i class="fas fa-clock"></i> Meus Registros</a>
                <a href="perfil_funcionario.html"><i class="fas fa-user"></i> Meu Perfil</a>
            `;
            break;
            
        case 'IT_SUPPORT':
            menuItems = `
                <a href="it_support.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="gerenciar_empresas.html"><i class="fas fa-building"></i> Gerenciar Empresas</a>
                <a href="gerenciar_usuarios.html"><i class="fas fa-users-cog"></i> Gerenciar Usuários</a>
            `;
            break;
    }

    menu.innerHTML = menuItems;
});

// Função de logout
function logout() {
    if (confirm('Deseja realmente sair?')) {
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
        .then(() => window.location.href = '/login')
        .catch(() => exibirErro('Erro ao realizar logout.'));
    }
  }
  