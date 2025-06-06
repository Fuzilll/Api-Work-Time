const nodemailer = require('nodemailer');
const { AppError } = require('../errors');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Configuração mais robusta do transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        // Apenas para desenvolvimento - remova em produção
        rejectUnauthorized: false
      }
      ,
      debug: true, // Habilita logs detalhados
      logger: true  // Habilita logs no console
    });

    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Serviço de email configurado e pronto');
    } catch (error) {
      console.error('❌ Falha na configuração do email:', error);
      if (error.code === 'ECONNECTION') {
        console.error('Verifique:');
        console.error('- Serviço SMTP está online');
        console.error('- Host e porta corretos');
        console.error('- Firewall permite conexões na porta SMTP');
      } else if (error.code === 'EAUTH') {
        console.error('Erro de autenticação - verifique usuário e senha');
      }
    }
  }

  async enviarEmailRegistroPonto(destinatario, dados) {
    try {
      // Verifica se o email está habilitado
      if (process.env.EMAIL_ENABLED !== 'true') {
        console.log('Serviço de email desabilitado (EMAIL_ENABLED=false)');
        return;
      }

      // Verifica se há um destinatário válido
      if (!destinatario) {
        console.warn('Tentativa de enviar email sem destinatário');
        return;
      }

      // Carrega o template
      const templatePath = path.join(__dirname, '../templates/email/email-registro-ponto.hbs');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);

      // Formata a data
      const dataFormatada = new Date(dados.dataHora).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const html = template({
        ...dados,
        dataHora: dataFormatada,
        empresa: dados.empresa || 'Work Time System',
        year: new Date().getFullYear()
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: destinatario,
        subject: `Registro de Ponto - ${dados.tipo}`,
        html: html,
        text: `Olá ${dados.nome},\n\nSeu registro de ${dados.tipo} foi realizado com sucesso em ${dataFormatada}.\n\nDispositivo: ${dados.dispositivo}\n\nAtenciosamente,\nEquipe ${dados.empresa || 'Work Time'}`,
        priority: 'normal'
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado para ${destinatario}`, info.messageId);
      return info;
    } catch (error) {
      console.error('Erro ao enviar email:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response
      });
    }
  }

  async enviarEmailRecuperacaoSenha(destinatario, dados) {
    try {
      // Verifica se o email está habilitado
      if (process.env.EMAIL_ENABLED !== 'true') {
        console.log('Serviço de email desabilitado (EMAIL_ENABLED=false)');
        return;
      }

      // Verifica se há um destinatário válido
      if (!destinatario) {
        console.warn('Tentativa de enviar email sem destinatário');
        return;
      }

      // Carrega o template
      const templatePath = path.join(__dirname, '../templates/email/email-recuperacao-senha.hbs');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);

      const html = template({
        ...dados,
        empresa: dados.empresa || 'Work Time System',
        year: new Date().getFullYear()
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: destinatario,
        subject: `Recuperação de Senha - ${dados.empresa || 'Work Time System'}`,
        html: html,
        text: `Olá ${dados.nome},\n\nRecebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha:\n\n${dados.resetUrl}\n\nEste link expirará em ${dados.expiracao}.\n\nSe você não solicitou esta alteração, por favor ignore este email.\n\nAtenciosamente,\nEquipe ${dados.empresa || 'Work Time'}`,
        priority: 'high' // Prioridade alta para emails de recuperação
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de recuperação enviado para ${destinatario}`, info.messageId);
      return info;
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response
      });
      throw new AppError('Falha ao enviar email de recuperação', 500);
    }
  }
}

module.exports = new EmailService();