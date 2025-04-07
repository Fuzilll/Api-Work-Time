
document.getElementById('loginForm').addEventListener('submit', async (event) => {  
    event.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    
    try {
        const response = await fetch('/api/usuarios/login', {
            method: 'POST',
            credentials: 'include', // Adicione isso
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();
        console.log('Resposta completa do backend:', data);

        if (response.ok) {
            // Armazenar dados no localStorage
            localStorage.setItem('nivel', data.usuario.nivel);
            localStorage.setItem('id_usuario', data.usuario.id);
            localStorage.setItem('nome_usuario', data.usuario.nome);
            localStorage.setItem('email_usuario', data.usuario.email);
            
            if (data.usuario.id_empresa) {
                localStorage.setItem('id_empresa', data.usuario.id_empresa);
            }

            // Redirecionamento baseado no nível
            switch(data.usuario.nivel) {
                case 'IT_SUPPORT':
                    window.location.href = 'it_suport.html';
                    break;
                case 'ADMIN':
                    window.location.href = 'dashboard.html';
                    break;
                case 'FUNCIONARIO':
                    window.location.href = 'dashboard.html';
                    break;
                default:
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