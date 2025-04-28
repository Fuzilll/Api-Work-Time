document.addEventListener('DOMContentLoaded', function() {
    // Verifica o modo salvo no localStorage ou define como claro por padrão
    const savedMode = localStorage.getItem('themeMode') || 'light';
    document.body.classList.add(savedMode + '-mode');
    
    // Configura o toggle switch
    const themeSwitch = document.createElement('label');
    themeSwitch.className = 'theme-switch';
    themeSwitch.innerHTML = `
        <input type="checkbox" id="themeToggle">
        <span class="slider round"></span>
    `;
    
    // Adiciona o switch à topbar (substitui o botão de ajuda)
    const helpBtn = document.querySelector('.help-btn');
    if (helpBtn) {
        helpBtn.parentNode.replaceChild(themeSwitch, helpBtn);
    } else {
        // Se não encontrar o botão de ajuda, adiciona no final da topbar
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            topbar.appendChild(themeSwitch);
        }
    }
    
    // Define o estado inicial do toggle
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.checked = savedMode === 'dark';
        
        // Adiciona o evento de mudança
        toggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                localStorage.setItem('themeMode', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('themeMode', 'light');
            }
        });
    }
});