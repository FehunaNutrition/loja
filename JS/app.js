import { produtos } from './produtos-exemplo.js';

// Estado da aplicação
let carrinhoItens = JSON.parse(localStorage.getItem('carrinho')) || [];
let produtosFiltrados = produtos;
let produtosExibidos = 6; // Inicialmente mostrar 6 produtos

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

function inicializarApp() {
    configurarNavegacao();
    exibirProdutos();
    configurarFiltros();
    configurarCarrinho();
    configurarNewsletter();
    atualizarContadorCarrinho();
    configurarScrollSuave();
}

// Configuração da navegação mobile
function configurarNavegacao() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Configurar dropdown em dispositivos móveis
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (toggle && menu) {
                toggle.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    }
                });
            }
        });
        
        // Fechar dropdown ao clicar fora (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                dropdowns.forEach(dropdown => {
                    const menu = dropdown.querySelector('.dropdown-menu');
                    if (menu && !dropdown.contains(e.target)) {
                        menu.style.display = 'none';
                    }
                });
            }
        });
        
        // Fechar menu ao clicar em link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// Exibir produtos no grid
function exibirProdutos(produtosParaExibir = produtosFiltrados.slice(0, produtosExibidos)) {
    const grid = document.getElementById('produtos-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    produtosParaExibir.forEach(produto => {
        const card = criarCardProduto(produto);
        grid.appendChild(card);
    });
    
    // Configurar botão "Ver Mais"
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = produtosExibidos >= produtosFiltrados.length ? 'none' : 'block';
        
        loadMoreBtn.onclick = () => {
            produtosExibidos += 6;
            exibirProdutos();
        };
    }
}

// Criar card de produto
function criarCardProduto(produto) {
    const card = document.createElement('div');
    card.className = 'produto-card';
    card.setAttribute('data-categoria', produto.categoria);
    
    card.innerHTML = `
        <img src="${produto.imagem}" alt="${produto.nome}" class="produto-img" loading="lazy">
        <h4>${produto.nome}</h4>
        <p>${produto.descricao}</p>
        <span class="preco">${formatCurrency(produto.preco)}</span>
        <div class="produto-actions">
            <button class="btn btn-primary" onclick="adicionarAoCarrinho(${produto.id})">
                <i class="fas fa-cart-plus"></i> Adicionar
            </button>
            <button class="btn btn-outline" onclick="verDetalhes(${produto.id})">
                Ver Detalhes
            </button>
        </div>
    `;
    
    return card;
}

// Configurar filtros de categoria
function configurarFiltros() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Atualizar botão ativo
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filtrar produtos
            const categoria = btn.getAttribute('data-category');
            
            if (categoria === 'todos') {
                produtosFiltrados = produtos;
            } else {
                produtosFiltrados = produtos.filter(p => p.categoria === categoria);
            }
            
            // Resetar exibição
            produtosExibidos = 6;
            exibirProdutos();
        });
    });
}

// Funções do carrinho
function adicionarAoCarrinho(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const itemExistente = carrinhoItens.find(item => item.id === produtoId);
    
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinhoItens.push({
            ...produto,
            quantidade: 1
        });
    }
    
    salvarCarrinho();
    atualizarContadorCarrinho();
    mostrarNotificacao(`${produto.nome} adicionado ao carrinho!`);
}

function configurarCarrinho() {
    // Implementar lógica do carrinho se necessário
}

function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinhoItens));
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (contador) {
        const totalItens = carrinhoItens.reduce((total, item) => total + item.quantidade, 0);
        contador.textContent = totalItens;
        contador.style.display = totalItens > 0 ? 'inline' : 'none';
    }
}

// Função para ver detalhes do produto
function verDetalhes(produtoId) {
    window.location.href = `loja/produto.html?id=${produtoId}`;
}

// Configurar newsletter
function configurarNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            
            // Simular cadastro na newsletter
            mostrarNotificacao('E-mail cadastrado com sucesso! Você receberá nossas ofertas exclusivas.');
            form.reset();
        });
    }
}

// Configurar scroll suave
function configurarScrollSuave() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Mostrar notificação
function mostrarNotificacao(mensagem) {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao';
    notificacao.textContent = mensagem;
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-medium);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificacao);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notificacao.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notificacao);
        }, 300);
    }, 3000);
}

// Função de utilidade para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Adicionar estilos para animações
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
    
    .produto-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    .produto-actions .btn {
        flex: 1;
        padding: 0.8rem 1rem;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);

// Tornar funções globais para uso nos event handlers inline
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.verDetalhes = verDetalhes;
