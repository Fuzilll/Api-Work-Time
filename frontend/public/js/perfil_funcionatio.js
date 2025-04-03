document.addEventListener('DOMContentLoaded', async () => {
    await carregarPerfilFuncionario();
});

async function carregarPerfilFuncionario() {
    const perfilDiv = document.getElementById('perfil');

    try {
        const response = await fetch('/api/funcionario/perfil', { method: 'GET' });
        const perfil = await response.json();

        if (!response.ok) {
            throw new Error(perfil.message || 'Erro ao carregar perfil');
        }

        perfilDiv.innerHTML = `
            <ul class="list-group">
                <li class="list-group-item"><strong>Nome:</strong> ${perfil.nome}</li>
                <li class="list-group-item"><strong>Email:</strong> ${perfil.email}</li>
                <li class="list-group-item"><strong>CPF:</strong> ${perfil.cpf}</li>
                <li class="list-group-item"><strong>Função:</strong> ${perfil.funcao}</li>
                <li class="list-group-item"><strong>Registro:</strong> ${perfil.registro_emp}</li>
                <li class="list-group-item"><strong>Data de Admissão:</strong> ${new Date(perfil.data_admissao).toLocaleDateString()}</li>
                <li class="list-group-item"><strong>Empresa:</strong> ${perfil.empresa_nome}</li>
            </ul>
        `;
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}