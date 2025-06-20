// Funcionalidades do Checkout
import { ecommerceService } from './ecommerce-service.js';
import { CONFIG } from './config.js';

class CheckoutManager {
    constructor() {
        this.checkoutData = JSON.parse(localStorage.getItem('checkout-data')) || null;
        this.enderecoCompleto = false;
        this.init();
    }

    init() {
        if (!this.checkoutData || this.checkoutData.items.length === 0) {
            this.redirecionarParaCarrinho();
            return;
        }

        this.carregarResumo();
        this.setupEventListeners();
        this.aplicarMascaras();
        this.preencherDadosUsuario();
    }

    redirecionarParaCarrinho() {
        alert('Carrinho vazio! Redirecionando...');
        window.location.href = 'carrinho.html';
    }

    carregarResumo() {
        const summaryItems = document.getElementById('summary-items');
        summaryItems.innerHTML = '';

        this.checkoutData.items.forEach(item => {
            const itemElement = this.criarItemResumo(item);
            summaryItems.appendChild(itemElement);
        });

        // Atualizar totais
        document.getElementById('summary-subtotal').textContent = this.formatarMoeda(this.checkoutData.subtotal);
        document.getElementById('summary-total').textContent = this.formatarMoeda(this.checkoutData.total);

        // Mostrar desconto se aplicável
        if (this.checkoutData.desconto > 0) {
            document.getElementById('summary-discount-line').style.display = 'flex';
            document.getElementById('summary-discount').textContent = `-${this.formatarMoeda(this.checkoutData.desconto)}`;
        }
    }

    criarItemResumo(item) {
        const div = document.createElement('div');
        div.className = 'summary-item';
        
        div.innerHTML = `
            <div class="item-details">
                <div class="item-name">${item.nome}</div>
                <div class="item-quantity">Quantidade: ${item.quantidade}</div>
            </div>
            <div class="item-price">${this.formatarMoeda(item.preco * item.quantidade)}</div>
        `;
        
        return div;
    }

    setupEventListeners() {
        // Buscar CEP
        document.getElementById('buscar-cep').addEventListener('click', () => {
            this.buscarCEP();
        });

        // CEP com Enter
        document.getElementById('cep').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.buscarCEP();
            }
        });

        // Alternância de formas de pagamento
        document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.alternarFormaPagamento();
            });
        });

        // Opções de pagamento na entrega
        document.querySelectorAll('input[name="tipo-pagamento-entrega"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.alternarTipoPagamentoEntrega();
            });
        });

        // Submit do formulário
        document.getElementById('checkout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processarPedido();
        });

        // Modal
        document.getElementById('voltar-home').addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }

    aplicarMascaras() {
        // Máscara para telefone
        const telefone = document.getElementById('telefone');
        telefone.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });

        // Máscara para CPF
        const cpf = document.getElementById('cpf');
        cpf.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
            e.target.value = value;
        });

        // Máscara para CEP
        const cep = document.getElementById('cep');
        cep.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }

    async preencherDadosUsuario() {
        if (ecommerceService.currentUser) {
            const userData = await ecommerceService.getUserData(ecommerceService.currentUser.uid);
            if (userData) {
                document.getElementById('nome').value = userData.nome || '';
                document.getElementById('email').value = userData.email || '';
                document.getElementById('telefone').value = userData.telefone || '';
                document.getElementById('cpf').value = userData.cpf || '';
            }
        }
    }

    async buscarCEP() {
        const cepInput = document.getElementById('cep');
        const cep = cepInput.value.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            this.mostrarNotificacao('CEP deve ter 8 dígitos', 'error');
            return;
        }

        const btnBuscar = document.getElementById('buscar-cep');
        btnBuscar.classList.add('loading');
        btnBuscar.disabled = true;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                this.mostrarNotificacao('CEP não encontrado', 'error');
                return;
            }

            // Preencher campos
            document.getElementById('endereco').value = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cidade').value = data.localidade || '';
            document.getElementById('estado').value = data.uf || '';

            this.enderecoCompleto = true;
            this.mostrarNotificacao('Endereço encontrado!', 'success');

        } catch (error) {
            this.mostrarNotificacao('Erro ao buscar CEP', 'error');
        } finally {
            btnBuscar.classList.remove('loading');
            btnBuscar.disabled = false;
        }
    }

    alternarFormaPagamento() {
        const pagamentoOnline = document.getElementById('pagamento-online').checked;
        const opcoesEntrega = document.getElementById('opcoes-entrega');
        const pagamentoOnlineDetails = document.getElementById('pagamento-online-details');

        if (pagamentoOnline) {
            opcoesEntrega.style.display = 'none';
            pagamentoOnlineDetails.style.display = 'block';
        } else {
            opcoesEntrega.style.display = 'block';
            pagamentoOnlineDetails.style.display = 'none';
        }
    }

    alternarTipoPagamentoEntrega() {
        const dinheiro = document.querySelector('input[name="tipo-pagamento-entrega"]:checked')?.value === 'dinheiro';
        const trocoSection = document.getElementById('troco-section');
        
        trocoSection.style.display = dinheiro ? 'block' : 'none';
    }

    validarFormulario() {
        const requiredFields = [
            'nome', 'email', 'telefone', 'cpf',
            'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.focus();
                this.mostrarNotificacao(`Por favor, preencha o campo ${field.previousElementSibling.textContent}`, 'error');
                return false;
            }
        }

        // Validar forma de pagamento
        const formaPagamento = document.querySelector('input[name="pagamento"]:checked');
        if (!formaPagamento) {
            this.mostrarNotificacao('Selecione uma forma de pagamento', 'error');
            return false;
        }

        // Se pagamento na entrega, validar tipo
        if (formaPagamento.value === 'entrega') {
            const tipoPagamento = document.querySelector('input[name="tipo-pagamento-entrega"]:checked');
            if (!tipoPagamento) {
                this.mostrarNotificacao('Selecione como deseja pagar na entrega', 'error');
                return false;
            }
        }

        return true;
    }

    async processarPedido() {
        if (!this.validarFormulario()) {
            return;
        }

        const btnFinalizar = document.getElementById('btn-finalizar');
        btnFinalizar.classList.add('loading');
        btnFinalizar.disabled = true;

        try {
            const formData = new FormData(document.getElementById('checkout-form'));
            const pedidoData = this.montarDadosPedido(formData);

            // Criar pedido no Firebase
            const result = await ecommerceService.createOrder(pedidoData);

            if (result.success) {
                // Limpar carrinho
                localStorage.removeItem('carrinho');
                localStorage.removeItem('checkout-data');

                // Mostrar modal de sucesso
                this.mostrarSucesso(result.orderId);

                // Atualizar pontos de fidelidade
                if (ecommerceService.currentUser) {
                    const pontosGanhos = Math.floor(this.checkoutData.total / 10); // 1 ponto a cada R$ 10
                    await ecommerceService.updateLoyaltyPoints(ecommerceService.currentUser.uid, pontosGanhos);
                }
            } else {
                this.mostrarNotificacao('Erro ao processar pedido. Tente novamente.', 'error');
            }

        } catch (error) {
            console.error('Erro ao processar pedido:', error);
            this.mostrarNotificacao('Erro interno. Tente novamente.', 'error');
        } finally {
            btnFinalizar.classList.remove('loading');
            btnFinalizar.disabled = false;
        }
    }

    montarDadosPedido(formData) {
        const formaPagamento = formData.get('pagamento');
        let tipoPagamento = null;
        let troco = null;

        if (formaPagamento === 'entrega') {
            tipoPagamento = formData.get('tipo-pagamento-entrega');
            if (tipoPagamento === 'dinheiro') {
                troco = parseFloat(formData.get('troco')) || null;
            }
        }

        return {
            // Dados do cliente
            cliente: {
                nome: formData.get('nome'),
                email: formData.get('email'),
                telefone: formData.get('telefone'),
                cpf: formData.get('cpf')
            },
            
            // Endereço de entrega
            endereco: {
                cep: formData.get('cep'),
                endereco: formData.get('endereco'),
                numero: formData.get('numero'),
                complemento: formData.get('complemento'),
                bairro: formData.get('bairro'),
                cidade: formData.get('cidade'),
                estado: formData.get('estado')
            },

            // Itens do pedido
            items: this.checkoutData.items,

            // Valores
            subtotal: this.checkoutData.subtotal,
            desconto: this.checkoutData.desconto,
            frete: 0, // Frete grátis por enquanto
            total: this.checkoutData.total,

            // Pagamento
            pagamento: {
                forma: formaPagamento,
                tipo: tipoPagamento,
                troco: troco
            },

            // Observações
            observacoes: formData.get('observacoes'),

            // Cupom aplicado
            cupom: this.checkoutData.cupom,

            // Data
            createdAt: new Date().toISOString()
        };
    }

    mostrarSucesso(orderId) {
        document.getElementById('numero-pedido').textContent = orderId.substring(0, 8).toUpperCase();
        document.getElementById('modal-confirmacao').style.display = 'block';
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao notificacao-${tipo}`;
        notificacao.textContent = mensagem;
        
        notificacao.style.cssText = `
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

        const cores = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };

        notificacao.style.background = cores[tipo] || cores.info;
        document.body.appendChild(notificacao);

        setTimeout(() => {
            notificacao.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notificacao)) {
                    document.body.removeChild(notificacao);
                }
            }, 300);
        }, 4000);
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutManager();
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
