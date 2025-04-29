const nodemailer = require('nodemailer');
const { AppError } = require('../errors');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Verificar se email está habilitado
    if (process.env.EMAIL_ENABLED === 'false') {
      console.log('⚠️  Serviço de email desativado (modo desenvolvimento)');
      return;
    }

    
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    this.verifyConnection();
  }

  async verifyConnection() {
    // Pular verificação se email estiver desativado
    if (process.env.EMAIL_ENABLED === 'false') return;

    try {
      await this.transporter.verify();
      console.log('✅ Serviço de email configurado com sucesso');
    } catch (err) {
      console.error('❌ Falha na configuração do email:', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Serviço de email não configurado corretamente', 500);
      }
    }
  }

  async enviarEmailRecuperacao(email, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/resetar-senha?token=${token}`;
      
      // Carregar template HTML
      const templatePath = path.join(__dirname, '../templates/email/recuperacaoSenha.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      
      const html = template({
        nome: 'Usuário', // Pode ser personalizado buscando do banco
        resetUrl,
        expiracao: '1 hora' // Pode ser dinâmico baseado nas configurações
      });

      const mailOptions = {
        from: `"Work Time System" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Recuperação de Senha - Work Time',
        html,
        text: `Para resetar sua senha, acesse o link: ${resetUrl}\n\nO link expira em 1 hora.`
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email de recuperação enviado para: ${email}`);
    } catch (err) {
      console.error('Erro ao enviar email de recuperação:', err);
      throw new AppError('Falha ao enviar email de recuperação', 500);
    }
  }

  async enviarEmailConfirmacaoCadastro(email, nome) {
    try {
      const loginUrl = `${process.env.FRONTEND_URL}/login`;
      
      const templatePath = path.join(__dirname, '../templates/email/confirmacaoCadastro.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      
      const html = template({
        nome,
        loginUrl
      });

      const mailOptions = {
        from: `"Work Time System" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Cadastro Realizado - Work Time',
        html,
        text: `Olá ${nome},\n\nSeu cadastro foi realizado com sucesso!\n\nAcesse o sistema: ${loginUrl}`
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email de confirmação enviado para: ${email}`);
    } catch (err) {
      console.error('Erro ao enviar email de confirmação:', err);
      throw new AppError('Falha ao enviar email de confirmação', 500);
    }
  }

  async enviarEmailNotificacaoPonto(email, dados) {
    try {
      const { nome, tipo, dataHora, status } = dados;
      
      const templatePath = path.join(__dirname, '../templates/email/notificacaoPonto.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      
      const html = template({
        nome,
        tipo,
        dataHora: new Date(dataHora).toLocaleString('pt-BR'),
        status
      });

      const mailOptions = {
        from: `"Work Time System" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Registro de Ponto ${status} - ${tipo}`,
        html,
        text: `Olá ${nome},\n\nSeu registro de ponto (${tipo}) foi ${status}.\n\nData/Hora: ${new Date(dataHora).toLocaleString('pt-BR')}`
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Notificação de ponto enviada para: ${email}`);
    } catch (err) {
      console.error('Erro ao enviar notificação de ponto:', err);
      throw new AppError('Falha ao enviar notificação de ponto', 500);
    }
  }
      /**
     * Envia email de notificação quando uma solicitação é respondida
     * @param {Object} data - Dados da solicitação
     */
      async enviarEmailRespostaSolicitacao(data) {
        try {
            const { nome_funcionario, email_funcionario, status, resposta_admin } = data;
            
            const mailOptions = {
                from: `"Sistema de Ponto" <${process.env.EMAIL_FROM}>`,
                to: email_funcionario,
                subject: `Sua solicitação de alteração de ponto foi ${status}`,
                html: `
                    <h1>Olá, ${nome_funcionario}!</h1>
                    <p>Sua solicitação de alteração de ponto foi <strong>${status.toLowerCase()}</strong>.</p>
                    ${resposta_admin ? `<p><strong>Resposta do administrador:</strong> ${resposta_admin}</p>` : ''}
                    <p>Acesse o sistema para mais detalhes.</p>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw new AppError('Erro ao enviar email de notificação', 500);
        }
    }

}

// Exportar uma instância singleton
module.exports = new EmailService();