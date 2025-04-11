const db = require('./config/db');

async function testPermissions(userId) {
    try {
        const [admin] = await db.query(
            `SELECT permissoes FROM ADMIN WHERE id_usuario = ?`, 
            [userId]
        );
        
        if (!admin) {
            console.log('Usuário não é admin');
            return;
        }

        const permissoes = JSON.parse(admin.permissoes);
        console.log('Permissões encontradas:', permissoes);

        // Teste das permissões críticas
        const requiredPermissions = [
            'visualizar_relatorios',
            'cadastrar_funcionario',
            'aprovar_pontos'
        ];

        requiredPermissions.forEach(perm => {
            console.log(`${perm}: ${permissoes[perm] ? '✅' : '❌'}`);
        });

    } catch (err) {
        console.error('Erro no teste:', err);
    } finally {
        db.end();
    }
}

// Execute com o ID do usuário admin
testPermissions(5); // Substitua pelo ID correto