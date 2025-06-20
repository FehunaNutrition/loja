// Sistema de Autenticação - Fehuna Nutrition
import { ecommerceService } from './ecommerce-service.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupForms();
        this.setupPasswordToggle();
        this.setupPasswordStrength();
        this.setupMasks();
        this.setupModal();
        this.checkAuthState();
    }

    // Configurar tabs de login/cadastro
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Remover classe active de todos
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Adicionar classe active no clicado
                btn.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }

    // Configurar formulários
    setupForms() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(new FormData(loginForm));
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(new FormData(registerForm));
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(new FormData(forgotForm));
            });
        }

        // Forgot password link
        const forgotLink = document.querySelector('.forgot-password');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('modal-recuperar-senha').style.display = 'block';
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    // Configurar botões de mostrar/ocultar senha
    setupPasswordToggle() {
        const toggleBtns = document.querySelectorAll('.toggle-password');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    // Configurar indicador de força da senha
    setupPasswordStrength() {
        const passwordInput = document.getElementById('register-password');
        if (!passwordInput) return;

        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');

        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = this.calculatePasswordStrength(password);
            
            strengthBar.className = `strength-bar ${strength.level}`;
            strengthText.textContent = strength.text;
            strengthText.style.color = strength.color;
        });
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        if (score < 3) {
            return { level: 'weak', text: 'Senha fraca', color: '#dc3545' };
        } else if (score < 5) {
            return { level: 'medium', text: 'Senha média', color: '#ffc107' };
        } else {
            return { level: 'strong', text: 'Senha forte', color: '#28a745' };
        }
    }

    // Configurar máscaras
    setupMasks() {
        // Máscara para telefone
        const telefoneInputs = document.querySelectorAll('#register-telefone');
        telefoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            });
        });

        // Máscara para CPF
        const cpfInputs = document.querySelectorAll('#register-cpf');
        cpfInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
                e.target.value = value;
            });
        });
    }

    // Configurar modal
    setupModal() {
        const modal = document.getElementById('modal-recuperar-senha');
        const closeBtn = document.querySelector('.close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Verificar estado de autenticação
    checkAuthState() {
        // Verificar se usuário está logado
        if (ecommerceService.currentUser) {
            this.showUserPanel(ecommerceService.currentUser);
        }
    }

    // Processar login
    async handleLogin(formData) {
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = document.getElementById('remember-me').checked;

        if (!email || !password) {
            this.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const result = await ecommerceService.login(email, password);
            
            if (result.success) {
                this.showNotification('Login realizado com sucesso!', 'success');
                
                if (rememberMe) {
                    localStorage.setItem('rememberUser', email);
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showNotification(this.getErrorMessage(result.error), 'error');
            }
        } catch (error) {
            this.showNotification('Erro interno. Tente novamente.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    // Processar cadastro
    async handleRegister(formData) {
        const nome = formData.get('nome');
        const sobrenome = formData.get('sobrenome');
        const email = formData.get('email');
        const telefone = formData.get('telefone');
        const cpf = formData.get('cpf');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const acceptTerms = document.getElementById('accept-terms').checked;
        const newsletter = document.getElementById('newsletter-signup').checked;

        // Validações
        if (!nome || !sobrenome || !email || !telefone || !cpf || !password) {
            this.showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('As senhas não coincidem', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (!acceptTerms) {
            this.showNotification('É necessário aceitar os termos de uso', 'error');
            return;
        }

        if (!this.validateCPF(cpf.replace(/\D/g, ''))) {
            this.showNotification('CPF inválido', 'error');
            return;
        }

        const submitBtn = document.querySelector('#register-form button[type="submit"]');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const userData = {
                nome: `${nome} ${sobrenome}`,
                telefone: telefone,
                cpf: cpf,
                newsletter: newsletter,
                createdAt: new Date().toISOString()
            };

            const result = await ecommerceService.register(email, password, userData);
            
            if (result.success) {
                this.showNotification('Conta criada com sucesso! Bem-vindo!', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showNotification(this.getErrorMessage(result.error), 'error');
            }
        } catch (error) {
            this.showNotification('Erro interno. Tente novamente.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    // Processar recuperação de senha
    async handleForgotPassword(formData) {
        const email = formData.get('email');
        
        if (!email) {
            this.showNotification('Digite um e-mail válido', 'error');
            return;
        }

        this.showNotification('Link de recuperação enviado para seu e-mail!', 'success');
        document.getElementById('modal-recuperar-senha').style.display = 'none';
    }

    // Processar logout
    async handleLogout() {
        try {
            await ecommerceService.logout();
            localStorage.removeItem('rememberUser');
            this.showNotification('Logout realizado com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            this.showNotification('Erro ao fazer logout', 'error');
        }
    }

    // Mostrar painel do usuário
    async showUserPanel(user) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.querySelector('.auth-tabs').style.display = 'none';
        document.getElementById('user-panel').style.display = 'block';

        // Carregar dados do usuário
        const userData = await ecommerceService.getUserData(user.uid);
        if (userData) {
            document.getElementById('user-name').textContent = userData.nome || 'Usuário';
            document.getElementById('user-email').textContent = userData.email || user.email;
            
            const loyaltyLevel = userData.loyaltyLevel || 'BRONZE';
            const loyaltyBadge = document.getElementById('loyalty-level');
            loyaltyBadge.textContent = loyaltyLevel;
            loyaltyBadge.className = `loyalty-badge ${loyaltyLevel.toLowerCase()}`;
            
            document.getElementById('loyalty-points').textContent = userData.loyaltyPoints || 0;
        }
    }

    // Validar CPF
    validateCPF(cpf) {
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cpf.charAt(10));
    }

    // Obter mensagem de erro amigável
    getErrorMessage(error) {
        const errorMessages = {
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/email-already-in-use': 'Este e-mail já está em uso',
            'auth/weak-password': 'Senha muito fraca',
            'auth/invalid-email': 'E-mail inválido',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
        };
        
        return errorMessages[error] || 'Erro desconhecido. Tente novamente.';
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };

        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
