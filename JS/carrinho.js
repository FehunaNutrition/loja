// Funcionalidades do Carrinho de Compras
import { ecommerceService } from './ecommerce-service.js';

class CarrinhoManager {
    constructor() {
        this.carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
        this.produtos = []; // Produtos carregados do Firebase
        this.cupomAplicado = null;
        this.init();
    }    async init() {
        try {
            console.log('Inicializando CarrinhoManager...');
            await this.carregarProdutos();
            console.log('Produtos carregados, renderizando carrinho...');
            this.renderizarCarrinho();
            this.setupEventListeners();
            this.verificarLoyalty();
            console.log('CarrinhoManager inicializado com sucesso');
        } catch (error) {
            console.error('Erro na inicialização do CarrinhoManager:', error);
        }
    }

    async carregarProdutos() {
        try {
            this.produtos = await ecommerceService.getProducts({ status: 'active' });
            console.log('Produtos carregados no carrinho:', this.produtos.length);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.produtos = [];
        }
    }

    setupEventListeners() {
        // Limpar carrinho
        document.getElementById('limpar-carrinho')?.addEventListener('click', () => {
            this.mostrarModal('Tem certeza que deseja limpar todo o carrinho?', () => {
                this.limparCarrinho();
            });
        });

        // Finalizar compra
        document.getElementById('finalizar-compra')?.addEventListener('click', () => {
            this.finalizarCompra();
        });

        // Aplicar cupom
        document.getElementById('aplicar-cupom')?.addEventListener('click', () => {
            this.aplicarCupom();
        });

        // Enter no input do cupom
        document.getElementById('cupom-codigo')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.aplicarCupom();
            }
        });

        // Modal
        this.setupModal();
    }

    renderizarCarrinho() {
        const carrinhoVazio = document.getElementById('carrinho-vazio');        const carrinhoConteudo = document.getElementById('carrinho-conteudo');
        const listaItems = document.getElementById('lista-items');

        console.log('Renderizando carrinho com', this.carrinho.length, 'itens');

        if (!carrinhoVazio || !carrinhoConteudo || !listaItems) {
            console.error('Elementos do carrinho não encontrados no DOM');
            return;
        }

        if (this.carrinho.length === 0) {
            carrinhoVazio.style.display = 'block';
            carrinhoConteudo.style.display = 'none';
            return;
        }

        carrinhoVazio.style.display = 'none';
        carrinhoConteudo.style.display = 'block';

        // Renderizar itens
        listaItems.innerHTML = '';
        this.carrinho.forEach(item => {
            try {
                const itemElement = this.criarItemElement(item);
                listaItems.appendChild(itemElement);
            } catch (error) {
                console.error('Erro ao criar elemento do item:', item, error);
            }
        });

        // Atualizar totais
        this.atualizarTotais();
    }    criarItemElement(item) {
        const div = document.createElement('div');
        div.className = 'carrinho-item';
        div.setAttribute('data-id', item.id);

        // Adaptar para estrutura Firebase e estrutura antiga
        const imagem = item.images?.[0] || item.imagem || item.image || 'https://via.placeholder.com/100x80?text=Produto';
        const nome = item.name || item.nome;
        const descricao = item.description || item.descricao || '';
        const preco = item.price || item.preco || 0;

        div.innerHTML = `
            <img src="${imagem}" alt="${nome}" class="item-imagem" onerror="this.src='https://via.placeholder.com/100x80?text=Produto'">
            <div class="item-info">
                <h4>${nome}</h4>
                <p>${descricao}</p>
            </div>
            <div class="item-preco">
                ${this.formatarMoeda(preco)}
            </div>
            <div class="quantidade-controls">
                <button class="btn-quantidade btn-menos" onclick="carrinhoManager.alterarQuantidade('${item.id}', -1)">-</button>
                <input type="number" class="quantidade-input" value="${item.quantidade}" min="1" 
                       onchange="carrinhoManager.alterarQuantidadeInput('${item.id}', this.value)">
                <button class="btn-quantidade btn-mais" onclick="carrinhoManager.alterarQuantidade('${item.id}', 1)">+</button>
            </div>
            <button class="btn-remover" onclick="carrinhoManager.removerItem('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;

        return div;
    }    alterarQuantidade(id, delta) {
        // Converter ID para string para compatibilidade
        const item = this.carrinho.find(item => String(item.id) === String(id));
        if (item) {
            item.quantidade += delta;
            if (item.quantidade <= 0) {
                this.removerItem(id);
                return;
            }
            this.salvarCarrinho();
            this.renderizarCarrinho();
        }
    }    alterarQuantidadeInput(id, novaQuantidade) {
        const quantidade = parseInt(novaQuantidade);
        if (quantidade <= 0) {
            this.removerItem(id);
            return;
        }

        // Converter ID para string para compatibilidade
        const item = this.carrinho.find(item => String(item.id) === String(id));
        if (item) {
            item.quantidade = quantidade;
            this.salvarCarrinho();
            this.renderizarCarrinho();
        }
    }removerItem(id) {
        // Converter ID para string para compatibilidade
        this.carrinho = this.carrinho.filter(item => String(item.id) !== String(id));
        this.salvarCarrinho();
        this.renderizarCarrinho();
        this.mostrarNotificacao('Item removido do carrinho', 'info');
    }

    limparCarrinho() {
        this.carrinho = [];
        this.cupomAplicado = null;
        this.salvarCarrinho();
        this.renderizarCarrinho();
        this.mostrarNotificacao('Carrinho limpo com sucesso', 'success');
    }

    atualizarTotais() {
        const subtotal = this.calcularSubtotal();
        const desconto = this.calcularDesconto();
        const total = subtotal - desconto;

        document.getElementById('total-items').textContent = this.carrinho.reduce((sum, item) => sum + item.quantidade, 0);
        document.getElementById('subtotal').textContent = this.formatarMoeda(subtotal);
        document.getElementById('total').textContent = this.formatarMoeda(total);

        // Mostrar desconto se aplicável
        const linhaDesconto = document.getElementById('linha-desconto');
        if (desconto > 0) {
            linhaDesconto.style.display = 'flex';
            document.getElementById('desconto').textContent = `-${this.formatarMoeda(desconto)}`;
        } else {
            linhaDesconto.style.display = 'none';
        }
    }    calcularSubtotal() {
        return this.carrinho.reduce((total, item) => {
            const preco = item.price || item.preco || 0;
            return total + (preco * item.quantidade);
        }, 0);
    }

    calcularDesconto() {
        let desconto = 0;

        // Desconto do cupom
        if (this.cupomAplicado) {
            if (this.cupomAplicado.tipo === 'percentual') {
                desconto += this.calcularSubtotal() * (this.cupomAplicado.valor / 100);
            } else {
                desconto += this.cupomAplicado.valor;
            }
        }

        return desconto;
    }

    async verificarLoyalty() {
        // Verificar se usuário está logado e aplicar desconto de fidelidade
        if (ecommerceService.currentUser) {
            const userData = await ecommerceService.getUserData(ecommerceService.currentUser.uid);
            if (userData && userData.loyaltyLevel) {
                this.aplicarDescontoFidelidade(userData.loyaltyLevel);
            }
        }
    }

    aplicarDescontoFidelidade(level) {
        const CONFIG = {
            BRONZE: { discount: 0 },
            SILVER: { discount: 5 },
            GOLD: { discount: 10 },
            PLATINUM: { discount: 15 }
        };

        const desconto = CONFIG[level]?.discount || 0;
        if (desconto > 0) {
            console.log(`Desconto de fidelidade aplicado: ${desconto}%`);
        }
    }

    aplicarCupom() {
        const codigo = document.getElementById('cupom-codigo').value.trim().toUpperCase();

        if (!codigo) {
            this.mostrarFeedbackCupom('Digite um código de cupom', 'error');
            return;
        }

        // Cupons de exemplo
        const cupons = {
            'WELCOME10': { tipo: 'percentual', valor: 10, descricao: '10% de desconto' },
            'FRETE20': { tipo: 'fixo', valor: 20, descricao: 'R$ 20 de desconto' },
            'PRIMEIRA': { tipo: 'percentual', valor: 15, descricao: '15% de desconto na primeira compra' }
        };

        if (cupons[codigo]) {
            this.cupomAplicado = cupons[codigo];
            this.mostrarFeedbackCupom(`Cupom aplicado: ${this.cupomAplicado.descricao}`, 'success');
            this.atualizarTotais();
        } else {
            this.mostrarFeedbackCupom('Cupom inválido ou expirado', 'error');
        }
    }

    mostrarFeedbackCupom(mensagem, tipo) {
        const feedback = document.getElementById('cupom-feedback');
        feedback.textContent = mensagem;
        feedback.className = `cupom-feedback ${tipo}`;
        
        setTimeout(() => {
            feedback.textContent = '';
            feedback.className = 'cupom-feedback';
        }, 5000);
    }

    finalizarCompra() {
        if (this.carrinho.length === 0) {
            this.mostrarNotificacao('Adicione itens ao carrinho antes de finalizar', 'warning');
            return;
        }

        const checkoutData = {
            items: this.carrinho,
            subtotal: this.calcularSubtotal(),
            desconto: this.calcularDesconto(),
            total: this.calcularSubtotal() - this.calcularDesconto(),
            cupom: this.cupomAplicado
        };

        localStorage.setItem('checkout-data', JSON.stringify(checkoutData));
        window.location.href = 'checkout.html';
    }

    salvarCarrinho() {
        localStorage.setItem('carrinho', JSON.stringify(this.carrinho));
        this.atualizarContadorNavegacao();
    }

    atualizarContadorNavegacao() {
        const totalItens = this.carrinho.reduce((sum, item) => sum + item.quantidade, 0);
        const contador = document.querySelector('#cart-count');
        if (contador) {
            contador.textContent = totalItens;
            contador.style.display = totalItens > 0 ? 'inline' : 'none';
        }
    }

    setupModal() {
        const modal = document.getElementById('modal-confirmacao');
        const cancelar = document.getElementById('modal-cancelar');
        const fechar = document.querySelector('.close');

        cancelar?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        fechar?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    mostrarModal(mensagem, callback) {
        const modal = document.getElementById('modal-confirmacao');
        const modalMensagem = document.getElementById('modal-mensagem');
        const confirmar = document.getElementById('modal-confirmar');

        modalMensagem.textContent = mensagem;
        modal.style.display = 'block';

        const novoConfirmar = confirmar.cloneNode(true);
        confirmar.parentNode.replaceChild(novoConfirmar, confirmar);

        novoConfirmar.addEventListener('click', () => {
            callback();
            modal.style.display = 'none';
        });
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
                document.body.removeChild(notificacao);
            }, 300);
        }, 3000);
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
    window.carrinhoManager = new CarrinhoManager();
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
