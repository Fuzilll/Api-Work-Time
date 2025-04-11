import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Para cookies de sessão
});


// Interceptar respostas para tratamento global de erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirecionar para login se não autorizado
      window.location = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;