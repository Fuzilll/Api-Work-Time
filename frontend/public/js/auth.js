document.getElementById('loginForm').addEventListener('submit', async (event) => { 
    event.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    
    try {
        const response = await fetch('/api/usuarios/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();
        console.log('Resposta do backend:', data); 

        if (response.ok) {
            localStorage.setItem('nivel', data.nivel);
            
            if (data.nivel === 'IT_SUPPORT') {
                window.location.href = 'it_suport.html';
            } else if (data.nivel === 'ADMIN') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert('Login falhou: ' + (data.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao conectar com o servidor.');
    }
});
