function init() {
	var timeoutId;
	var isTop = false;
	var lastCheck;
	var alreadyOpenFromLeave = false;
	var timeoutOpenModal;

	function getElement(selector) {
		return document.querySelector(selector);
	}

	function closeMenu() {
		getElement('.header').classList.remove('mobile-menu-opened');
	}

	function openMenu() {
		getElement('.header').classList.add('mobile-menu-opened');
	}

	function gtag_report_conversion_join(url) {
		// var callback = function () {
		if (typeof (url) != 'undefined') {
			window.location = url;
		}
		// };
		// gtag('event', 'conversion', {
		// 	'send_to': 'AW-11318521581/0zhFCJr9u-4YEO3di5Uq',
		// 	'event_callback': callback
		// });
		return false;
	}

	function gtag_report_conversion_demo(url) {
		// var callback = function () {
		if (typeof (url) != 'undefined') {
			window.location = url;
		}
		// };
		// gtag('event', 'conversion', {
		// 	'send_to': 'AW-11318521581/y2XXCJf9u-4YEO3di5Uq',
		// 	'event_callback': callback
		// });
		return false;
	}

	function changeSteps() {
		var active = getElement('.subscribe-steps.active');

		if (active.classList.contains('one')) {
			getElement('.subscribe-steps.two').classList.add('active');
		}

		if (active.classList.contains('two')) {
			getElement('.subscribe-steps.three').classList.add('active');
		}

		if (active.classList.contains('three')) {
			getElement('.subscribe-steps.four').classList.add('active');
		}

		if (active.classList.contains('four')) {
			getElement('.subscribe-steps.one').classList.add('active');
		}

		active.classList.remove('active');
	}

	function changeCustomerKind() {
		var active = getElement('.customer-kind.active');

		if (active.classList.contains('one')) {
			getElement('.customer-kind.two').classList.add('active');
		}

		if (active.classList.contains('two')) {
			getElement('.customer-kind.three').classList.add('active');
		}

		if (active.classList.contains('three')) {
			getElement('.customer-kind.four').classList.add('active');
		}

		if (active.classList.contains('four')) {
			getElement('.customer-kind.five').classList.add('active');
		}

		if (active.classList.contains('five')) {
			getElement('.customer-kind.one').classList.add('active');
		}

		active.classList.remove('active');
	}

	function handleClick(e) {
		if (e.target.className && e.target.className.includes('modal-overlay show')) {
			closeModal();
		}
	}

	function handleSubmit(e) {
		var formElement = getElement('#form-join');
		var parentElement = getElement('.modal-overlay');

		e.preventDefault();
		continueSubmit(formElement, parentElement, 'NAV');
	}

	function handleSubscribeSubmit(e) {
		var formElement = getElement('#form-landing');
		var parentElement = getElement('.subscribe-form');

		e.preventDefault();
		continueSubmit(formElement, parentElement, 'BODY');
	}
	document.getElementById('link-pricing').addEventListener('click', function () {
		goTo('pricing');
	});

	document.getElementById('link-features').addEventListener('click', function () {
		goTo('features');
	});

	function goTo(section) {
		// lógica de navegação aqui
		console.log('Indo para:', section);
	}

	function getJoinedFrom(from) {
		var url = window.location.href;
		var joinedFrom = 'LANDING';

		url = url.split('?');
		url = url[1];

		if (url) {
			if (url.indexOf('utm_medium=cpc') !== -1) {
				joinedFrom = 'GOOGLE-ADS';
			} else if (url.indexOf('utm_campaign=mobile-app-login-ios') !== -1) {
				joinedFrom = 'APP-IOS';
			} else if (url.indexOf('utm_campaign=mobile-app-login-android') !== -1) {
				joinedFrom = 'APP-ANDROID';
			}
		}

		return joinedFrom + '-' + from;
	}

	function getTrackingId() {
		var url = window.location.href;

		url = url.split('?t=');
		url = url[1];

		if (!url && window.localStorage.campaignId && window.localStorage.emailId) {
			url = `${window.localStorage.campaignId}_${window.localStorage.emailId}`;
		}

		if (!url) {
			return '';
		}

		return url;
	}

	function chatInit() {
		if (window.zChat) {
			window.zChat.init({
				suppress_console_error: true,
				account_key: window.atob('U2llcHY2MmVFZDkxR0UxcWpxOFZ1Q2VJT0NLNnFtY1U='),
			});

			window.zChat.on('connection_update', function (status) {
				console.log('connection_update', status);
				if (status === 'connected') {
					window.zChat.addTag('Landing Page');
				}
			});
		}
	}

	function isHiddenElement(element) {
		return (element.style.opacity === '0');
	}

	function checkIsChatActive() {
		var chatElement = document.querySelector('iframe#launcher');
		var whatsappElement = document.querySelector('.whatsapp-fixed');

		if (whatsappElement && chatElement && !isHiddenElement(chatElement)) {
			whatsappElement.classList.add('is-chat-active');
		} else if (whatsappElement) {
			whatsappElement.classList.remove('is-chat-active');
		} else {
			window.clearInterval(this.zendeskIntervalId);
		}
	}

	function scollCheck() {
		if (window.pageYOffset === lastCheck) {
			return;
		}

		lastCheck = window.pageYOffset;

		if (!window.pageYOffset && isTop) {
			return;
		}

		if (window.pageYOffset > 3500) {
			openModalFromLeave();
		}

		if (window.pageYOffset && !isTop) {
			getElement('.header-nav').classList.add('fixed');
			return;
		}

		if (!window.pageYOffset && !isTop) {
			isTop = true;
			getElement('.header-nav').classList.remove('fixed');
			return;
		}

		if (window.pageYOffset && isTop) {
			isTop = false;
			getElement('.header-nav').classList.add('fixed');
			return;
		}
	}

	function continueSubmit(formElement, parentElement, from) {
		var formData = '';
		var hash = `${btoa(formElement.elements.email.value)}@@@${btoa(formElement.elements.password.value)}`;

		formData += 'name=' + formElement.elements.name.value;
		formData += '&email=' + formElement.elements.email.value;
		formData += '&password=' + formElement.elements.password.value;
		formData += '&phone=' + formElement.elements.phone.value;
		formData += '&joined_from=' + getJoinedFrom(from);
		formData += '&href=' + window.location.href;

		if (getTrackingId()) {
			formData += '&tracking_id=' + getTrackingId();
		}

		sendEmail(formData, parentElement, hash);
	}

	function sendEmail(formData, parentElement, hash) {
		var submitRequest = new XMLHttpRequest();

		parentElement.classList.add('loading');
		submitRequest.open('POST', 'https://app.pontosimples.com/api/register', true);
		submitRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		submitRequest.onload = function () {
			if (this.responseText === '{"status":"success"}') {
				alert('Registrado com successo!');
				setTimeout(() => redirectLogin(hash), 1);
				return;
			}

			if (this.responseText === '{"status":"error","code":"EXIST_EMAIL"}') {
				alert('Você já se cadastrou com esse email! Faça seu login ou recupere sua senha!');
				parentElement.classList.remove('loading');
				return;
			}

			alert('Houve um erro, por favor tente novamente.');
			parentElement.classList.remove('loading');
		};

		submitRequest.send(formData);
	}

	function redirectLogin(hash) {
		gtag_report_conversion_join(`https://app.pontosimples.com/login#signup=${hash}`);
	}

	function handleDemoSubmit(e) {
		e.preventDefault();
		continueDemoSubmit();
	}

	function continueDemoSubmit() {
		var formData = '';
		var formElement = getElement('#form-demo');

		formData += 'product=PONTOSIMPLES';
		formData += '&type=PRESENTATION';
		formData += '&name=' + formElement.elements.name.value;
		formData += '&email=' + formElement.elements.email.value;
		formData += '&phone=' + formElement.elements.phone.value;

		sendDemoEmail(formData);
	}

	function sendDemoEmail(formData) {
		var submitRequest = new XMLHttpRequest();

		submitRequest.open('POST', 'https://admin.digitalbits.com.br/api/lead-contact', true);
		submitRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		submitRequest.onload = function () {
			if (this.responseText === '{"status":"success"}') {
				gtag_report_conversion_demo();
				alert('Recebemos com sucesso! Em breve entraremos em contato!');
				closeModal();
			} else {
				alert('Houve um erro, por favor tente novamente.');
			}
		};

		submitRequest.send(formData);
	}

	function handleContactSubmit(e) {
		e.preventDefault();
		continueContactSubmit();
	}

	function continueContactSubmit() {
		var formData = '';
		var formElement = getElement('#form-contact');

		formData += 'product=PONTOSIMPLES';
		formData += '&type=CONTACT';
		formData += '&name=' + formElement.elements.name.value;
		formData += '&email=' + formElement.elements.email.value;
		formData += '&subject=' + formElement.elements.subject.value;
		formData += '&text=' + formElement.elements.message.value;

		sendContactEmail(formData);
	}

	function sendContactEmail(formData) {
		var submitRequest = new XMLHttpRequest();

		submitRequest.open('POST', 'https://admin.digitalbits.com.br/api/lead-contact', true);
		submitRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		submitRequest.onload = function () {
			if (this.responseText === '{"status":"success"}') {
				alert('Enviado com successo!');
				resetForm();
			} else {
				alert('Houve um erro, por favor tente novamente.');
			}
		};

		submitRequest.send(formData);
	}

	function pingFromEmail() {
		var submitRequest = new XMLHttpRequest();
		var url = window.location.href;

		url = url.split('?t=');
		url = url[1];

		if (!url) {
			console.log('nada a fazer');
			return;
		}

		url = url.split('_');

		if (!url[0] || !url[1]) {
			console.log('2 - nada a fazer', url);
			return;
		}

		window.localStorage.setItem('campaignId', url[0]);
		window.localStorage.setItem('emailId', url[1]);

		submitRequest.open('GET', `https://admin.digitalbits.com.br/api/campaign-feedback/click?campaign_id=${url[0]}&email_id=${url[1]}`, true);
		submitRequest.onload = function () {
			if (this.responseText === '{"status":"success"}') {
				console.log('ping com successo!');
			}
		};
		submitRequest.send();
	}

	function logLandingPageUrl() {
		const request = new XMLHttpRequest();
		let formData = 'data=' + btoa(window.location.href);

		if (document.referrer) {
			formData += '&referrer=' + document.referrer;
		}

		request.open('POST', 'https://app.w.com/api/landing-page', true);
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.send(formData);
	}

	document.addEventListener("DOMContentLoaded", function () {
		const closeBtn = document.getElementById("modal-close");

		if (closeBtn) {
			closeBtn.addEventListener("click", closeModal);
		}

		function closeModal() {
			// Lógica para fechar o modal
			const modal = document.querySelector(".modal");
			if (modal) {
				modal.style.display = "none"; // ou qualquer lógica que você use
			}
		}
	});



	function resetForm() {
		var formElement = getElement('#form-contact');

		formElement.elements.name.value = '';
		formElement.elements.email.value = '';
		formElement.elements.message.value = '';
	}

	function handlePhoneMask(e) {
		var x;

		if (e.target.value.length >= 15) {
			x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
		} else {
			x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,4})(\d{0,4})/);
		}

		e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
	}

	function goTo(id) {
		var offset = 50;

		if (id === 'features') {
			offset = 80;
		}

		closeMenu();
		window.scrollTo(0, getElement('section.' + id).offsetTop - offset);
	}

	function changeToCall() {
		getElement('.modal-choose').classList.add('dnone');
		getElement('#form-demo').classList.remove('dnone');
	}

	function changeToJoin() {
		getElement('.modal-choose').classList.add('dnone');
		getElement('#form-join').classList.remove('dnone');
	}

	function handleKeyPress(e) {
		if (e.keyCode === 27) {
			closeModal();
		}
	}

	function openModalFromLeave() {
		if (alreadyOpenFromLeave) {
			return;
		}

		alreadyOpenFromLeave = true;
		openModal();
	}

	function openModal() {
		clearTimeout(timeoutId);
		clearTimeout(timeoutOpenModal);
		// getElement('.modal-overlay').classList.add('loading');
		getElement('.modal-overlay').classList.add('show');
		getElement('body').classList.add('overflow');
		// timeoutId = setTimeout(function() {
		// 	getElement('.modal-overlay').classList.remove('loading');
		// }, 500);
	}

	function closeModal() {
		getElement('.modal-overlay').classList.remove('show');
		getElement('body').classList.remove('overflow');
		getElement('.modal-choose').classList.remove('dnone');
		getElement('#form-demo').classList.add('dnone');
		getElement('#form-join').classList.add('dnone');
	}

	window.goTo = goTo;
	window.openModal = openModal;
	window.closeModal = closeModal;

	pingFromEmail();
	logLandingPageUrl();
	document.addEventListener('keyup', handleKeyPress);
	getElement('#form-join').addEventListener('submit', handleSubmit);
	getElement('#form-demo').addEventListener('submit', handleDemoSubmit);
	getElement('strong.link-to-join').addEventListener('click', changeToJoin);
	getElement('strong.link-to-demo').addEventListener('click', changeToCall);
	getElement('.modal-choose-row.link-to-join').addEventListener('click', changeToJoin);
	getElement('.modal-choose-row.link-to-demo').addEventListener('click', changeToCall);
	getElement('.mobile-menu').addEventListener('click', openMenu);
	getElement('.mobile-menu-overlay').addEventListener('click', closeMenu);
	setTimeout(chatInit, 1000);
	setInterval(scollCheck, 200);
	setInterval(checkIsChatActive, 2000);
	scollCheck();

	if (getElement('.modal-overlay')) {
		getElement('.modal-overlay').addEventListener('click', handleClick);
	}

	if (getElement('#form-landing')) {
		getElement('#form-landing').addEventListener('submit', handleSubscribeSubmit);
	}

	if (getElement('#form-contact')) {
		getElement('#form-contact').addEventListener('submit', handleContactSubmit);
	}

	if (getElement('.input-text.phone')) {
		document.querySelectorAll('.input-text.phone').forEach(node => {
			node.addEventListener('input', handlePhoneMask);
		});
	}

	if (getElement('.modal-overlay')) {
		timeoutOpenModal = setTimeout(openModal, 20000);
		getElement('body').addEventListener('mouseleave', openModalFromLeave);
	}

	if (getElement('.subscribe-steps')) {
		setInterval(changeSteps, 1000);
	}

	if (getElement('.customers-kind')) {
		setInterval(changeCustomerKind, 1000);
	}
}

init();
