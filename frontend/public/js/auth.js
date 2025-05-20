const API_BASE = "http://localhost:3001/api";

// Função auxiliar para verificar se um token JWT expirou
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp && currentTime >= payload.exp;
    } catch (e) {
        console.error('Erro ao decodificar token:', e);
        return true;
    }
}

class AuthService {
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

    static redirectByUserLevel(level) {
        console.log('[REDIRECT] Nível recebido:', level);

        const pages = {
            'ADMIN': '/dashboard_admin.html',
            'FUNCIONARIO': '/dashboard_funcionario.html',
            'IT_SUPPORT': '/it_suport.html'
        };

        const targetPage = pages[level] || '/login.html';
        const currentPath = window.location.pathname;

        if (!currentPath.endsWith(targetPage)) {
            console.log('[REDIRECT] Redirecionando para:', targetPage);
            window.location.href = targetPage;
        } else {
            console.log('[REDIRECT] Já está na página correta');
        }
    }

    static async makeAuthRequest(url, method = 'GET', body = null) {
        const token = localStorage.getItem('authToken');

        if (!token || isTokenExpired(token)) {
            this.handleUnauthorized();
            return null;
        }

        try {
            const response = await fetch(`${API_BASE}${url}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : null,
                credentials: 'include'
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                if (response.status === 401 || text.includes('login')) {
                    this.handleUnauthorized();
                    return null;
                }
                throw new Error(`Resposta inválida: ${text.substring(0, 100)}`);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            if (error.message.includes('401')) {
                this.handleUnauthorized();
            }
            throw error;
        }
    }

    static handleUnauthorized() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }

    static checkAuth() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (!token || !userData || isTokenExpired(token)) {
            this.handleUnauthorized();
            return null;
        }

        return JSON.parse(userData);
    }

    static async logout() {
        try {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao fazer logout no servidor');
            }

            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro durante logout:', error);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }
}

// Integração com formulário de login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    await AuthService.login(email, senha);
});

// Verificação inicial de autenticação e redirecionamento correto
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    if (!currentPath.includes('login.html')) {
        const userData = AuthService.checkAuth();
        if (userData) {
            const expectedPath = {
                'ADMIN': '/dashboard_admin.html',
                'FUNCIONARIO': '/dashboard_funcionario.html',
                'IT_SUPPORT': '/it_suport.html'
            }[userData.nivel];

            if (!currentPath.endsWith(expectedPath)) {
                AuthService.redirectByUserLevel(userData.nivel);
            }
        }
    }
});
