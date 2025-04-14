document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
  
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('closed');
  
      if (sidebar.classList.contains('closed')) {
        toggleBtn.src = '/images/abrir.png';
      } else {
        toggleBtn.src = '/images/fechar.png';
      }
    });
  });
  