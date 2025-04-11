const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validators');
const dashboardSchema = require('../validators/dashboardSchema');

const dashboardController = new DashboardController();

router.use(authMiddleware.autenticacao);
router.use(authMiddleware.verificarNivel('ADMIN'));

router.get('/', dashboardController.carregarDashboardAdmin.bind(dashboardController));

router.get('/estatisticas-mensais',
  validate(dashboardSchema.estatisticasMensais, 'query'),
  dashboardController.obterEstatisticasMensais.bind(dashboardController)
);

router.get('/funcionarios-pendentes',
  dashboardController.obterFuncionariosComPendentes.bind(dashboardController)
);

router.put('/registros/:id/status',
  validate(dashboardSchema.atualizarStatusPonto),
  dashboardController.atualizarStatusPonto.bind(dashboardController)
);

module.exports = router;
