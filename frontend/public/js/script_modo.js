// script.js
const switchElement = document.getElementById('colorModeSwitch');

// Verifica o modo de cor atual no armazenamento local e aplica
if (localStorage.getItem('colorMode') === 'light') {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    switchElement.checked = true;
} else {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    switchElement.checked = false;
}

// Função para alternar entre os modos claro e escuro
switchElement.addEventListener('change', () => {
    if (switchElement.checked) {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        localStorage.setItem('colorMode', 'light');
    } else {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        localStorage.setItem('colorMode', 'dark');
    }
});
