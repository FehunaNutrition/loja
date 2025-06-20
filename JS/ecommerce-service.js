// Serviços Firebase para o e-commerce - Fehuna Nutrition
import { db, auth, storage } from './firebase-config.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  ref,   uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { CONFIG } from './config.js';

class EcommerceService {
  constructor() {
    this.currentUser = null;
    this.setupAuthListener();
  }

  // ========== AUTENTICAÇÃO ==========
  setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.updateUIBasedOnAuth();
    });
  }

  async register(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Salvar dados adicionais do usuário
      await this.saveUserData(user.uid, {
        ...userData,
        email: email,
        createdAt: serverTimestamp(),
        role: 'customer',
        loyaltyPoints: 0,
        loyaltyLevel: 'BRONZE',
        totalOrders: 0,
        totalSpent: 0,
        favoriteProducts: [],
        addresses: []
      });
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== USUÁRIOS ==========
  async saveUserData(userId, userData) {
    try {
      await setDoc(doc(db, 'users', userId), userData, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  async updateUserRole(userId, role) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: role,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== PRODUTOS ==========
  async getProducts(filters = {}) {
    try {
      let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const products = [];
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  async getProduct(productId) {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      return productDoc.exists() ? { id: productDoc.id, ...productDoc.data() } : null;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  }

  async addProduct(productData) {
    try {
      const product = {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: productData.status || 'active',
        sales: 0,
        views: 0,
        stock: productData.stock || 0
      };

      const docRef = await addDoc(collection(db, 'products'), product);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProduct(productId, productData) {
    try {
      await updateDoc(doc(db, 'products', productId), {
        ...productData,
        updatedAt: serverTimestamp()
      });
      
      return { 
        success: true, 
        message: 'Produto atualizado com sucesso' 
      };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async deleteProduct(productId) {
    try {
      await deleteDoc(doc(db, 'products', productId));
      
      return { 
        success: true, 
        message: 'Produto excluído com sucesso' 
      };
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async updateProductStock(productId, quantity, operation = 'decrease') {
    try {
      const increment_value = operation === 'increase' ? quantity : -quantity;
      await updateDoc(doc(db, 'products', productId), {
        stock: increment(increment_value),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async incrementProductViews(productId) {
    try {
      await updateDoc(doc(db, 'products', productId), {
        views: increment(1)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async uploadProductImage(file, productId) {
    try {
      const imageRef = ref(this.storage, `products/${productId}/${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, url: downloadURL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== PEDIDOS ==========
  async createOrder(orderData) {
    try {
      const orderId = `ORD${Date.now().toString().slice(-8)}`;
      
      const order = {
        ...orderData,
        orderId: orderId,
        status: CONFIG.ORDER_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: this.currentUser?.uid || null,
        timeline: [{
          status: CONFIG.ORDER_STATUS.PENDING,
          timestamp: serverTimestamp(),
          description: 'Pedido criado e aguardando confirmação'
        }]
      };
      
      const docRef = await addDoc(collection(db, 'orders'), order);
      
      // Atualizar estoque dos produtos
      for (const item of orderData.items) {
        await this.updateProductStock(item.id, item.quantity, 'decrease');
        await this.incrementProductSales(item.id, item.quantity);
      }
      
      // Atualizar dados do cliente
      if (this.currentUser) {
        await this.updateCustomerStats(this.currentUser.uid, orderData.total);
      }
      
      // Enviar notificação
      await this.sendOrderNotification(docRef.id, order);
      
      return { success: true, orderId: docRef.id, orderNumber: orderId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }
      
      const currentOrder = orderDoc.data();
      const timeline = currentOrder.timeline || [];
      
      // Adicionar novo status ao timeline
      timeline.push({
        status: newStatus,
        timestamp: serverTimestamp(),
        description: this.getStatusDescription(newStatus),
        ...additionalData
      });
      
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        timeline: timeline,
        ...additionalData
      });
      
      // Notificar cliente sobre mudança de status
      await this.sendStatusUpdateNotification(orderId, newStatus);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getOrders(filters = {}) {
    try {
      let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      
      if (filters.assignedDriver) {
        q = query(q, where('assignedDriver', '==', filters.assignedDriver));
      }
      
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const querySnapshot = await getDocs(q);
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      
      return orders;
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }
  }

  async getOrder(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      return orderDoc.exists() ? { id: orderDoc.id, ...orderDoc.data() } : null;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      return null;
    }
  }

  async assignOrderToDriver(orderId, driverId, driverName) {
    try {
      await this.updateOrderStatus(orderId, CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY, {
        assignedDriver: driverId,
        driverName: driverName,
        assignedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cancelOrder(orderId, reason) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }
      
      const order = orderDoc.data();
      
      // Restaurar estoque se necessário
      if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
        for (const item of order.items) {
          await this.updateProductStock(item.id, item.quantity, 'increase');
        }
      }
      
      await this.updateOrderStatus(orderId, CONFIG.ORDER_STATUS.CANCELLED, {
        cancellationReason: reason,
        cancelledAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== ENTREGADORES ==========
  async registerDriver(driverData) {
    try {
      const driver = {
        ...driverData,
        status: 'pending_approval',
        isOnline: false,
        approved: false,
        createdAt: serverTimestamp(),
        stats: {
          totalDeliveries: 0,
          totalEarnings: 0,
          averageRating: 0,
          totalRatings: 0
        }
      };

      const docRef = await addDoc(collection(db, 'drivers'), driver);
      
      // Notificar admin sobre novo entregador
      await this.notifyAdminNewDriver(docRef.id, driverData);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async approveDriver(driverId) {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        approved: true,
        status: 'active',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { 
        success: true, 
        message: 'Entregador aprovado com sucesso' 
      };
    } catch (error) {
      console.error('Erro ao aprovar entregador:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async updateDriverStatus(driverId, isOnline) {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        isOnline: isOnline,
        lastSeen: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDrivers(filters = {}) {
    try {
      let q = query(collection(db, 'drivers'), orderBy('createdAt', 'desc'));
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.approved !== undefined) {
        q = query(q, where('approved', '==', filters.approved));
      }
      
      const querySnapshot = await getDocs(q);
      const drivers = [];
      querySnapshot.forEach((doc) => {
        drivers.push({ id: doc.id, ...doc.data() });
      });
      
      return drivers;
    } catch (error) {
      console.error('Erro ao buscar entregadores:', error);
      return [];
    }
  }

  // ========== CUPONS ==========
  async createCoupon(couponData) {
    try {
      const coupon = {
        ...couponData,
        createdAt: serverTimestamp(),
        usageCount: 0,
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'coupons'), coupon);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateCoupon(couponCode) {
    try {
      const q = query(
        collection(db, 'coupons'), 
        where('code', '==', couponCode.toUpperCase()),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { valid: false, message: 'Cupom não encontrado ou inválido' };
      }
      
      const couponDoc = querySnapshot.docs[0];
      const coupon = couponDoc.data();
      
      // Verificar validade
      const now = new Date();
      const expiresAt = coupon.expiresAt?.toDate();
      
      if (expiresAt && now > expiresAt) {
        return { valid: false, message: 'Cupom expirado' };
      }
      
      // Verificar limite de uso
      if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
        return { valid: false, message: 'Cupom esgotado' };
      }
      
      return { 
        valid: true, 
        coupon: { id: couponDoc.id, ...coupon }
      };
    } catch (error) {
      return { valid: false, message: 'Erro ao validar cupom' };
    }
  }

  async useCoupon(couponId) {
    try {
      await updateDoc(doc(db, 'coupons', couponId), {
        usageCount: increment(1),
        lastUsed: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== RELATÓRIOS E ESTATÍSTICAS ==========
  async getDashboardStats(dateRange = 'today') {
    try {
      const today = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      }
      
      // Buscar pedidos do período
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = [];
      ordersSnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      
      // Calcular estatísticas
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const completedOrders = orders.filter(order => order.status === 'delivered').length;
      
      // Buscar novos clientes
      const usersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startDate)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const newCustomers = usersSnapshot.size;
      
      return {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        newCustomers,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      };
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        newCustomers: 0,
        averageOrderValue: 0
      };
    }
  }

  async getTopSellingProducts(limit = 10) {
    try {
      const q = query(
        collection(db, 'products'),
        where('sales', '>', 0),
        orderBy('sales', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const products = [];
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos mais vendidos:', error);
      return [];
    }
  }

  // ========== NOTIFICAÇÕES ==========
  async sendOrderNotification(orderId, orderData) {
    try {
      const notification = {
        type: 'new_order',
        orderId: orderId,
        orderNumber: orderData.orderId,
        customerName: orderData.customer?.name,
        total: orderData.total,
        createdAt: serverTimestamp(),
        read: false,
        targetRole: 'admin'
      };
      
      await addDoc(collection(db, 'notifications'), notification);
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return { success: false };
    }
  }

  async sendStatusUpdateNotification(orderId, newStatus) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) return;
      
      const order = orderDoc.data();
      
      const notification = {
        type: 'status_update',
        orderId: orderId,
        orderNumber: order.orderId,
        newStatus: newStatus,
        statusDescription: this.getStatusDescription(newStatus),
        userId: order.userId,
        createdAt: serverTimestamp(),
        read: false,
        targetRole: 'customer'
      };
      
      await addDoc(collection(db, 'notifications'), notification);
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar notificação de status:', error);
      return { success: false };
    }
  }

  async notifyAdminNewDriver(driverId, driverData) {
    try {
      const notification = {
        type: 'new_driver',
        driverId: driverId,
        driverName: driverData.name,
        driverEmail: driverData.email,
        createdAt: serverTimestamp(),
        read: false,
        targetRole: 'admin'
      };
      
      await addDoc(collection(db, 'notifications'), notification);
      return { success: true };
    } catch (error) {
      console.error('Erro ao notificar admin:', error);
      return { success: false };
    }
  }

  // ========== UTILITÁRIOS ==========
  getStatusDescription(status) {
    const descriptions = {
      'pending': 'Pedido recebido e aguardando confirmação',
      'confirmed': 'Pedido confirmado e sendo preparado',
      'preparing': 'Pedido em preparação',
      'ready_for_pickup': 'Pedido pronto para coleta',
      'out_for_delivery': 'Pedido saiu para entrega',
      'delivered': 'Pedido entregue com sucesso',
      'cancelled': 'Pedido cancelado'
    };
    
    return descriptions[status] || 'Status desconhecido';
  }

  async incrementProductSales(productId, quantity) {
    try {
      await updateDoc(doc(db, 'products', productId), {
        sales: increment(quantity)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateCustomerStats(userId, orderValue) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        totalOrders: increment(1),
        totalSpent: increment(orderValue),
        lastOrder: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  updateUIBasedOnAuth() {
    // Atualizar UI baseado no estado de autenticação
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (this.currentUser) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.style.display = 'block';
    } else {
      if (loginBtn) loginBtn.style.display = 'block';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  // ========== LISTENERS EM TEMPO REAL ==========
  listenToOrders(callback) {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      callback(orders);
    });
  }

  listenToProducts(callback) {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const products = [];
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      callback(products);
    });
  }

  listenToNotifications(targetRole, callback) {
    const q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', targetRole),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      callback(notifications);    });
  }
}

// Criar instância global
const ecommerceService = new EcommerceService();
export { ecommerceService };
