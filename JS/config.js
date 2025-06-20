// Configurações do sistema de e-commerce
export const CONFIG = {
  // Status de pedidos
  ORDER_STATUS: {
    PENDING: 'aguardando_confirmacao',
    CONFIRMED: 'confirmado_preparacao',
    READY: 'pronto_entrega',
    DELIVERING: 'em_entrega',
    DELIVERED: 'entregue',
    CANCELLED: 'cancelado'
  },

  // Status em português
  ORDER_STATUS_PT: {
    'aguardando_confirmacao': 'Aguardando confirmação do cliente',
    'confirmado_preparacao': 'Pedido confirmado, em preparação',
    'pronto_entrega': 'Pronto para entrega',
    'em_entrega': 'Em processo de entrega',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado'
  },

  // Métodos de pagamento
  PAYMENT_METHODS: {
    ONLINE: 'online',
    DELIVERY: 'entrega'
  },

  // Tipos de pagamento
  PAYMENT_TYPES: {
    PIX: 'pix',
    CARD: 'cartao',
    CASH: 'dinheiro'
  },

  // Sistema de fidelidade
  LOYALTY: {
    BRONZE: { min: 0, max: 499, discount: 0, pointsMultiplier: 1 },
    SILVER: { min: 500, max: 1499, discount: 5, pointsMultiplier: 1.2 },
    GOLD: { min: 1500, max: 2999, discount: 10, pointsMultiplier: 1.5 },
    PLATINUM: { min: 3000, max: Infinity, discount: 15, pointsMultiplier: 2 }
  },

  // Configurações de email
  EMAIL_CONFIG: {
    service: 'smtp',
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'mikaelferreira@fehunasuplementos.shop',
      pass: 'NOva+@87el'
    }
  },

  // Configurações do Mercado Pago (serão preenchidas depois)
  MERCADO_PAGO: {
    publicKey: '',
    accessToken: ''
  },

  // Configurações gerais
  SITE: {
    name: 'Fehuna Nutrition',
    email: 'contato@fehunanutrition.com',
    phone: '(11) 99999-9999',
    address: 'Endereço da loja'
  }
};

// Estados do sistema
export const SYSTEM_STATE = {
  maintenance: false,
  pagesOffline: []
};
