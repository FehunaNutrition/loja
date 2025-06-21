// Sistema Administrativo - Fehuna Nutrition com Firebase
import { ecommerceService } from './ecommerce-service.js';
import { CONFIG } from './config.js';

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.orders = [];
        this.clients = [];
        this.drivers = [];
        this.products = [];
        this.stats = {};
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.authChecked = false;
        
        // Listeners em tempo real
        this.ordersListener = null;
        this.productsListener = null;
        this.notificationsListener = null;
        
        this.init();
    }async init() {
        try {
            await this.checkAdminAuth();
            this.setupNavigation();
            this.setupSidebar();
            this.setupEventListeners();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Erro na inicialização do admin:', error);
            // Não redirecionar automaticamente em caso de erro
        }
    }    // Verificar autenticação de admin
    async checkAdminAuth() {
        console.log('Verificando autenticação admin...');
        
        // Evitar múltiplas verificações
        if (this.authChecked) {
            return true;
        }

        try {
            // Verificar se há dados no localStorage
            const adminUser = localStorage.getItem('adminUser');
            if (!adminUser) {
                console.log('Nenhum adminUser no localStorage');
                this.redirectToLogin();
                return false;
            }

            const userData = JSON.parse(adminUser);
            console.log('Dados do admin no localStorage:', userData);
            
            // Aguardar um tempo para o Firebase carregar
            await this.waitForFirebaseAuth();

            const user = ecommerceService.currentUser;
            console.log('Usuário atual do Firebase:', user?.uid);
            
            // Se não há usuário autenticado no Firebase
            if (!user) {
                console.log('Usuário não autenticado no Firebase');
                this.redirectToLogin();
                return false;
            }

            // Se o UID não confere
            if (user.uid !== userData.uid) {
                console.log('UID não confere:', user.uid, 'vs', userData.uid);
                this.redirectToLogin();
                return false;
            }

            // Marcar como verificado para evitar loops
            this.authChecked = true;

            // Atualizar info do admin na UI
            this.updateAdminUI(userData, user);
            
            console.log('Autenticação admin OK');
            return true;

        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
            this.redirectToLogin();
            return false;
        }
    }

    async waitForFirebaseAuth() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkAuth = () => {
                attempts++;
                
                if (ecommerceService.currentUser !== null) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('Timeout aguardando autenticação Firebase');
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            
            checkAuth();
        });
    }    redirectToLogin() {
        if (this.authChecked) return; // Evitar múltiplos redirecionamentos
        
        console.log('Redirecionando para login...');
        localStorage.removeItem('adminUser');
        
        // Adicionar um pequeno delay para evitar loops
        setTimeout(() => {
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'admin-login.html';
            }
        }, 100);
    }

    updateAdminUI(userData, user) {
        try {
            const adminNameElement = document.getElementById('admin-name');
            if (adminNameElement) {
                adminNameElement.textContent = userData.name || user.email || 'Administrador';
            }
            
            const adminEmailElement = document.getElementById('admin-email');
            if (adminEmailElement) {
                adminEmailElement.textContent = user.email || userData.email;
            }
        } catch (error) {
            console.warn('Erro ao atualizar UI do admin:', error);
        }
    }

    // Configurar listeners em tempo real
    setupRealTimeListeners() {
        // Listener para pedidos
        this.ordersListener = ecommerceService.listenToOrders((orders) => {
            this.orders = orders;
            if (this.currentSection === 'orders') {
                this.displayOrders();
            }
            this.updateOrdersStats();
        });

        // Listener para produtos
        this.productsListener = ecommerceService.listenToProducts((products) => {
            this.products = products;
            if (this.currentSection === 'products') {
                this.displayProducts();
            }
        });

        // Listener para notificações
        this.notificationsListener = ecommerceService.listenToNotifications('admin', (notifications) => {
            this.displayNotifications(notifications);
        });
    }

    // Configurar navegação entre seções
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.admin-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = link.getAttribute('data-section');
                this.switchSection(sectionName);
            });
        });
    }    // Alternar entre seções
    switchSection(sectionName) {
        // Remover active de todos os links e seções
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Ativar seção atual
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        const activeSection = document.getElementById(`${sectionName}-section`);

        if (activeLink && activeSection) {
            activeLink.classList.add('active');
            activeSection.classList.add('active');
            this.currentSection = sectionName;
            
            // Carregar dados da seção
            this.loadSectionData(sectionName);
        } else {
            console.error(`Seção não encontrada: ${sectionName}`);
        }
    }

    // Carregar dados específicos da seção
    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'pedidos':
                    this.displayOrders();
                    break;
                case 'produtos':
                    this.displayProducts();
                    break;
                case 'clientes':
                    this.displayClients();
                    break;
                case 'entregadores':
                    await this.loadDriversData();
                    break;
                case 'cupons':
                    await this.loadCouponsData();
                    break;
                case 'relatorios':
                    await this.loadReportsData();
                    break;
                case 'configuracoes':
                    this.loadSettingsData();
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar dados da seção ${sectionName}:`, error);
            this.showNotification(`Erro ao carregar ${sectionName}`, 'error');
        }
    }

    // Configurar sidebar
    setupSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('admin-sidebar');
        const mainContent = document.querySelector('.admin-main');

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        // Logout
        document.getElementById('logout-admin').addEventListener('click', () => {
            this.handleLogout();
        });

        // Refresh pedidos
        const refreshBtn = document.getElementById('refresh-pedidos');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadOrders();
            });
        }

        // Filtro de status
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterOrders();
            });
        }

        // Filtro de data
        const filterDateBtn = document.getElementById('filter-date');
        if (filterDateBtn) {
            filterDateBtn.addEventListener('click', () => {
                this.filterByDate();
            });
        }

        // Adicionar produto
        const addProductBtn = document.getElementById('add-produto');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.showAddProductModal();
            });
        }

        // Adicionar entregador
        const addDriverBtn = document.getElementById('add-entregador');
        if (addDriverBtn) {
            addDriverBtn.addEventListener('click', () => {
                this.showAddDriverModal();
            });
        }

        // Busca de clientes
        const searchClients = document.getElementById('search-clientes');
        if (searchClients) {
            searchClients.addEventListener('input', () => {
                this.searchClients();
            });
        }
    }

    // Carregar dados da seção
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'pedidos':
                this.loadOrders();
                break;
            case 'produtos':
                this.loadProducts();
                break;
            case 'clientes':
                this.loadClients();
                break;
            case 'entregadores':
                this.loadDrivers();
                break;
            case 'cupons':
                this.loadCoupons();
                break;
            case 'relatorios':
                this.loadReports();
                break;
            case 'configuracoes':
                this.loadSettings();
                break;
        }
    }    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            // Carregar estatísticas do Firebase
            this.stats = await ecommerceService.getDashboardStats('today');
            this.updateDashboardUI();

            // Carregar pedidos recentes
            this.orders = await ecommerceService.getOrders({ limit: 10 });
            this.displayRecentOrders();

            // Carregar produtos mais vendidos
            const topProducts = await ecommerceService.getTopSellingProducts(5);
            this.displayTopProducts(topProducts);

            // Carregar clientes
            this.clients = await ecommerceService.getAllUsers();
            this.updateClientsCount();

            // Carregar entregadores
            this.drivers = await ecommerceService.getDrivers();
            this.updateDriversCount();

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.showNotification('Erro ao carregar dados do dashboard', 'error');
        }
    }

    // Atualizar UI do dashboard
    updateDashboardUI() {
        // Atualizar estatísticas principais
        document.getElementById('pedidos-hoje').textContent = this.stats.totalOrders || 0;
        document.getElementById('faturamento-hoje').textContent = this.formatCurrency(this.stats.totalRevenue || 0);
        document.getElementById('novos-clientes').textContent = this.stats.newCustomers || 0;
        document.getElementById('avaliacao-media').textContent = '4.8';

        // Atualizar gráfico de vendas
        this.updateSalesChart();
    }

    // Exibir pedidos recentes
    displayRecentOrders() {
        const container = document.getElementById('recent-orders-container');
        if (!container) return;

        container.innerHTML = '';

        this.orders.slice(0, 5).forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'recent-order-item';
            orderElement.innerHTML = `
                <div class="order-info">
                    <strong>#${order.orderId || order.id}</strong>
                    <span class="order-customer">${order.customer?.name || 'Cliente não informado'}</span>
                    <small class="order-time">${this.formatDate(order.createdAt)}</small>
                </div>
                <div class="order-meta">
                    <span class="order-total">${this.formatCurrency(order.total)}</span>
                    <span class="order-status status-${order.status}">${this.getStatusLabel(order.status)}</span>
                </div>
            `;
            container.appendChild(orderElement);
        });
    }

    // Exibir produtos mais vendidos
    displayTopProducts(products) {
        const container = document.getElementById('top-products-container');
        if (!container) return;

        container.innerHTML = '';

        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'top-product-item';
            productElement.innerHTML = `
                <div class="product-info">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/40'}" alt="${product.name}">
                    <div>
                        <strong>${product.name}</strong>
                        <small>${product.category}</small>
                    </div>
                </div>
                <div class="product-stats">
                    <span class="sales-count">${product.sales || 0} vendas</span>
                    <span class="revenue">${this.formatCurrency((product.sales || 0) * (product.price || 0))}</span>
                </div>
            `;
            container.appendChild(productElement);
        });
    }

    // Gerar estatísticas do dashboard
    async generateDashboardStats() {
        // Simular dados - em produção viria do Firebase
        return {
            pedidosHoje: Math.floor(Math.random() * 50) + 10,
            faturamentoHoje: (Math.random() * 5000 + 1000),
            novosClientes: Math.floor(Math.random() * 20) + 5,
            avaliacaoMedia: 4.8,
            vendasSemana: [
                { dia: 'Seg', valor: 1200 },
                { dia: 'Ter', valor: 1800 },
                { dia: 'Qua', valor: 1500 },
                { dia: 'Qui', valor: 2200 },
                { dia: 'Sex', valor: 2800 },
                { dia: 'Sáb', valor: 3200 },
                { dia: 'Dom', valor: 2100 }
            ],
            topProdutos: [
                { nome: 'Whey Protein', vendas: 45, imagem: 'https://via.placeholder.com/40' },
                { nome: 'Creatina', vendas: 38, imagem: 'https://via.placeholder.com/40' },
                { nome: 'BCAA', vendas: 32, imagem: 'https://via.placeholder.com/40' },
                { nome: 'Pré-Treino', vendas: 28, imagem: 'https://via.placeholder.com/40' }
            ]
        };
    }

    // Atualizar UI do dashboard
    updateDashboardUI() {
        document.getElementById('total-pedidos').textContent = this.stats.pedidosHoje;
        document.getElementById('faturamento-dia').textContent = this.formatCurrency(this.stats.faturamentoHoje);
        document.getElementById('novos-clientes').textContent = this.stats.novosClientes;
        document.getElementById('avaliacao-media').textContent = this.stats.avaliacaoMedia;

        this.updateTopProducts();
        // this.updateSalesChart(); // Implementar com Chart.js se necessário
    }

    // Atualizar produtos mais vendidos
    updateTopProducts() {
        const container = document.getElementById('top-products');
        container.innerHTML = '';

        this.stats.topProdutos.forEach(produto => {
            const div = document.createElement('div');
            div.className = 'product-item';
            div.innerHTML = `
                <img src="${produto.imagem}" alt="${produto.nome}">
                <div class="product-info">
                    <div class="product-name">${produto.nome}</div>
                    <div class="product-sales">${produto.vendas} vendas</div>
                </div>
            `;
            container.appendChild(div);
        });
    }    // Carregar pedidos
    async loadOrders() {
        try {
            this.orders = await ecommerceService.getOrders();
            console.log('Pedidos carregados:', this.orders);
            this.displayOrders();
            this.updateOrdersCount();
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            this.showNotification('Erro ao carregar pedidos', 'error');
        }
    }

    // Gerar pedidos de exemplo
    async generateSampleOrders() {
        const statuses = ['pendente', 'confirmado', 'preparando', 'saiu_entrega', 'entregue'];
        const clientes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima'];
        
        return Array.from({ length: 20 }, (_, i) => ({
            id: `ORD${String(i + 1).padStart(4, '0')}`,
            cliente: clientes[Math.floor(Math.random() * clientes.length)],
            data: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
            valor: Math.random() * 300 + 50,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            entregador: Math.random() > 0.5 ? 'João Entregador' : null
        }));
    }

    // Atualizar tabela de pedidos
    updateOrdersTable() {
        const tbody = document.getElementById('pedidos-tbody');
        tbody.innerHTML = '';

        this.orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.cliente}</td>
                <td>${order.data}</td>
                <td>${this.formatCurrency(order.valor)}</td>
                <td><span class="status-badge ${order.status}">${this.getStatusLabel(order.status)}</span></td>
                <td>${order.entregador || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editOrder('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${order.status !== 'entregue' ? `
                        <button class="btn btn-sm btn-success" onclick="adminPanel.updateOrderStatus('${order.id}', 'next')">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Atualizar contador de pedidos
    updateOrdersCount() {
        const pendingOrders = this.orders.filter(order => 
            ['pendente', 'confirmado', 'preparando', 'saiu_entrega'].includes(order.status)
        ).length;
        document.getElementById('pedidos-count').textContent = pendingOrders;
    }

    // Filtrar pedidos por status
    filterOrders() {
        const statusFilter = document.getElementById('status-filter').value;
        let filteredOrders = this.orders;

        if (statusFilter) {
            filteredOrders = this.orders.filter(order => order.status === statusFilter);
        }

        this.displayFilteredOrders(filteredOrders);
    }

    // Exibir pedidos filtrados
    displayFilteredOrders(orders) {
        const tbody = document.getElementById('pedidos-tbody');
        tbody.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.cliente}</td>
                <td>${order.data}</td>
                <td>${this.formatCurrency(order.valor)}</td>
                <td><span class="status-badge ${order.status}">${this.getStatusLabel(order.status)}</span></td>
                <td>${order.entregador || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editOrder('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${order.status !== 'entregue' ? `
                        <button class="btn btn-sm btn-success" onclick="adminPanel.updateOrderStatus('${order.id}', 'next')">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }    // Carregar produtos
    async loadProducts() {
        try {
            this.products = await ecommerceService.getProducts();
            console.log('Produtos carregados:', this.products);
            this.displayProducts();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.showNotification('Erro ao carregar produtos', 'error');
        }
    }

    // Gerar produtos de exemplo
    async generateSampleProducts() {
        const categorias = ['Proteínas', 'Aminoácidos', 'Vitaminas', 'Pré-treino'];
        const nomes = ['Whey Protein', 'Creatina', 'BCAA', 'Vitamina D', 'Pré-treino'];
        
        return Array.from({ length: 15 }, (_, i) => ({
            id: i + 1,
            nome: nomes[Math.floor(Math.random() * nomes.length)] + ` ${i + 1}`,
            categoria: categorias[Math.floor(Math.random() * categorias.length)],
            preco: Math.random() * 200 + 30,
            estoque: Math.floor(Math.random() * 100) + 10,
            status: Math.random() > 0.2 ? 'ativo' : 'inativo',
            imagem: 'https://via.placeholder.com/50'
        }));
    }

    // Atualizar tabela de produtos
    updateProductsTable() {
        const tbody = document.getElementById('produtos-tbody');
        tbody.innerHTML = '';

        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.imagem}" alt="${product.nome}"></td>
                <td>${product.nome}</td>
                <td>${product.categoria}</td>
                <td>${this.formatCurrency(product.preco)}</td>
                <td>${product.estoque}</td>
                <td><span class="status-badge ${product.status}">${product.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Carregar clientes
    async loadClients() {
        try {
            this.clients = await this.generateSampleClients();
            this.updateClientsTable();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    // Gerar clientes de exemplo
    async generateSampleClients() {
        const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima'];
        const niveis = ['Bronze', 'Prata', 'Ouro', 'Platina'];
        
        return Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            nome: nomes[Math.floor(Math.random() * nomes.length)] + ` ${i + 1}`,
            email: `cliente${i + 1}@email.com`,
            telefone: `(11) 9${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            pedidos: Math.floor(Math.random() * 20) + 1,
            totalGasto: Math.random() * 2000 + 100,
            nivel: niveis[Math.floor(Math.random() * niveis.length)]
        }));
    }

    // Atualizar tabela de clientes
    updateClientsTable() {
        const tbody = document.getElementById('clientes-tbody');
        tbody.innerHTML = '';

        this.clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.nome}</td>
                <td>${client.email}</td>
                <td>${client.telefone}</td>
                <td>${client.pedidos}</td>
                <td>${this.formatCurrency(client.totalGasto)}</td>
                <td><span class="status-badge ${client.nivel.toLowerCase()}">${client.nivel}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewClient(${client.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editClient(${client.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Carregar entregadores
    async loadDrivers() {
        // Implementar carregamento de entregadores
        console.log('Carregando entregadores...');
    }

    // Carregar cupons
    async loadCoupons() {
        // Implementar carregamento de cupons
        console.log('Carregando cupons...');
    }

    // Carregar relatórios
    async loadReports() {
        // Implementar carregamento de relatórios
        console.log('Carregando relatórios...');
    }

    // Carregar configurações
    async loadSettings() {
        // Implementar carregamento de configurações
        console.log('Carregando configurações...');
    }

    // Ações de pedidos
    viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            this.showOrderModal(order);
        }
    }

    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            this.showEditOrderModal(order);
        }
    }

    updateOrderStatus(orderId, action) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const statusOrder = ['pendente', 'confirmado', 'preparando', 'saiu_entrega', 'entregue'];
            const currentIndex = statusOrder.indexOf(order.status);
            
            if (action === 'next' && currentIndex < statusOrder.length - 1) {
                order.status = statusOrder[currentIndex + 1];
                this.updateOrdersTable();
                this.showNotification(`Pedido ${orderId} atualizado para ${this.getStatusLabel(order.status)}`, 'success');
            }
        }
    }

    // Mostrar modal de pedido
    showOrderModal(order) {
        const modal = document.getElementById('modal-pedido');
        const details = document.getElementById('pedido-details');
        
        document.getElementById('pedido-id').textContent = order.id;
        details.innerHTML = `
            <div class="order-details">
                <h4>Informações do Cliente</h4>
                <p><strong>Nome:</strong> ${order.cliente}</p>
                <p><strong>Data:</strong> ${order.data}</p>
                <p><strong>Status:</strong> <span class="status-badge ${order.status}">${this.getStatusLabel(order.status)}</span></p>
                <p><strong>Valor:</strong> ${this.formatCurrency(order.valor)}</p>
                <p><strong>Entregador:</strong> ${order.entregador || 'Não atribuído'}</p>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // Fechar modal
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // ========== GESTÃO DE PEDIDOS ==========
    
    // Exibir pedidos na seção de pedidos
    displayOrders() {
        const container = document.getElementById('orders-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.orders.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum pedido encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'admin-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Entregador</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="orders-tbody"></tbody>
        `;

        container.appendChild(table);

        const tbody = table.querySelector('#orders-tbody');
        this.orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.orderId || order.id}</td>
                <td>${order.customer?.name || 'Cliente não informado'}</td>
                <td>${this.formatDate(order.createdAt)}</td>
                <td>${this.formatCurrency(order.total)}</td>
                <td><span class="status-badge status-${order.status}">${this.getStatusLabel(order.status)}</span></td>
                <td>${order.driverName || '-'}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editOrderStatus('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${order.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="adminPanel.confirmOrder('${order.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Ver detalhes do pedido
    async viewOrderDetails(orderId) {
        try {
            const order = await ecommerceService.getOrder(orderId);
            if (!order) {
                this.showNotification('Pedido não encontrado', 'error');
                return;
            }

            this.showOrderModal(order);
        } catch (error) {
            console.error('Erro ao carregar detalhes do pedido:', error);
            this.showNotification('Erro ao carregar detalhes do pedido', 'error');
        }
    }

    // Mostrar modal com detalhes do pedido
    showOrderModal(order) {
        const modal = document.getElementById('order-details-modal');
        if (!modal) return;

        // Preencher dados do pedido
        document.getElementById('order-modal-id').textContent = order.orderId || order.id;
        document.getElementById('order-modal-customer').textContent = order.customer?.name || 'Cliente não informado';
        document.getElementById('order-modal-date').textContent = this.formatDate(order.createdAt);
        document.getElementById('order-modal-status').textContent = this.getStatusLabel(order.status);
        document.getElementById('order-modal-total').textContent = this.formatCurrency(order.total);

        // Preencher itens do pedido
        const itemsContainer = document.getElementById('order-modal-items');
        itemsContainer.innerHTML = '';

        order.items?.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">Qtd: ${item.quantity}</span>
                </div>
                <span class="item-price">${this.formatCurrency(item.price * item.quantity)}</span>
            `;
            itemsContainer.appendChild(itemElement);
        });

        // Mostrar endereço de entrega
        if (order.deliveryAddress) {
            document.getElementById('order-modal-address').textContent = 
                `${order.deliveryAddress.street}, ${order.deliveryAddress.number} - ${order.deliveryAddress.neighborhood}`;
        }

        modal.style.display = 'block';
    }

    // Confirmar pedido
    async confirmOrder(orderId) {
        try {
            const result = await ecommerceService.updateOrderStatus(orderId, 'confirmed');
            if (result.success) {
                this.showNotification('Pedido confirmado com sucesso!', 'success');
                await this.loadOrders();
            } else {
                this.showNotification('Erro ao confirmar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao confirmar pedido:', error);
            this.showNotification('Erro ao confirmar pedido', 'error');
        }
    }

    // Cancelar pedido
    async cancelOrder(orderId) {
        if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

        try {
            const result = await ecommerceService.updateOrderStatus(orderId, 'cancelled', {
                cancelReason: 'Cancelado pelo administrador'
            });
            
            if (result.success) {
                this.showNotification('Pedido cancelado com sucesso!', 'success');
                await this.loadOrders();
            } else {
                this.showNotification('Erro ao cancelar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            this.showNotification('Erro ao cancelar pedido', 'error');
        }
    }

    editOrderStatus(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const newStatus = prompt('Novo status do pedido:', order.status);
        if (newStatus && newStatus !== order.status) {
            this.updateOrderStatus(orderId, newStatus);
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const result = await ecommerceService.updateOrderStatus(orderId, newStatus);
            if (result.success) {
                this.showNotification('Status do pedido atualizado!', 'success');
                await this.loadOrders();
            } else {
                this.showNotification('Erro ao atualizar status', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.showNotification('Erro ao atualizar status', 'error');
        }
    }

    // ========== ATUALIZAÇÃO DE CONTADORES ==========
    
    updateOrdersCount() {
        const badge = document.getElementById('pedidos-count');
        if (badge) {
            const pendingOrders = this.orders.filter(order => order.status === 'pending').length;
            badge.textContent = pendingOrders;
        }
    }

    // ========== CARREGAMENTO DO DASHBOARD ==========
    
    async loadDashboardData() {
        try {
            const stats = await ecommerceService.getDashboardStats();
            
            // Atualizar estatísticas na UI
            document.getElementById('total-pedidos').textContent = stats.todayOrders;
            document.getElementById('faturamento-dia').textContent = this.formatCurrency(stats.todayRevenue);
            document.getElementById('novos-clientes').textContent = stats.newClients;
            document.getElementById('avaliacao-media').textContent = (stats.averageRating || 0).toFixed(1);
            
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.showNotification('Erro ao carregar estatísticas', 'error');
        }
    }

    // ========== CARREGAMENTO DE CLIENTES ==========
    
    async loadClients() {
        try {
            this.clients = await ecommerceService.getClients();
            this.displayClients();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.showNotification('Erro ao carregar clientes', 'error');
        }
    }

    displayClients() {
        const container = document.getElementById('clients-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.clients.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum cliente encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'admin-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Data Cadastro</th>
                    <th>Pedidos</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="clients-tbody"></tbody>
        `;

        container.appendChild(table);

        const tbody = table.querySelector('#clients-tbody');
        this.clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.name || 'Não informado'}</td>
                <td>${client.email}</td>
                <td>${client.phone || 'Não informado'}</td>
                <td>${this.formatDate(client.createdAt)}</td>
                <td>0</td> <!-- TODO: Calcular número de pedidos -->
                <td class="actions">
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewClientDetails('${client.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.editClient('${client.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Carregar entregadores
    async loadDrivers() {
        // Implementar carregamento de entregadores
        console.log('Carregando entregadores...');
    }

    // Carregar cupons
    async loadCoupons() {
        // Implementar carregamento de cupons
        console.log('Carregando cupons...');
    }

    // Carregar relatórios
    async loadReports() {
        // Implementar carregamento de relatórios
        console.log('Carregando relatórios...');
    }

    // Carregar configurações
    async loadSettings() {
        // Implementar carregamento de configurações
        console.log('Carregando configurações...');
    }    // ========== GESTÃO DE MODALS ==========
      showAddProductModal() {
        console.log('showAddProductModal chamado');
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        console.log('Modal:', modal, 'Title:', title, 'Form:', form);
        
        if (modal && title && form) {
            title.textContent = 'Novo Produto';
            form.reset();
            modal.style.display = 'block';
            
            // Configurar submit do formulário
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveProduct(new FormData(form));
            };
        } else {
            console.error('Elementos do modal não encontrados');
        }
    }

    showEditProductModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        if (modal && title && form) {
            title.textContent = 'Editar Produto';
            
            // Preencher formulário
            form.name.value = product.name || '';
            form.description.value = product.description || '';
            form.price.value = product.price || '';
            form.category.value = product.category || '';
            form.stock.value = product.stock || '';
            form.status.value = product.status || 'active';
            form.image1.value = product.images?.[0] || '';
            form.image2.value = product.images?.[1] || '';
            
            modal.style.display = 'block';
            
            // Configurar submit do formulário
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveProduct(new FormData(form), productId);
            };
        }
    }    async saveProduct(formData, productId = null) {
        try {
            console.log('Salvando produto...', productId ? 'Atualização' : 'Criação');
            console.log('ecommerceService disponível:', !!ecommerceService);
            console.log('Métodos disponíveis:', Object.getOwnPropertyNames(ecommerceService.__proto__));
            
            const productData = {
                name: formData.get('name'),
                description: formData.get('description'),
                price: parseFloat(formData.get('price')),
                category: formData.get('category'),
                stock: parseInt(formData.get('stock')),
                status: formData.get('status') || 'active',
                images: [
                    formData.get('image1'),
                    formData.get('image2')
                ].filter(img => img && img.trim())
            };

            console.log('Dados do produto:', productData);

            // Verificar disponibilidade
            if (!ecommerceService) {
                throw new Error('ecommerceService não está disponível');
            }

            let result;
            if (productId) {
                console.log('Verificando updateProduct:', typeof ecommerceService.updateProduct);
                if (typeof ecommerceService.updateProduct !== 'function') {
                    throw new Error('Método updateProduct não está disponível');
                }
                result = await ecommerceService.updateProduct(productId, productData);
            } else {
                console.log('Verificando createProduct:', typeof ecommerceService.createProduct);
                console.log('Verificando addProduct:', typeof ecommerceService.addProduct);
                
                if (typeof ecommerceService.createProduct === 'function') {
                    result = await ecommerceService.createProduct(productData);
                } else if (typeof ecommerceService.addProduct === 'function') {
                    result = await ecommerceService.addProduct(productData);
                } else {
                    throw new Error('Nenhum método de criação de produto está disponível');
                }
            }

            console.log('Resultado da operação:', result);

            if (result && result.success) {
                this.showNotification(
                    `Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`, 
                    'success'
                );
                this.closeModal('product-modal');
                await this.loadProducts(); // Recarregar lista
            } else {
                this.showNotification(result?.error || 'Erro ao salvar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            this.showNotification(error.message || 'Erro ao salvar produto', 'error');
        }
    }

    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('order-details-modal');
        if (!modal) return;

        // Preencher dados do modal
        document.getElementById('order-modal-id').textContent = order.id;
        document.getElementById('order-modal-customer').textContent = order.customer?.name || 'Não informado';
        document.getElementById('order-modal-date').textContent = this.formatDate(order.createdAt);
        document.getElementById('order-modal-status').textContent = this.getStatusLabel(order.status);
        document.getElementById('order-modal-total').textContent = this.formatCurrency(order.total);
        document.getElementById('order-modal-address').textContent = order.address || 'Endereço não informado';

        // Preencher itens
        const itemsContainer = document.getElementById('order-modal-items');
        itemsContainer.innerHTML = '';
        
        order.items?.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-item';
            itemDiv.innerHTML = `
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">Qtd: ${item.quantity}</span>
                <span class="item-price">${this.formatCurrency(item.price * item.quantity)}</span>
            `;
            itemsContainer.appendChild(itemDiv);
        });

        modal.style.display = 'block';
    }

    // Fechar modal genérico
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Formatar moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }    // Formatar data
    formatDate(dateInput) {
        try {
            let date;
            
            // Verificar se é um Timestamp do Firestore
            if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
                date = dateInput.toDate();
            }
            // Verificar se é uma string de data ISO
            else if (typeof dateInput === 'string') {
                date = new Date(dateInput);
            }
            // Verificar se já é um objeto Date
            else if (dateInput instanceof Date) {
                date = dateInput;
            }
            // Se for um número (timestamp em milissegundos)
            else if (typeof dateInput === 'number') {
                date = new Date(dateInput);
            }
            else {
                // Valor inválido, retornar data atual
                console.warn('Data inválida recebida:', dateInput);
                date = new Date();
            }
            
            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
                console.warn('Data inválida após conversão:', dateInput);
                return 'Data inválida';
            }
            
            const options = {
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'America/Sao_Paulo'
            };
            
            return new Intl.DateTimeFormat('pt-BR', options).format(date);
        } catch (error) {
            console.error('Erro ao formatar data:', error, 'Input:', dateInput);
            return 'Data inválida';
        }
    }

    // Obter rótulo de status
    getStatusLabel(status) {
        const statusLabels = {
            pending: 'Pendente',
            confirmed: 'Confirmado',
            preparing: 'Preparando',
            out_for_delivery: 'Saiu para entrega',
            delivered: 'Entregue',
            cancelled: 'Cancelado'
        };
        return statusLabels[status] || 'Desconhecido';
    }

    // Atualizar gráfico de vendas (exemplo com Chart.js)
    updateSalesChart() {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        const labels = this.stats.vendasSemana.map(venda => venda.dia);
        const data = this.stats.vendasSemana.map(venda => venda.valor);

        if (this.salesChart) {
            this.salesChart.destroy();
        }

        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas da Semana',
                    data: data,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Exibir produtos
    displayProducts() {
        const container = document.getElementById('products-container');
        if (!container) {
            console.error('Container products-container não encontrado');
            return;
        }

        container.innerHTML = '';

        if (!this.products || this.products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open fa-3x"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Clique em "Novo Produto" ou "Criar Produtos Exemplo" para começar.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'products-grid';

        this.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/200x150?text=Produto';
            const statusClass = product.status === 'active' ? 'active' : 'inactive';
            const statusText = product.status === 'active' ? 'Ativo' : 'Inativo';
            
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/200x150?text=Produto'">
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="product-category">${product.category || 'Sem categoria'}</p>
                    <p class="product-description">${(product.description || '').substring(0, 80)}${product.description && product.description.length > 80 ? '...' : ''}</p>
                    <p class="product-price">${this.formatCurrency(product.price || 0)}</p>
                    <p class="product-stock">Estoque: ${product.stock || 0}</p>
                    <div class="product-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.toggleProductStatus('${product.id}')">
                        <i class="fas fa-power-off"></i> ${product.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            
            grid.appendChild(productCard);
        });

        container.appendChild(grid);
        console.log('Produtos exibidos:', this.products.length);
    }
}

// Inicializar painel admin
const adminPanel = new AdminPanel();

// Tornar adminPanel global para uso nos onclick do HTML
window.adminPanel = adminPanel;

// ========== FUNÇÃO TEMPORÁRIA PARA CRIAR PRODUTOS DE EXEMPLO ==========

window.criarProdutosExemplo = async function() {
        const produtosExemplo = [
            {
                name: 'Whey Protein 1kg',
                description: 'Proteína de alta qualidade para construção muscular',
                price: 89.90,
                category: 'Proteínas',
                stock: 50,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300']
            },
            {
                name: 'Creatina 300g',
                description: 'Creatina monohidratada pura para ganho de força',
                price: 45.90,
                category: 'Aminoácidos',
                stock: 30,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300']
            },
            {
                name: 'BCAA 2:1:1',
                description: 'Aminoácidos de cadeia ramificada para recuperação muscular',
                price: 55.90,
                category: 'Aminoácidos',
                stock: 25,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300']
            },
            {
                name: 'Vitamina D3 60 caps',
                description: 'Suplemento de vitamina D3 para fortalecimento ósseo',
                price: 29.90,
                category: 'Vitaminas',
                stock: 40,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300']
            },
            {
                name: 'Pré-treino Explosive',
                description: 'Pré-treino com cafeína e beta-alanina para energia extra',
                price: 69.90,
                category: 'Pré-treino',
                stock: 20,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300']
            },
            {
                name: 'Multivitamínico 90 caps',
                description: 'Complexo vitamínico completo para saúde geral',
                price: 39.90,
                category: 'Vitaminas',
                stock: 35,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1550572017-edd951aa8742?w=300']
            }
        ];        try {
            console.log('Criando produtos de exemplo...');
            console.log('ecommerceService disponível:', !!ecommerceService);
            
            for (const produto of produtosExemplo) {
                console.log(`Criando produto: ${produto.name}`);
                
                let result;
                if (typeof ecommerceService.createProduct === 'function') {
                    result = await ecommerceService.createProduct(produto);
                } else if (typeof ecommerceService.addProduct === 'function') {
                    result = await ecommerceService.addProduct(produto);
                } else {
                    console.error('Nenhum método de criação disponível');
                    continue;
                }
                
                if (result && result.success) {
                    console.log(`✅ Produto criado: ${produto.name}`);
                } else {
                    console.error(`❌ Erro ao criar produto ${produto.name}:`, result?.error);
                }
            }
            
            adminPanel.showNotification('Produtos de exemplo criados com sucesso!', 'success');
            await adminPanel.loadProducts(); // Recarregar lista
            
        } catch (error) {
            console.error('Erro ao criar produtos de exemplo:', error);
            adminPanel.showNotification('Erro ao criar produtos de exemplo: ' + error.message, 'error');
        }
    };

