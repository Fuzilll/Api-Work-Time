const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const usuarioSchema = require('../validators/usuarioSchema');

// **Rotas Públicas** - Não requerem autenticação para o acesso

// Rota para cadastrar um novo usuário - Valida os dados de cadastro e chama a função de cadastro no controlador
router.post('/cadastrar', 
  validate(usuarioSchema.cadastro),  // Valida o corpo da requisição com o schema de cadastro
  usuarioController.cadastrarUsuario  // Chama a função de cadastro no controlador
);


// Rota para solicitar recuperação de senha - Valida os dados de recuperação e chama a função correspondente no controlador
router.post('/recuperar-senha', 
  validate(usuarioSchema.recuperarSenha),  // Valida os dados de recuperação de senha
  usuarioController.solicitarRecuperacaoSenha  // Chama a função para iniciar o processo de recuperação
);

// Rota para resetar a senha - Valida os dados e chama a função para resetar a senha
router.post('/resetar-senha', 
  validate(usuarioSchema.resetarSenha),  // Valida os dados para resetar a senha
  usuarioController.resetarSenha        // Chama a função que efetua o reset da senha
);

// **Middleware de Autenticação** - Todas as rotas abaixo requerem autenticação do usuário
// Chama o middleware de autenticação para garantir que o usuário esteja autenticado
router.use(authMiddleware.autenticacao);

// **Rotas de Perfil do Usuário Autenticado**

router.route('/meu-perfil')
  .get(usuarioController.obterPerfil)
  .put(validate(usuarioSchema.atualizarPerfil), usuarioController.atualizarPerfil);
  
// Rota para alterar a senha do usuário autenticado - Valida os dados e chama a função de alterar a senha
router.put('/alterar-senha', 
  validate(usuarioSchema.alterarSenha),  // Valida os dados da nova senha
  usuarioController.alterarSenha        // Chama a função de alteração de senha
);

// **Rotas Exclusivas para IT Support** - Somente usuários com nível "IT_SUPPORT" e a permissão de "gerenciar_usuarios" podem acessar essas rotas

// Middleware para verificar se o usuário tem o nível "IT_SUPPORT" e permissão para gerenciar usuários
router.use(
  authMiddleware.verificarNivel('IT_SUPPORT'),  // Verifica se o usuário tem o nível "IT_SUPPORT"
  authMiddleware.verificarPermissao('gerenciar_usuarios')  // Verifica se o usuário tem a permissão necessária para gerenciar usuários
);

// **Rotas para Gerenciamento de Usuários por IT Support**

router.route('/')
  .get(usuarioController.listarUsuarios);  // Chama a função para listar todos os usuários (somente IT Support pode acessar)

router.route('/:id/status')
  .put(validate(usuarioSchema.alterarStatus), usuarioController.alterarStatusUsuario);  // Valida os dados para alterar o status e chama a função para alterar o status do usuário

// Exporta o roteador para ser usado na aplicação principal
module.exports = router;
