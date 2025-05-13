document.addEventListener('DOMContentLoaded', function () {
    const savedMode = localStorage.getItem('themeMode') || 'light';
    document.body.classList.add(savedMode + '-mode');

    // Cria o toggle switch de tema
    const themeSwitch = document.createElement('label');
    themeSwitch.className = 'theme-switch';
    themeSwitch.innerHTML = `
        <input type="checkbox" id="themeToggle">
        <span class="slider round"></span>
    `;

    const topbar = document.querySelector('.topbar');
    if (topbar) {
        // Remove qualquer botão de ajuda existente
        const helpBtn = topbar.querySelector('.help-btn');
        if (helpBtn) {
            helpBtn.remove();
        }

        // Evita adicionar o botão mais de uma vez
        if (!topbar.querySelector('.theme-switch')) {
            topbar.appendChild(themeSwitch);
        }
    }

    // Configura o estado inicial do toggle
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.checked = savedMode === 'dark';

        toggle.addEventListener('change', function () {
            document.body.classList.toggle('dark-mode', this.checked);
            document.body.classList.toggle('light-mode', !this.checked);
            localStorage.setItem('themeMode', this.checked ? 'dark' : 'light');
        });
    }
});
