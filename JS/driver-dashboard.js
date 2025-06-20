// Sistema de Painel do Entregador - Fehuna Nutrition
import { ecommerceService } from './ecommerce-service.js';
import { CONFIG } from './config.js';

class DriverDashboard {
    constructor() {
        this.isOnline = false;
        this.currentDelivery = null;
        this.availableDeliveries = [];
        this.deliveryHistory = [];
        this.stats = {
            entregasHoje: 0,
            ganhosHoje: 0,
            tempoOnline: 0,
            kmPercorridos: 0
        };
        this.onlineStartTime = null;
        this.deliveryTimer = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDriverData();
        this.loadAvailableDeliveries();
        this.loadDeliveryHistory();
        this.updateStats();
        this.checkDriverAuth();
    }

    // Verificar autenticação do entregador
    checkDriverAuth() {
        const isDriver = localStorage.getItem('isDriver') === 'true';
        if (!isDriver) {
            // Redirecionar para login ou página principal
            // window.location.href = '../index.html';
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Toggle status online/offline
        document.getElementById('toggle-status').addEventListener('click', () => {
            this.toggleOnlineStatus();
        });

        // Logout
        document.getElementById('logout-driver').addEventListener('click', () => {
            this.handleLogout();
        });

        // Refresh entregas
        document.getElementById('refresh-deliveries').addEventListener('click', () => {
            this.loadAvailableDeliveries();
        });

        // Filtro de distância
        document.getElementById('distance-filter').addEventListener('change', () => {
            this.filterDeliveries();
        });

        // Filtro de histórico
        document.getElementById('filter-history').addEventListener('click', () => {
            this.filterHistory();
        });

        // Entrega atual - botões
        const confirmPickupBtn = document.getElementById('confirm-pickup');
        const confirmDeliveryBtn = document.getElementById('confirm-delivery');
        const openMapsBtn = document.getElementById('open-maps');

        if (confirmPickupBtn) {
            confirmPickupBtn.addEventListener('click', () => {
                this.confirmPickup();
            });
        }

        if (confirmDeliveryBtn) {
            confirmDeliveryBtn.addEventListener('click', () => {
                this.confirmDelivery();
            });
        }

        if (openMapsBtn) {
            openMapsBtn.addEventListener('click', () => {
                this.openMaps();
            });
        }

        // Modais
        this.setupModals();

        // Sistema de avaliação
        this.setupRatingSystem();
    }

    // Configurar modais
    setupModals() {
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.close');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Modal de confirmação - botões
        document.getElementById('modal-cancel').addEventListener('click', () => {
            document.getElementById('modal-confirm').style.display = 'none';
        });

        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            this.handleModalConfirm();
        });
    }

    // Sistema de avaliação
    setupRatingSystem() {
        const stars = document.querySelectorAll('.rating-stars i');
        let selectedRating = 0;

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.rating);
                this.updateStarDisplay(selectedRating);
            });

            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                this.updateStarDisplay(rating);
            });
        });

        document.querySelector('.rating-stars').addEventListener('mouseleave', () => {
            this.updateStarDisplay(selectedRating);
        });

        // Botões do modal de avaliação
        document.getElementById('skip-rating').addEventListener('click', () => {
            document.getElementById('modal-rating').style.display = 'none';
            this.completeDelivery();
        });

        document.getElementById('submit-rating').addEventListener('click', () => {
            this.submitRating(selectedRating);
        });
    }

    // Atualizar display das estrelas
    updateStarDisplay(rating) {
        const stars = document.querySelectorAll('.rating-stars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    // Toggle status online/offline
    toggleOnlineStatus() {
        this.isOnline = !this.isOnline;
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const toggleBtn = document.getElementById('toggle-status');

        if (this.isOnline) {
            statusIndicator.classList.add('online');
            statusText.textContent = 'Online';
            toggleBtn.classList.add('online');
            this.onlineStartTime = new Date();
            this.startOnlineTimer();
            this.showNotification('Você está online! Entregas disponíveis serão exibidas.', 'success');
        } else {
            statusIndicator.classList.remove('online');
            statusText.textContent = 'Offline';
            toggleBtn.classList.remove('online');
            this.onlineStartTime = null;
            this.stopOnlineTimer();
            this.showNotification('Você está offline. Não receberá novas entregas.', 'info');
        }

        this.loadAvailableDeliveries();
    }

    // Iniciar timer de tempo online
    startOnlineTimer() {
        if (this.onlineTimer) clearInterval(this.onlineTimer);
        
        this.onlineTimer = setInterval(() => {
            if (this.onlineStartTime) {
                const now = new Date();
                const diff = now - this.onlineStartTime;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                
                document.getElementById('tempo-online').textContent = `${hours}h ${minutes}m`;
            }
        }, 60000); // Atualizar a cada minuto
    }

    // Parar timer de tempo online
    stopOnlineTimer() {
        if (this.onlineTimer) {
            clearInterval(this.onlineTimer);
            this.onlineTimer = null;
        }
    }

    // Carregar dados do entregador
    loadDriverData() {
        // Simular dados do entregador
        const driverData = {
            name: 'João Silva',
            rating: 4.8,
            totalDeliveries: 142
        };

        document.getElementById('driver-name').textContent = driverData.name;
        document.querySelector('.driver-rating').textContent = `${driverData.rating}★ (${driverData.totalDeliveries} entregas)`;
    }

    // Carregar entregas disponíveis
    async loadAvailableDeliveries() {
        try {
            if (!this.isOnline) {
                document.getElementById('deliveries-grid').innerHTML = `
                    <div class="no-deliveries">
                        <i class="fas fa-power-off"></i>
                        <h3>Você está offline</h3>
                        <p>Ative seu status para ver entregas disponíveis</p>
                    </div>
                `;
                return;
            }

            this.availableDeliveries = await this.generateSampleDeliveries();
            this.displayAvailableDeliveries();
        } catch (error) {
            console.error('Erro ao carregar entregas:', error);
            this.showNotification('Erro ao carregar entregas disponíveis', 'error');
        }
    }

    // Gerar entregas de exemplo
    async generateSampleDeliveries() {
        const addresses = [
            'Rua das Flores, 123 - Centro',
            'Av. Paulista, 456 - Bela Vista',
            'Rua Augusta, 789 - Consolação',
            'Av. Brigadeiro, 321 - Jardins',
            'Rua Oscar Freire, 654 - Cerqueira César'
        ];

        const customers = ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Lima', 'Carlos Oliveira'];
        const paymentMethods = ['Cartão', 'PIX', 'Dinheiro', 'Cartão'];

        return Array.from({ length: 6 }, (_, i) => ({
            id: `DEL${String(i + 1).padStart(3, '0')}`,
            customer: customers[Math.floor(Math.random() * customers.length)],
            address: addresses[Math.floor(Math.random() * addresses.length)],
            distance: (Math.random() * 10 + 0.5).toFixed(1),
            earnings: (Math.random() * 15 + 5).toFixed(2),
            orderValue: (Math.random() * 200 + 50).toFixed(2),
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            estimatedTime: Math.floor(Math.random() * 30 + 10),
            created: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            })
        }));
    }

    // Exibir entregas disponíveis
    displayAvailableDeliveries() {
        const container = document.getElementById('deliveries-grid');
        container.innerHTML = '';

        if (this.availableDeliveries.length === 0) {
            container.innerHTML = `
                <div class="no-deliveries">
                    <i class="fas fa-search"></i>
                    <h3>Nenhuma entrega disponível</h3>
                    <p>Novas entregas aparecerão aqui em breve</p>
                </div>
            `;
            return;
        }

        this.availableDeliveries.forEach(delivery => {
            const deliveryCard = document.createElement('div');
            deliveryCard.className = 'delivery-item';
            deliveryCard.innerHTML = `
                <div class="delivery-item-header">
                    <h4>Pedido #${delivery.id}</h4>
                    <div class="delivery-meta">
                        <span class="distance">
                            <i class="fas fa-map-marker-alt"></i>
                            ${delivery.distance} km
                        </span>
                        <span class="earnings">+R$ ${delivery.earnings}</span>
                    </div>
                </div>
                
                <div class="delivery-item-body">
                    <p><strong>Cliente:</strong> ${delivery.customer}</p>
                    <p class="address"><i class="fas fa-location-arrow"></i> ${delivery.address}</p>
                    <p><strong>Tempo estimado:</strong> ${delivery.estimatedTime} min</p>
                    
                    <div class="payment-info">
                        <span class="payment-method">
                            <i class="fas fa-credit-card"></i>
                            ${delivery.paymentMethod}
                        </span>
                        <span class="order-value">R$ ${delivery.orderValue}</span>
                    </div>
                </div>
                
                <div class="delivery-item-footer">
                    <button class="btn btn-primary btn-full" onclick="driverDashboard.acceptDelivery('${delivery.id}')">
                        <i class="fas fa-check"></i>
                        Aceitar Entrega
                    </button>
                </div>
            `;
            container.appendChild(deliveryCard);
        });
    }

    // Aceitar entrega
    acceptDelivery(deliveryId) {
        const delivery = this.availableDeliveries.find(d => d.id === deliveryId);
        if (!delivery) return;

        // Mostrar modal de confirmação
        const modal = document.getElementById('modal-confirm');
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');
        const deliveryInfo = document.getElementById('modal-delivery-info');

        title.textContent = 'Aceitar Entrega';
        message.textContent = 'Tem certeza que deseja aceitar esta entrega?';
        deliveryInfo.innerHTML = `
            <h5>Detalhes da Entrega</h5>
            <p><strong>Cliente:</strong> ${delivery.customer}</p>
            <p><strong>Endereço:</strong> ${delivery.address}</p>
            <p><strong>Distância:</strong> ${delivery.distance} km</p>
            <p><strong>Ganho:</strong> R$ ${delivery.earnings}</p>
            <p><strong>Valor do pedido:</strong> R$ ${delivery.orderValue}</p>
        `;

        modal.style.display = 'block';
        this.pendingDelivery = delivery;
    }

    // Confirmar ação do modal
    handleModalConfirm() {
        if (this.pendingDelivery) {
            this.currentDelivery = this.pendingDelivery;
            this.startDelivery();
            this.pendingDelivery = null;
        }
        document.getElementById('modal-confirm').style.display = 'none';
    }

    // Iniciar entrega
    startDelivery() {
        // Remover da lista de disponíveis
        this.availableDeliveries = this.availableDeliveries.filter(d => d.id !== this.currentDelivery.id);
        
        // Mostrar seção de entrega atual
        document.getElementById('current-delivery').style.display = 'block';
        
        // Atualizar informações
        document.getElementById('current-customer-name').textContent = this.currentDelivery.customer;
        document.getElementById('current-customer-phone').textContent = '(11) 99999-9999';
        document.getElementById('current-address').textContent = this.currentDelivery.address;
        document.getElementById('current-order-id').textContent = `#${this.currentDelivery.id}`;
        document.getElementById('current-order-value').textContent = `R$ ${this.currentDelivery.orderValue}`;
        document.getElementById('current-payment').textContent = this.currentDelivery.paymentMethod;
        document.getElementById('estimated-time').textContent = `${this.currentDelivery.estimatedTime} min`;
        
        // Iniciar timer
        this.startDeliveryTimer();
        
        // Atualizar lista de entregas disponíveis
        this.displayAvailableDeliveries();
        
        this.showNotification(`Entrega aceita! Dirija-se até ${this.currentDelivery.customer}`, 'success');
    }

    // Iniciar timer da entrega
    startDeliveryTimer() {
        let seconds = 0;
        this.deliveryTimer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            document.getElementById('delivery-timer').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);
    }

    // Parar timer da entrega
    stopDeliveryTimer() {
        if (this.deliveryTimer) {
            clearInterval(this.deliveryTimer);
            this.deliveryTimer = null;
        }
    }

    // Confirmar coleta
    confirmPickup() {
        document.getElementById('confirm-pickup').style.display = 'none';
        document.getElementById('confirm-delivery').style.display = 'inline-flex';
        this.showNotification('Coleta confirmada! Dirija-se para o endereço de entrega.', 'success');
    }

    // Confirmar entrega
    confirmDelivery() {
        this.stopDeliveryTimer();
        document.getElementById('modal-rating').style.display = 'block';
    }

    // Enviar avaliação
    submitRating(rating) {
        const feedback = document.getElementById('delivery-feedback').value;
        
        // Aqui salvaria a avaliação no Firebase
        console.log('Avaliação:', rating, 'Feedback:', feedback);
        
        document.getElementById('modal-rating').style.display = 'none';
        this.completeDelivery();
    }

    // Completar entrega
    completeDelivery() {
        // Atualizar estatísticas
        this.stats.entregasHoje++;
        this.stats.ganhosHoje += parseFloat(this.currentDelivery.earnings);
        this.stats.kmPercorridos += parseFloat(this.currentDelivery.distance);
        
        // Adicionar ao histórico
        const completedDelivery = {
            ...this.currentDelivery,
            completedAt: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            duration: document.getElementById('delivery-timer').textContent,
            rating: 5 // Simulado
        };
        
        this.deliveryHistory.unshift(completedDelivery);
        
        // Limpar entrega atual
        this.currentDelivery = null;
        document.getElementById('current-delivery').style.display = 'none';
        
        // Atualizar displays
        this.updateStats();
        this.displayDeliveryHistory();
        this.loadAvailableDeliveries();
        
        this.showNotification(`Entrega concluída! +R$ ${completedDelivery.earnings} ganhos`, 'success');
    }

    // Abrir maps
    openMaps() {
        if (this.currentDelivery) {
            const address = encodeURIComponent(this.currentDelivery.address);
            const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
            window.open(url, '_blank');
        }
    }

    // Carregar histórico de entregas
    async loadDeliveryHistory() {
        // Simular histórico
        this.deliveryHistory = await this.generateSampleHistory();
        this.displayDeliveryHistory();
    }

    // Gerar histórico de exemplo
    async generateSampleHistory() {
        return Array.from({ length: 8 }, (_, i) => ({
            id: `DEL${String(100 + i).padStart(3, '0')}`,
            customer: 'Cliente ' + (i + 1),
            address: 'Endereço ' + (i + 1),
            completedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            earnings: (Math.random() * 15 + 5).toFixed(2),
            distance: (Math.random() * 10 + 0.5).toFixed(1),
            duration: `${Math.floor(Math.random() * 30 + 10)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            rating: Math.floor(Math.random() * 2) + 4 // 4 ou 5
        }));
    }

    // Exibir histórico de entregas
    displayDeliveryHistory() {
        const container = document.getElementById('history-list');
        container.innerHTML = '';

        this.deliveryHistory.forEach(delivery => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-info">
                    <h4>Pedido #${delivery.id}</h4>
                    <p>${delivery.customer} - ${delivery.completedAt}</p>
                    <p>${delivery.address}</p>
                </div>
                
                <div class="history-stats">
                    <div class="history-stat">
                        <span>R$ ${delivery.earnings}</span>
                        <small>Ganho</small>
                    </div>
                    <div class="history-stat">
                        <span>${delivery.distance} km</span>
                        <small>Distância</small>
                    </div>
                    <div class="history-stat">
                        <span>${delivery.duration}</span>
                        <small>Tempo</small>
                    </div>
                    <div class="history-stat">
                        <span>${delivery.rating}★</span>
                        <small>Avaliação</small>
                    </div>
                </div>
            `;
            container.appendChild(historyItem);
        });
    }

    // Filtrar entregas por distância
    filterDeliveries() {
        const maxDistance = document.getElementById('distance-filter').value;
        let filtered = this.availableDeliveries;

        if (maxDistance) {
            filtered = this.availableDeliveries.filter(delivery => 
                parseFloat(delivery.distance) <= parseFloat(maxDistance)
            );
        }

        // Exibir entregas filtradas (implementar se necessário)
        this.displayFilteredDeliveries(filtered);
    }

    // Exibir entregas filtradas
    displayFilteredDeliveries(deliveries) {
        // Similar ao displayAvailableDeliveries mas com lista filtrada
        const container = document.getElementById('deliveries-grid');
        container.innerHTML = '';

        deliveries.forEach(delivery => {
            const deliveryCard = document.createElement('div');
            deliveryCard.className = 'delivery-item';
            deliveryCard.innerHTML = `
                <div class="delivery-item-header">
                    <h4>Pedido #${delivery.id}</h4>
                    <div class="delivery-meta">
                        <span class="distance">
                            <i class="fas fa-map-marker-alt"></i>
                            ${delivery.distance} km
                        </span>
                        <span class="earnings">+R$ ${delivery.earnings}</span>
                    </div>
                </div>
                
                <div class="delivery-item-body">
                    <p><strong>Cliente:</strong> ${delivery.customer}</p>
                    <p class="address"><i class="fas fa-location-arrow"></i> ${delivery.address}</p>
                    <p><strong>Tempo estimado:</strong> ${delivery.estimatedTime} min</p>
                    
                    <div class="payment-info">
                        <span class="payment-method">
                            <i class="fas fa-credit-card"></i>
                            ${delivery.paymentMethod}
                        </span>
                        <span class="order-value">R$ ${delivery.orderValue}</span>
                    </div>
                </div>
                
                <div class="delivery-item-footer">
                    <button class="btn btn-primary btn-full" onclick="driverDashboard.acceptDelivery('${delivery.id}')">
                        <i class="fas fa-check"></i>
                        Aceitar Entrega
                    </button>
                </div>
            `;
            container.appendChild(deliveryCard);
        });
    }

    // Filtrar histórico por data
    filterHistory() {
        const date = document.getElementById('history-date').value;
        // Implementar filtro por data se necessário
        console.log('Filtrar histórico por data:', date);
    }

    // Atualizar estatísticas
    updateStats() {
        document.getElementById('entregas-hoje').textContent = this.stats.entregasHoje;
        document.getElementById('ganhos-hoje').textContent = this.formatCurrency(this.stats.ganhosHoje);
        document.getElementById('km-percorridos').textContent = `${this.stats.kmPercorridos.toFixed(1)} km`;
    }

    // Logout
    handleLogout() {
        localStorage.removeItem('isDriver');
        this.stopOnlineTimer();
        this.stopDeliveryTimer();
        window.location.href = '../index.html';
    }

    // Utilidades
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

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

// CSS para notificações
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
    
    .no-deliveries {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .no-deliveries i {
        font-size: 3rem;
        color: #ccc;
        margin-bottom: 1rem;
    }
    
    .no-deliveries h3 {
        color: #333;
        margin-bottom: 0.5rem;
    }
    
    .no-deliveries p {
        color: #666;
    }
`;
document.head.appendChild(style);

// Inicializar dashboard do entregador
document.addEventListener('DOMContentLoaded', () => {
    window.driverDashboard = new DriverDashboard();
});
