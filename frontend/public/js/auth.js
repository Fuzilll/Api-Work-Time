// js/auth.js
const API_BASE = "http://localhost:3000/api";

class AuthService {
    /**
     * Realiza o login do usuário
     * @param {string} email - Email do usuário
     * @param {string} senha - Senha do usuário
     */
    static async login(email, senha) {
        console.log('[FRONTEND] Iniciando processo de login...');
        
        const loginButton = document.getElementById('loginButton');
        const loading = document.getElementById('loading');
        const errorElement = document.getElementById('login-error');

        try {
            loginButton.disabled = true;
            loading.style.display = 'inline-block';
            errorElement.style.display = 'none';

            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro no login');
            }

  
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.usuario));
            
            // Redireciona baseado no nível do usuário
            this.redirectByUserLevel(data.usuario.nivel);

        } catch (error) {
            console.error('[FRONTEND] Erro durante login:', error);
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        } finally {
            loginButton.disabled = false;
            loading.style.display = 'none';
        }
    }

    /**
 * Verifica se o redirecionamento é necessário
 * @returns {boolean} True se deve redirecionar
 */
    static redirectByUserLevel(level) {
        console.log('[REDIRECT] Nível recebido:', level);
        
        const pages = {
            'ADMIN': '/dashboard_admin.html',
            'FUNCIONARIO': '/dashboard.html',
            'IT_SUPPORT': '/it_suport.html'
        };
        
        const targetPage = pages[level] || '/login.html';
        console.log('[REDIRECT] Tentando acessar:', targetPage);

        // Verifica se já está na página correta
        if (window.location.pathname !== targetPage) {
            console.log('[REDIRECT] Redirecionando para:', targetPage);
            window.location.href = targetPage;
        } else {
            console.log('[REDIRECT] Já está na página correta');
        }
    }
    

    static async makeAuthRequest(url, method = 'GET', body = null) {
        const token = localStorage.getItem('authToken');

        try {
            const response = await fetch(`${API_BASE}${url}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (response.status === 401) {
                this.handleUnauthorized();
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    static handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }

    static checkAuth() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (!token || !userData) {
            this.handleUnauthorized();
            return null;
        }

        return JSON.parse(userData);
    }

    static async logout() {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } finally {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
}

// Integração com o formulário de login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    await AuthService.login(email, senha);
});

// Verificação inicial de autenticação
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html')) {
        const userData = AuthService.checkAuth();
        if (userData) {
            AuthService.redirectByUserLevel(userData.nivel);
        }
    }
});