// Funcionalidades do Checkout
import { ecommerceService } from './ecommerce-service.js';
import { CONFIG } from './config.js';
import { MercadoPagoManager } from './mercadopago-real.js'; // ✅ Sistema REAL de pagamentos
import { emailService } from './email-service.js';

class CheckoutManager {
    constructor() {
        this.checkoutData = JSON.parse(localStorage.getItem('checkout-data')) || null;
        this.enderecoCompleto = false;
        this.mercadoPago = new MercadoPagoManager();
        this.init();
    }    init() {
        if (!this.checkoutData || this.checkoutData.items.length === 0) {
            this.redirecionarParaCarrinho();
            return;
        }

        this.carregarResumo();
        this.setupEventListeners();
        this.aplicarMascaras();
        this.preencherDadosUsuario();
        
        // Configurar estado inicial dos campos
        this.configurarEstadoInicial();
    }    configurarEstadoInicial() {
        // Por padrão, pagamento na entrega está selecionado
        // Ocultar opções de pagamento online
        const pagamentoOnlineDetails = document.getElementById('pagamento-online-details');
        const opcoesEntrega = document.getElementById('opcoes-entrega');
        
        if (pagamentoOnlineDetails) {
            pagamentoOnlineDetails.style.display = 'none';
        }
        if (opcoesEntrega) {
            opcoesEntrega.style.display = 'block';
        }
        
        // Garantir que TODOS os campos de pagamento online começem sem required
        this.togglePaymentRequiredFields(false);
        
        // Estado inicial do troco
        const trocoSection = document.getElementById('troco-section');
        if (trocoSection) {
            trocoSection.style.display = 'none';
        }
        
        console.log('✅ Estado inicial configurado - Pagamento na entrega selecionado');
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
    }    criarItemResumo(item) {
        const div = document.createElement('div');
        div.className = 'summary-item';
        
        // Adaptar para estrutura Firebase e estrutura antiga
        const nome = item.name || item.nome || 'Produto';
        const preco = item.price || item.preco || 0;
        
        div.innerHTML = `
            <div class="item-details">
                <div class="item-name">${nome}</div>
                <div class="item-quantity">Quantidade: ${item.quantidade}</div>
            </div>
            <div class="item-price">${this.formatarMoeda(preco * item.quantidade)}</div>
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
    }    alternarFormaPagamento() {
        const pagamentoOnline = document.getElementById('pagamento-online').checked;
        const pagamentoEntrega = document.getElementById('pagamento-entrega').checked;
        
        // Elementos das seções de pagamento
        const pagamentoOnlineDetails = document.getElementById('pagamento-online-details');
        const opcoesEntrega = document.getElementById('opcoes-entrega');        if (pagamentoOnline) {
            // Mostrar opções de pagamento online (PIX/Cartão)
            if (pagamentoOnlineDetails) {
                pagamentoOnlineDetails.style.display = 'block';
            }
            if (opcoesEntrega) {
                opcoesEntrega.style.display = 'none';
            }
            
            // Desabilitar validação dos campos de entrega
            this.toggleRequiredFields('tipo-pagamento-entrega', false);
            this.toggleRequiredFields('troco', false);
            
            // Configurar abas de pagamento online
            this.configurarPaymentTabs();
            
            // Garantir que método padrão esteja definido
            const methodInput = document.querySelector('input[name="payment-method"]');
            if (methodInput && !methodInput.value) {
                methodInput.value = 'pix'; // PIX como padrão
                console.log('✅ Método padrão definido: pix');
            }
            
            // Aplicar required apenas ao método selecionado (PIX por padrão)
            this.updateRequiredByMethod(methodInput?.value || 'pix');
            
        } else if (pagamentoEntrega) {
            // Mostrar opções de pagamento na entrega
            if (pagamentoOnlineDetails) {
                pagamentoOnlineDetails.style.display = 'none';
            }
            if (opcoesEntrega) {
                opcoesEntrega.style.display = 'block';
            }
            
            // Desabilitar validação dos campos de pagamento online
            this.togglePaymentRequiredFields(false);
            
            // Habilitar validação dos campos de entrega se necessário
            this.toggleRequiredFields('tipo-pagamento-entrega', true);
        }
    }

    // Função para gerenciar atributos required dinamicamente
    toggleRequiredFields(name, required) {
        const fields = document.querySelectorAll(`[name="${name}"]`);
        fields.forEach(field => {
            if (required) {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        });
    }

    // Função para gerenciar validação do Mercado Pago
    toggleMercadoPagoValidation(required) {
        const mpFields = [
            'cardNumber', 'cardExpirationDate', 'securityCode', 
            'cardholderName', 'cardholderEmail', 'docType', 'docNumber',
            'pixEmail', 'pixDocType', 'pixDocNumber'
        ];

        mpFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (required) {
                    field.setAttribute('required', 'required');
                } else {
                    field.removeAttribute('required');
                }
            }
        });
    }    // Remover função inicializarMercadoPago - não é mais necessária
    // A interface de pagamento agora está diretamente no HTML
    
    alternarTipoPagamentoEntrega() {
        const tipoPagamento = document.querySelector('input[name="tipo-pagamento-entrega"]:checked');
        const trocoSection = document.getElementById('troco-section');
        const trocoInput = document.getElementById('troco');
        
        if (tipoPagamento?.value === 'dinheiro') {
            trocoSection.style.display = 'block';
            if (trocoInput) {
                trocoInput.setAttribute('required', 'required');
            }
        } else {
            trocoSection.style.display = 'none';
            if (trocoInput) {
                trocoInput.removeAttribute('required');
                trocoInput.value = ''; // Limpar valor
            }
        }
    }validarFormulario() {
        console.log('Validando formulário...');
        
        const requiredFields = [
            'nome', 'email', 'telefone', 'cpf',
            'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado'
        ];

        // Validar campos básicos
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                field?.focus();
                this.mostrarNotificacao(`Por favor, preencha o campo ${field?.previousElementSibling?.textContent || fieldId}`, 'error');
                return false;
            }
        }

        // Validar forma de pagamento
        const formaPagamento = document.querySelector('input[name="pagamento"]:checked');
        if (!formaPagamento) {
            this.mostrarNotificacao('Selecione uma forma de pagamento', 'error');
            return false;
        }

        // Validar campos específicos de cada forma de pagamento
        if (formaPagamento.value === 'online') {
            return this.validarPagamentoOnline();
        } else if (formaPagamento.value === 'entrega') {
            return this.validarPagamentoEntrega();
        }

        return true;
    }

    validarPagamentoOnline() {
        console.log('Validando pagamento online...');
        
        const opcoesOnline = document.getElementById('opcoes-online');
        if (!opcoesOnline || opcoesOnline.style.display === 'none') {
            return true; // Se não está visível, não precisa validar
        }

        // Verificar qual aba está ativa
        const activeTab = document.querySelector('.payment-tab.active');
        if (!activeTab) {
            this.mostrarNotificacao('Selecione um método de pagamento online', 'error');
            return false;
        }

        const method = activeTab.dataset.method;

        if (method === 'credit_card') {
            return this.validarCartaoCredito();
        } else if (method === 'pix') {
            return this.validarPix();
        }

        return true;
    }

    validarCartaoCredito() {
        const creditCardForm = document.getElementById('credit-card-form');
        if (!creditCardForm || creditCardForm.style.display === 'none') {
            return true;
        }

        const camposCartao = [
            { id: 'cardNumber', nome: 'Número do cartão' },
            { id: 'cardExpirationDate', nome: 'Data de vencimento' },
            { id: 'securityCode', nome: 'CVV' },
            { id: 'cardholderName', nome: 'Nome no cartão' },
            { id: 'cardholderEmail', nome: 'E-mail' },
            { id: 'docType', nome: 'Tipo de documento' },
            { id: 'docNumber', nome: 'Número do documento' }
        ];

        for (const campo of camposCartao) {
            const element = document.getElementById(campo.id);
            if (!element || !element.value.trim()) {
                this.mostrarNotificacao(`Preencha o campo: ${campo.nome}`, 'error');
                element?.focus();
                return false;
            }
        }

        return true;
    }

    validarPix() {
        const pixForm = document.getElementById('pix-form');
        if (!pixForm || pixForm.style.display === 'none') {
            return true;
        }

        const camposPix = [
            { id: 'pixEmail', nome: 'E-mail' },
            { id: 'pixDocType', nome: 'Tipo de documento' },
            { id: 'pixDocNumber', nome: 'Número do documento' }
        ];

        for (const campo of camposPix) {
            const element = document.getElementById(campo.id);
            if (!element || !element.value.trim()) {
                this.mostrarNotificacao(`Preencha o campo: ${campo.nome}`, 'error');
                element?.focus();
                return false;
            }
        }

        return true;
    }

    validarPagamentoEntrega() {
        const tipoPagamento = document.querySelector('input[name="tipo-pagamento-entrega"]:checked');
        if (!tipoPagamento) {
            this.mostrarNotificacao('Selecione como deseja pagar na entrega', 'error');
            return false;
        }

        // Se escolheu dinheiro, verificar se informou o troco
        if (tipoPagamento.value === 'dinheiro') {
            const trocoSection = document.getElementById('troco-section');
            if (trocoSection && trocoSection.style.display !== 'none') {
                const troco = document.getElementById('troco');
                if (!troco || !troco.value || parseFloat(troco.value) <= 0) {
                    this.mostrarNotificacao('Informe o valor para troco', 'error');
                    troco?.focus();
                    return false;
                }
            }
        }

        return true;
    }async processarPedido() {
        if (!this.validarFormulario()) {
            return;
        }

        const btnFinalizar = document.getElementById('btn-finalizar');
        btnFinalizar.classList.add('loading');
        btnFinalizar.disabled = true;

        try {
            const formData = new FormData(document.getElementById('checkout-form'));
            const pedidoData = this.montarDadosPedido(formData);
            const formaPagamento = formData.get('pagamento');

            console.log('Processando pedido:', pedidoData);
            console.log('Forma de pagamento:', formaPagamento);
            
            let result;            if (formaPagamento === 'online') {
                // Verificar qual método de pagamento online foi selecionado
                const methodInput = document.querySelector('input[name="payment-method"]');
                console.log('Input payment-method encontrado:', methodInput);
                console.log('Valor do payment-method:', methodInput?.value);
                
                // Se não há método selecionado, definir PIX como padrão
                if (!methodInput?.value) {
                    console.log('⚠️ Nenhum método selecionado, usando PIX como padrão');
                    if (methodInput) {
                        methodInput.value = 'pix';
                    }
                }
                
                // Processar pagamento online via Mercado Pago
                try {
                    const paymentResult = await this.mercadoPago.processPayment(formData, pedidoData);
                    
                    console.log('Resultado do pagamento:', paymentResult);
                      if (paymentResult.success && paymentResult.payment_method === 'credit_card') {
                        // Cartão aprovado imediatamente
                        pedidoData.payment = {
                            method: 'online',
                            provider: 'mercadopago',
                            status: 'approved',
                            payment_method: paymentResult.payment_method,
                            external_reference: paymentResult.external_reference,
                            card_token: paymentResult.card_token,
                            installments: paymentResult.installments
                        };                    } else if (paymentResult.payment_method === 'pix') {
                        // PIX precisa ser pago - adicionar dados ao pedido
                        pedidoData.payment = {
                            method: 'online',
                            provider: 'mercadopago',
                            status: 'pending',
                            payment_method: 'pix',
                            payment_id: paymentResult.payment_id,
                            external_reference: paymentResult.external_reference,
                            qr_code: paymentResult.qr_code,
                            qr_code_base64: paymentResult.qr_code_base64
                        };
                        
                        // Salvar pedido no Firebase mesmo com status pending
                        const orderId = await this.salvarPedido(pedidoData);
                        
                        if (orderId) {
                            console.log('✅ Pedido PIX salvo com sucesso:', orderId);
                            // Mostrar interface PIX no modal de sucesso
                            this.mostrarSucesso(orderId, pedidoData.payment);
                        } else {
                            throw new Error('Erro ao salvar pedido PIX');
                        }
                        return; // Para execução aqui
                    } else {
                        throw new Error(paymentResult.message || 'Falha no processamento do pagamento online');
                    }
                } catch (paymentError) {
                    console.error('Erro no pagamento online:', paymentError);
                    this.mostrarNotificacao('Erro no pagamento online. Tente novamente.', 'error');
                    return;
                }
            } else {
                // Pagamento na entrega
                pedidoData.payment = {
                    method: 'delivery',
                    type: formData.get('tipo-pagamento-entrega'),
                    status: 'pending',
                    change_for: formData.get('troco') || null
                };
            }            // Criar pedido no Firebase
            result = await ecommerceService.createOrder(pedidoData);

            if (result && result.success) {
                // Enviar email de confirmação
                try {
                    if (pedidoData.payment?.payment_method === 'pix' && pedidoData.payment?.status === 'pending_payment') {
                        // Email específico para PIX pendente
                        await emailService.sendPixPendingEmail(pedidoData);
                        console.log('Email PIX pendente enviado');
                    } else {
                        // Email de confirmação normal
                        await emailService.sendOrderConfirmation(pedidoData);
                        console.log('Email de confirmação enviado');
                    }
                } catch (emailError) {
                    console.warn('Erro ao enviar email:', emailError);
                    // Não quebrar o fluxo se o email falhar
                }

                // Limpar carrinho
                localStorage.removeItem('carrinho');
                localStorage.removeItem('checkout-data');

                // Mostrar modal de sucesso
                this.mostrarSucesso(result.orderId || result.orderNumber, pedidoData.payment);

                // Atualizar pontos de fidelidade
                if (ecommerceService.currentUser) {
                    const pontosGanhos = Math.floor(this.checkoutData.total / 10); // 1 ponto a cada R$ 10
                    try {
                        await ecommerceService.updateLoyaltyPoints(ecommerceService.currentUser.uid, pontosGanhos);
                    } catch (loyaltyError) {
                        console.error('Erro ao atualizar pontos de fidelidade:', loyaltyError);
                    }
                }            } else {
                console.error('Erro na resposta do createOrder:', result);
                this.mostrarNotificacao(result?.error || 'Erro ao processar pedido. Tente novamente.', 'error');
            }
        } catch (error) {
            console.error('Erro ao processar pedido:', error);
            this.mostrarNotificacao('Erro interno: ' + error.message, 'error');
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

            // Data            createdAt: new Date().toISOString()
        };
    }    mostrarSucesso(orderId, paymentData = null) {
        const orderDisplayId = orderId ? orderId.toString().substring(0, 8).toUpperCase() : 'ERRO';
        const numeroElement = document.getElementById('numero-pedido');
        if (numeroElement) {
            numeroElement.textContent = orderDisplayId;
        }
        
        const modal = document.getElementById('modal-confirmacao');
        
        // Limpar seções de pagamento anteriores
        const existingPaymentSection = modal.querySelector('.pix-payment-section');
        if (existingPaymentSection) {
            existingPaymentSection.remove();
        }
        
        // Se for pagamento PIX, mostrar interface de pagamento
        if (paymentData && paymentData.method === 'online' && paymentData.payment_method === 'pix') {
            const modalContent = modal.querySelector('.modal-content');
              const pixSection = document.createElement('div');
            pixSection.className = 'pix-payment-section';
            pixSection.innerHTML = `
                <hr style="margin: 20px 0;">
                <div class="alert alert-warning" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>⚠️ Atenção:</strong> Seu pedido foi criado, mas o pagamento ainda está <strong>pendente</strong>.
                </div>
                
                <h3 style="text-align: center; color: #28a745; margin-bottom: 15px;">
                    <i class="fas fa-qrcode"></i> Complete o Pagamento PIX
                </h3>
                
                <div style="text-align: center; margin: 20px 0;">
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; border: 2px dashed #28a745;">
                        <i class="fas fa-qrcode" style="font-size: 64px; color: #28a745; margin-bottom: 15px;"></i>
                        <p style="margin: 15px 0; font-weight: bold; font-size: 18px;">QR Code PIX</p>
                        <p style="color: #666; margin-bottom: 20px;">
                            Valor: <strong>R$ ${parseFloat(paymentData.transaction_amount || 0).toFixed(2)}</strong>
                        </p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
                            <img src="${paymentData.qr_code_base64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9Ijg1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTJweCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q09ESUdPPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTA1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTZweCIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UElYPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTJweCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UkVBTDwvdGV4dD48L3N2Zz4='}" 
                                 alt="QR Code PIX" 
                                 style="max-width: 180px; height: auto; border: 2px solid #28a745; border-radius: 8px;">
                        </div>

                        <!-- Código PIX Copia e Cola -->
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #dee2e6;">
                            <h5 style="margin-bottom: 10px; color: #495057;">
                                <i class="fas fa-copy"></i> Código PIX Copia e Cola
                            </h5>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <textarea readonly style="flex: 1; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; resize: none; font-family: monospace; font-size: 11px; height: 80px; line-height: 1.2;">${paymentData.qr_code || 'Código PIX não disponível'}</textarea>
                                <button type="button" onclick="navigator.clipboard.writeText('${paymentData.qr_code || ''}').then(() => { this.innerHTML = '<i class=\\'fas fa-check\\'></i> Copiado!'; setTimeout(() => this.innerHTML = '<i class=\\'fas fa-copy\\'></i> Copiar', 2000); })" style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                                    <i class="fas fa-copy"></i> Copiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pix-instructions" style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h5 style="color: #0056b3; margin-bottom: 15px;">
                        <i class="fas fa-mobile-alt"></i> Como pagar via PIX:
                    </h5>
                    <ol style="margin: 0; padding-left: 25px; line-height: 1.6;">
                        <li>Abra o app do seu banco ou carteira digital</li>
                        <li>Escolha a opção <strong>PIX</strong></li>
                        <li>Selecione <strong>"Ler QR Code"</strong> ou <strong>"Copia e Cola"</strong></li>
                        <li>Escaneie o código ou cole o código PIX</li>
                        <li>Confirme os dados e o valor</li>
                        <li>Finalize o pagamento</li>
                    </ol>
                </div>
                
                <div class="alert alert-info" style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; text-align: center;">
                        <i class="fas fa-clock"></i> 
                        <strong>Confirmação automática:</strong> O pagamento será confirmado automaticamente via webhook.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.checkoutManager.verificarPagamentoPIX('${paymentData.external_reference}')" 
                            style="padding: 12px 25px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
                        <i class="fas fa-sync-alt"></i> Verificar Pagamento
                    </button>
                </div>
            `;
            
            const modalFooter = modalContent.querySelector('.modal-footer');
            if (modalFooter) {
                modalContent.insertBefore(pixSection, modalFooter);
            } else {
                modalContent.appendChild(pixSection);
            }
        }
        
        modal.style.display = 'block';
    }

    // Mostrar interface PIX para pagamento    // Verificar status do pagamento PIX - VERSÃO REAL
    async verificarPagamentoPIX(reference) {
        try {
            console.log('🔍 Verificando pagamento PIX:', reference);
            
            const button = event.target;
            const originalContent = button.innerHTML;
            
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            button.disabled = true;
            
            // Fazer consulta REAL à API do Mercado Pago via webhook/backend
            const response = await fetch(`https://vercel-backend-lovat-five.vercel.app/api/webhook?check_payment=${reference}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.status === 'approved') {
                    // Pagamento aprovado!
                    button.innerHTML = '<i class="fas fa-check"></i> Pagamento Confirmado!';
                    button.style.background = '#28a745';
                    
                    setTimeout(() => {
                        alert('🎉 Pagamento PIX confirmado! Seu pedido está sendo processado.');
                        window.location.href = '/';
                    }, 2000);
                    
                } else if (result.status === 'pending') {
                    // Ainda pendente
                    button.innerHTML = '<i class="fas fa-clock"></i> Ainda Pendente';
                    button.style.background = '#ffc107';
                    
                    setTimeout(() => {
                        button.innerHTML = originalContent;
                        button.style.background = '#007bff';
                        button.disabled = false;
                    }, 3000);
                    
                } else {
                    // Erro ou rejeitado
                    button.innerHTML = '<i class="fas fa-times"></i> Erro';
                    button.style.background = '#dc3545';
                    
                    setTimeout(() => {
                        button.innerHTML = originalContent;
                        button.style.background = '#007bff';
                        button.disabled = false;
                    }, 3000);
                }
            } else {
                throw new Error('Erro na consulta');
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar pagamento:', error);
            
            const button = event.target;
            button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro na verificação';
            button.style.background = '#dc3545';
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-sync-alt"></i> Verificar Pagamento';
                button.style.background = '#007bff';                button.disabled = false;
            }, 3000);
        }
    }

    // Função auxiliar para mostrar notificações
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
    }    // Configurar abas de pagamento online (PIX/Cartão)
    configurarPaymentTabs() {
        // Se já foi configurado, não fazer novamente
        if (this.paymentTabsConfigured) return;
        
        const tabs = document.querySelectorAll('.payment-tab');
        const forms = document.querySelectorAll('.payment-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remover classe active de todas as abas
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));
                
                // Adicionar classe active na aba clicada
                tab.classList.add('active');
                
                // Mostrar formulário correspondente
                const method = tab.dataset.method;
                const form = document.getElementById(`${method}-form`);
                if (form) {
                    form.classList.add('active');
                }
                
                // Atualizar input hidden do método
                const methodInput = document.querySelector('input[name="payment-method"]');
                if (methodInput) {
                    methodInput.value = method;
                }
                
                // Gerenciar campos required baseado no método selecionado
                this.updateRequiredByMethod(method);
                
                console.log('Método de pagamento selecionado:', method);
            });
        });
          // Configurar máscaras dos campos de pagamento
        this.configurarMascarasPagamento();
        
        this.paymentTabsConfigured = true;
        console.log('✅ Abas de pagamento configuradas');
    }

    // Configurar abas de instruções PIX
    configurarAbasInstrucoes() {
        const tabs = document.querySelectorAll('.instruction-tab');
        const contents = document.querySelectorAll('.instruction-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remover active de todas as abas
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Adicionar active na aba clicada
                tab.classList.add('active');
                
                // Mostrar conteúdo correspondente
                const targetTab = tab.dataset.tab;
                const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // Iniciar timer do PIX (30 minutos)
    iniciarTimerPIX() {
        let timeLeft = 30 * 60; // 30 minutos em segundos
        const timerElement = document.getElementById('pixTimer');
        
        if (!timerElement) return;
        
        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.textContent = 'Expirado';
                timerElement.style.color = '#dc3545';
                
                // Mostrar aviso de expiração
                this.mostrarNotificacao('⏰ Tempo para pagamento PIX expirou. Gere um novo código.', 'warning');
            }
            
            timeLeft--;
        }, 1000);
        
        // Armazenar referência para poder limpar depois
        this.pixTimer = timer;
    }

    configurarMascarasPagamento() {
        // Máscara para número do cartão
        const cardNumber = document.getElementById('cardNumber');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                e.target.value = value;
                
                // Detectar bandeira
                this.detectarBandeira(value.replace(/\s/g, ''));
            });
        }

        // Máscara para data de vencimento
        const cardExpiration = document.getElementById('cardExpirationDate');
        if (cardExpiration) {
            cardExpiration.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Máscara para CVV
        const securityCode = document.getElementById('securityCode');
        if (securityCode) {
            securityCode.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
            });
        }

        // Máscara para CPF/CNPJ no PIX
        const pixCpf = document.getElementById('pixCpf');
        if (pixCpf) {
            pixCpf.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length <= 11) {
                    // CPF
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
                } else {
                    // CNPJ
                    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                }
                
                e.target.value = value;
            });
        }
    }

    detectarBandeira(cardNumber) {
        const bandeiras = {
            'visa': /^4[0-9]{0,15}$/,
            'mastercard': /^5[1-5][0-9]{0,14}$/,
            'elo': /^((((636368)|(438935)|(504175)|(451416)|(636297))\d{0,10})|((5067)|(4576)|(4011))\d{0,12})$/,
            'amex': /^3[47][0-9]{0,13}$/
        };

        let bandeira = '';
        for (const [nome, regex] of Object.entries(bandeiras)) {
            if (regex.test(cardNumber)) {
                bandeira = nome;
                break;
            }
        }

        // Atualizar ícone da bandeira
        const brandIcon = document.querySelector('.card-brand-icon');
        if (brandIcon) {
            brandIcon.className = `card-brand-icon ${bandeira}`;
        }

        console.log('Bandeira detectada:', bandeira);
        return bandeira;
    }

    // Função para gerenciar validação dos campos de pagamento online
    togglePaymentRequiredFields(required) {
        const paymentFields = [
            'cardNumber', 'cardExpirationDate', 'securityCode', 'cardHolderName', // Cartão
            'pixEmail', 'pixCpf' // PIX
        ];
        
        paymentFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (required) {
                    field.setAttribute('required', 'required');
                } else {
                    field.removeAttribute('required');
                }
            }
        });
        
        console.log('Campos de pagamento online - required:', required);
    }

    // Atualizar campos required baseado no método selecionado
    updateRequiredByMethod(method) {
        // Limpar todos os required primeiro
        const allPaymentFields = [
            'cardNumber', 'cardExpirationDate', 'securityCode', 'cardHolderName',
            'pixEmail', 'pixCpf'
        ];
        
        allPaymentFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.removeAttribute('required');
            }
        });
        
        // Adicionar required apenas aos campos do método ativo
        if (method === 'pix') {
            const pixFields = ['pixEmail', 'pixCpf'];
            pixFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.setAttribute('required', 'required');
                }
            });
        } else if (method === 'credit-card') {
            const cardFields = ['cardNumber', 'cardExpirationDate', 'securityCode', 'cardHolderName'];
            cardFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.setAttribute('required', 'required');
                }
            });
        }
        
        console.log('Campos required atualizados para:', method);
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

// Inicializar CheckoutManager
const checkoutManager = new CheckoutManager();

// Tornar global para uso nos onclick do HTML
window.checkoutManager = checkoutManager;
