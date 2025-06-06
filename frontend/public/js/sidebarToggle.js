// sidebarToggle.js atualizado
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleBtn');
  
  // Função para verificar o tamanho da tela
  function checkScreenSize() {
    if (window.innerWidth <= 992) {
      sidebar.style.display = 'none';
    } else {
      sidebar.style.display = 'flex';
    }
  }
  
  // Verificar ao carregar
  checkScreenSize();
  
  // Verificar ao redimensionar
  window.addEventListener('resize', checkScreenSize);
  
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('closed');
    
    if (sidebar.classList.contains('closed')) {
      toggleBtn.src = '/assets/images/abrir.png';
    } else {
      toggleBtn.src = '/assets/images/fechar.png';
    }
  });
  
  // Menu Mobile Toggle
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu-items');
  const mobileMenuContainer = document.getElementById('mobileMenu');
  
  mobileMenuToggle?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
  
  // Copiar itens do menu para o mobile
  const mainMenu = document.getElementById('menu');
  if (mainMenu && mobileMenuContainer) {
    mobileMenuContainer.innerHTML = mainMenu.innerHTML;
    
    // Adicionar logout também
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      mobileMenuContainer.innerHTML += logoutBtn.outerHTML;
    }
    
    // Fechar menu ao clicar em um item
    mobileMenuContainer.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }
});