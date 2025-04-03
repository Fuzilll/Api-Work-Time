// Função para enviar os dados do formulário de cadastro
async function cadastrarFuncionario(event) {
    event.preventDefault();

    const formData = new FormData(document.querySelector("#form-cadastrar-funcionario"));
    const dados = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: formData.get('senha'),
        cpf: formData.get('cpf'),
        registro_emp: formData.get('registro_emp'),
        funcao: formData.get('funcao'),
        data_admissao: formData.get('data_admissao')
    };

    try {
        const response = await fetch('/api/empresas/cadastrar-funcionario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();

        if (response.ok) { 
            alert(result.message);
        } else {
            alert('Erro ao cadastrar funcionário: ' + (result.error || result.message));
        }
    } catch (error) {
        console.error('Erro ao cadastrar funcionário', error);
    }
}

// Adicionar o listener ao formulário
document.querySelector("#form-cadastrar-funcionario").addEventListener("submit", cadastrarFuncionario);
