/**
 * Módulo principal da aplicação frontend
 * Responsável por gerenciar eventos, modais, formulários e navegação
 */
class LandingPage {
	constructor() {
	  this.timeoutId = null;
	  this.isTop = false;
	  this.lastCheck = null;
	  this.alreadyOpenFromLeave = false;
	  this.timeoutOpenModal = null;
	  this.zendeskIntervalId = null;
	  this.API_BASE_URL = 'http://localhost:3001'; // Base URL da sua API local
  
	  // Inicializa os listeners quando o DOM estiver pronto
	  if (document.readyState !== 'loading') {
		this.init();
	  } else {
		document.addEventListener('DOMContentLoaded', () => this.init());
	  }
	}
  
	/**
	 * Inicializa a aplicação
	 */
	init() {
	  this.pingFromEmail();
	  this.logLandingPageUrl();
	  
	  // Configura listeners de eventos
	  this.setupEventListeners();
	  
	  // Inicializa integrações de terceiros
	  setTimeout(() => this.chatInit(), 1000);
	  
	  // Configura intervalos para verificações contínuas
	  setInterval(() => this.scrollCheck(), 200);
	  setInterval(() => this.checkIsChatActive(), 2000);
	  
	  // Verificação inicial
	  this.scrollCheck();
	  
	  // Configura intervalos para animações
	  if (this.getElement('.subscribe-steps')) {
		setInterval(() => this.changeSteps(), 1000);
	  }
	  
	  if (this.getElement('.customers-kind')) {
		setInterval(() => this.changeCustomerKind(), 1000);
	  }
	}
  
	/**
	 * Configura todos os listeners de eventos
	 */
	setupEventListeners() {
	  // Navegação
	  document.getElementById('link-pricing')?.addEventListener('click', () => this.goTo('pricing'));
	  document.getElementById('link-features')?.addEventListener('click', () => this.goTo('features'));
	  
	  // Modal
	  document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
	  document.querySelector('.modal-overlay')?.addEventListener('click', (e) => this.handleClick(e));
	  
	  // Menu mobile
	  document.querySelector('.mobile-menu')?.addEventListener('click', () => this.openMenu());
	  document.querySelector('.mobile-menu-overlay')?.addEventListener('click', () => this.closeMenu());
	  
	  // Formulários
	  document.getElementById('form-join')?.addEventListener('submit', (e) => this.handleSubmit(e));
	  document.getElementById('form-demo')?.addEventListener('submit', (e) => this.handleDemoSubmit(e));
	  document.getElementById('form-landing')?.addEventListener('submit', (e) => this.handleSubscribeSubmit(e));
	  document.getElementById('form-contact')?.addEventListener('submit', (e) => this.handleContactSubmit(e));
	  
	  // Links para modais
	  document.querySelector('strong.link-to-join')?.addEventListener('click', () => this.changeToJoin());
	  document.querySelector('strong.link-to-demo')?.addEventListener('click', () => this.changeToCall());
	  document.querySelector('.modal-choose-row.link-to-join')?.addEventListener('click', () => this.changeToJoin());
	  document.querySelector('.modal-choose-row.link-to-demo')?.addEventListener('click', () => this.changeToCall());
	  
	  // Máscara de telefone
	  document.querySelectorAll('.input-text.phone').forEach(node => {
		node.addEventListener('input', (e) => this.handlePhoneMask(e));
	  });
	  
	  // Eventos globais
	  document.addEventListener('keyup', (e) => this.handleKeyPress(e));
	  document.querySelector('body')?.addEventListener('mouseleave', () => this.openModalFromLeave());
	  
	  // Abre modal após timeout
	  if (this.getElement('.modal-overlay')) {
		this.timeoutOpenModal = setTimeout(() => this.openModal(), 20000);
	  }
	}
  
	// ========== FUNÇÕES AUXILIARES ==========
	
	/**
	 * Retorna um elemento do DOM
	 * @param {string} selector - Seletor CSS
	 * @returns {HTMLElement|null} Elemento encontrado ou null
	 */
	getElement(selector) {
	  return document.querySelector(selector);
	}
  
	/**
	 * Verifica se um elemento está oculto
	 * @param {HTMLElement} element - Elemento a ser verificado
	 * @returns {boolean} True se o elemento estiver oculto
	 */
	isHiddenElement(element) {
	  return element.style.opacity === '0';
	}
  
	// ========== MANIPULAÇÃO DO MENU MOBILE ==========
	
	closeMenu() {
	  this.getElement('.header')?.classList.remove('mobile-menu-opened');
	}
  
	openMenu() {
	  this.getElement('.header')?.classList.add('mobile-menu-opened');
	}
  
	// ========== NAVEGAÇÃO ==========
	
	/**
	 * Rola a página até uma seção específica
	 * @param {string} id - ID da seção para navegar
	 */
	goTo(id) {
	  const offset = id === 'features' ? 80 : 50;
	  const section = this.getElement(`section.${id}`);
	  
	  if (section) {
		this.closeMenu();
		window.scrollTo({
		  top: section.offsetTop - offset,
		  behavior: 'smooth'
		});
	  }
	}
  
	// ========== MANIPULAÇÃO DE MODAIS ==========
	
	handleClick(e) {
	  if (e.target.className?.includes('modal-overlay show')) {
		this.closeModal();
	  }
	}
  
	openModalFromLeave() {
	  if (this.alreadyOpenFromLeave) return;
	  this.alreadyOpenFromLeave = true;
	  this.openModal();
	}
  
	openModal() {
	  clearTimeout(this.timeoutId);
	  clearTimeout(this.timeoutOpenModal);
	  this.getElement('.modal-overlay')?.classList.add('show');
	  this.getElement('body')?.classList.add('overflow');
	}
  
	closeModal() {
	  const modalOverlay = this.getElement('.modal-overlay');
	  if (!modalOverlay) return;
	  
	  modalOverlay.classList.remove('show');
	  this.getElement('body')?.classList.remove('overflow');
	  this.getElement('.modal-choose')?.classList.remove('dnone');
	  this.getElement('#form-demo')?.classList.add('dnone');
	  this.getElement('#form-join')?.classList.add('dnone');
	}
  
	changeToCall() {
	  this.getElement('.modal-choose')?.classList.add('dnone');
	  this.getElement('#form-demo')?.classList.remove('dnone');
	}
  
	changeToJoin() {
	  this.getElement('.modal-choose')?.classList.add('dnone');
	  this.getElement('#form-join')?.classList.remove('dnone');
	}
  
	handleKeyPress(e) {
	  if (e.key === 'Escape') {
		this.closeModal();
	  }
	}
  
	// ========== ANIMAÇÕES ==========
	
	changeSteps() {
	  const active = this.getElement('.subscribe-steps.active');
	  if (!active) return;
  
	  const steps = {
		'one': 'two',
		'two': 'three',
		'three': 'four',
		'four': 'one'
	  };
  
	  const currentStep = Object.keys(steps).find(step => active.classList.contains(step));
	  if (currentStep) {
		this.getElement(`.subscribe-steps.${steps[currentStep]}`)?.classList.add('active');
		active.classList.remove('active');
	  }
	}
  
	changeCustomerKind() {
	  const active = this.getElement('.customer-kind.active');
	  if (!active) return;
  
	  const kinds = {
		'one': 'two',
		'two': 'three',
		'three': 'four',
		'four': 'five',
		'five': 'one'
	  };
  
	  const currentKind = Object.keys(kinds).find(kind => active.classList.contains(kind));
	  if (currentKind) {
		this.getElement(`.customer-kind.${kinds[currentKind]}`)?.classList.add('active');
		active.classList.remove('active');
	  }
	}
  
	// ========== FORMULÁRIOS ==========
	
	handleSubmit(e) {
	  e.preventDefault();
	  const formElement = this.getElement('#form-join');
	  const parentElement = this.getElement('.modal-overlay');
	  this.continueSubmit(formElement, parentElement, 'NAV');
	}
  
	handleSubscribeSubmit(e) {
	  e.preventDefault();
	  const formElement = this.getElement('#form-landing');
	  const parentElement = this.getElement('.subscribe-form');
	  this.continueSubmit(formElement, parentElement, 'BODY');
	}
  
	handleDemoSubmit(e) {
	  e.preventDefault();
	  this.continueDemoSubmit();
	}
  
	handleContactSubmit(e) {
	  e.preventDefault();
	  this.continueContactSubmit();
	}
  
	resetForm() {
	  const formElement = this.getElement('#form-contact');
	  if (!formElement) return;
	  
	  formElement.reset();
	}
  
	handlePhoneMask(e) {
	  let x;
	  const value = e.target.value.replace(/\D/g, '');
  
	  if (value.length >= 15) {
		x = value.match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
	  } else {
		x = value.match(/(\d{0,2})(\d{0,4})(\d{0,4})/);
	  }
  
	  e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? `-${x[3]}` : ''}`;
	}
  
	// ========== LÓGICA DE FORMULÁRIOS ==========
	
	continueSubmit(formElement, parentElement, from) {
	  if (!formElement || !parentElement) return;
  
	  const formData = new URLSearchParams();
	  const hash = `${btoa(formElement.elements.email.value)}@@@${btoa(formElement.elements.password.value)}`;
  
	  formData.append('name', formElement.elements.name.value);
	  formData.append('email', formElement.elements.email.value);
	  formData.append('password', formElement.elements.password.value);
	  formData.append('phone', formElement.elements.phone.value);
	  formData.append('joined_from', this.getJoinedFrom(from));
	  formData.append('href', window.location.href);
  
	  const trackingId = this.getTrackingId();
	  if (trackingId) {
		formData.append('tracking_id', trackingId);
	  }
  
	  this.sendRegisterRequest(formData, parentElement, hash);
	}
  
	continueDemoSubmit() {
	  const formElement = this.getElement('#form-demo');
	  if (!formElement) return;
  
	  const formData = new URLSearchParams();
	  formData.append('product', 'PONTOSIMPLES');
	  formData.append('type', 'PRESENTATION');
	  formData.append('name', formElement.elements.name.value);
	  formData.append('email', formElement.elements.email.value);
	  formData.append('phone', formElement.elements.phone.value);
  
	  this.sendDemoRequest(formData);
	}
  
	continueContactSubmit() {
	  const formElement = this.getElement('#form-contact');
	  if (!formElement) return;
  
	  const formData = new URLSearchParams();
	  formData.append('product', 'PONTOSIMPLES');
	  formData.append('type', 'CONTACT');
	  formData.append('name', formElement.elements.name.value);
	  formData.append('email', formElement.elements.email.value);
	  formData.append('subject', formElement.elements.subject.value);
	  formData.append('text', formElement.elements.message.value);
  
	  this.sendContactRequest(formData);
	}
  
	// ========== REQUISIÇÕES HTTP ==========
	
	sendRegisterRequest(formData, parentElement, hash) {
	  parentElement.classList.add('loading');
	  
	  fetch(`${this.API_BASE_URL}/api/auth/register`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: formData
	  })
	  .then(response => response.json())
	  .then(data => {
		if (data.status === 'success') {
		  alert('Registrado com sucesso!');
		  this.redirectToLogin(hash);
		} else if (data.code === 'EXIST_EMAIL') {
		  alert('Você já se cadastrou com esse email! Faça seu login ou recupere sua senha!');
		} else {
		  alert('Houve um erro, por favor tente novamente.');
		}
	  })
	  .catch(error => {
		console.error('Error:', error);
		alert('Houve um erro, por favor tente novamente.');
	  })
	  .finally(() => {
		parentElement.classList.remove('loading');
	  });
	}
  
	sendDemoRequest(formData) {
	  fetch(`${this.API_BASE_URL}/api/email/demo`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: formData
	  })
	  .then(response => response.json())
	  .then(data => {
		if (data.status === 'success') {
		  alert('Recebemos com sucesso! Em breve entraremos em contato!');
		  this.closeModal();
		} else {
		  alert('Houve um erro, por favor tente novamente.');
		}
	  })
	  .catch(error => {
		console.error('Error:', error);
		alert('Houve um erro, por favor tente novamente.');
	  });
	}
  
	sendContactRequest(formData) {
	  fetch(`${this.API_BASE_URL}/api/email/contact`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: formData
	  })
	  .then(response => response.json())
	  .then(data => {
		if (data.status === 'success') {
		  alert('Enviado com sucesso!');
		  this.resetForm();
		} else {
		  alert('Houve um erro, por favor tente novamente.');
		}
	  })
	  .catch(error => {
		console.error('Error:', error);
		alert('Houve um erro, por favor tente novamente.');
	  });
	}
  
	// ========== REDIRECIONAMENTOS ==========
	
	redirectToLogin(hash) {
	  window.location.href = `${this.API_BASE_URL}/login.html#signup=${hash}`;
	}
  
	// ========== INTEGRAÇÕES ==========
	
	chatInit() {
	  if (!window.zChat) return;
  
	  window.zChat.init({
		suppress_console_error: true,
		account_key: window.atob('U2llcHY2MmVFZDkxR0UxcWpxOFZ1Q2VJT0NLNnFtY1U='),
	  });
  
	  window.zChat.on('connection_update', (status) => {
		console.log('connection_update', status);
		if (status === 'connected') {
		  window.zChat.addTag('Landing Page');
		}
	  });
	}
  
	checkIsChatActive() {
	  const chatElement = document.querySelector('iframe#launcher');
	  const whatsappElement = document.querySelector('.whatsapp-fixed');
  
	  if (!whatsappElement) {
		window.clearInterval(this.zendeskIntervalId);
		return;
	  }
  
	  if (chatElement && !this.isHiddenElement(chatElement)) {
		whatsappElement.classList.add('is-chat-active');
	  } else {
		whatsappElement.classList.remove('is-chat-active');
	  }
	}
  
	// ========== TRACKING E ANALYTICS ==========
	
	getJoinedFrom(from) {
	  const urlParams = new URLSearchParams(window.location.search);
	  let joinedFrom = 'LANDING';
  
	  if (urlParams.has('utm_medium') && urlParams.get('utm_medium') === 'cpc') {
		joinedFrom = 'GOOGLE-ADS';
	  } else if (urlParams.has('utm_campaign')) {
		const campaign = urlParams.get('utm_campaign');
		if (campaign === 'mobile-app-login-ios') {
		  joinedFrom = 'APP-IOS';
		} else if (campaign === 'mobile-app-login-android') {
		  joinedFrom = 'APP-ANDROID';
		}
	  }
  
	  return `${joinedFrom}-${from}`;
	}
  
	getTrackingId() {
	  const urlParams = new URLSearchParams(window.location.search);
	  let trackingId = urlParams.get('t');
  
	  if (!trackingId && window.localStorage.campaignId && window.localStorage.emailId) {
		trackingId = `${window.localStorage.campaignId}_${window.localStorage.emailId}`;
	  }
  
	  return trackingId || '';
	}
  
	pingFromEmail() {
	  const urlParams = new URLSearchParams(window.location.search);
	  const trackingParam = urlParams.get('t');
  
	  if (!trackingParam) {
		console.log('Nada a fazer - sem parâmetro de tracking');
		return;
	  }
  
	  const [campaignId, emailId] = trackingParam.split('_');
	  if (!campaignId || !emailId) {
		console.log('Nada a fazer - parâmetro de tracking inválido');
		return;
	  }
  
	  window.localStorage.setItem('campaignId', campaignId);
	  window.localStorage.setItem('emailId', emailId);
  
	  fetch(`${this.API_BASE_URL}/api/campaign-feedback/click?campaign_id=${campaignId}&email_id=${emailId}`)
		.then(response => response.json())
		.then(data => {
		  if (data.status === 'success') {
			console.log('Ping com sucesso!');
		  }
		})
		.catch(error => console.error('Erro no ping:', error));
	}
  
	logLandingPageUrl() {
	  const formData = new URLSearchParams();
	  formData.append('data', btoa(window.location.href));
  
	  if (document.referrer) {
		formData.append('referrer', document.referrer);
	  }
  
	  fetch(`${this.API_BASE_URL}/api/landing-page`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: formData
	  }).catch(error => console.error('Erro ao logar URL:', error));
	}
  
	// ========== SCROLL HANDLING ==========
	
	scrollCheck() {
	  const currentOffset = window.pageYOffset;
	  
	  if (currentOffset === this.lastCheck) return;
	  this.lastCheck = currentOffset;
  
	  if (!currentOffset && this.isTop) return;
  
	  if (currentOffset > 3500) {
		this.openModalFromLeave();
	  }
  
	  const headerNav = this.getElement('.header-nav');
	  if (!headerNav) return;
  
	  if (currentOffset && !this.isTop) {
		headerNav.classList.add('fixed');
		return;
	  }
  
	  if (!currentOffset && !this.isTop) {
		this.isTop = true;
		headerNav.classList.remove('fixed');
		return;
	  }
  
	  if (currentOffset && this.isTop) {
		this.isTop = false;
		headerNav.classList.add('fixed');
	  }
	}
  }
  
  // Inicializa a aplicação quando o script for carregado
  new LandingPage();