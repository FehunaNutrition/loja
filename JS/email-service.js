// Serviço de Email usando SMTP da Hostinger
export const EMAIL_CONFIG = {
    SMTP: {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true, // SSL
        auth: {
            user: 'mikaelferreira@fehunasuplementos.shop',
            pass: 'NOva+@87el'
        }
    },
    FROM: 'mikaelferreira@fehunasuplementos.shop',
    FROM_NAME: 'Fehuna Nutrition'
};

export class EmailService {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1' && 
                          !window.location.hostname.startsWith('192.168.');
    }

    // Enviar email de confirmação de pedido
    async sendOrderConfirmation(orderData) {
        try {
            const emailData = {
                to: orderData.cliente.email,
                subject: `Confirmação de Pedido #${orderData.orderId}`,
                html: this.generateOrderConfirmationHTML(orderData)
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('Erro ao enviar email de confirmação:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar email de atualização de status
    async sendStatusUpdate(orderData, newStatus) {
        try {
            const emailData = {
                to: orderData.cliente.email,
                subject: `Atualização do Pedido #${orderData.orderId}`,
                html: this.generateStatusUpdateHTML(orderData, newStatus)
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('Erro ao enviar email de status:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar email para PIX pendente
    async sendPixPendingEmail(orderData) {
        try {
            const emailData = {
                to: orderData.cliente.email,
                subject: `Pagamento PIX Pendente - Pedido #${orderData.orderId}`,
                html: this.generatePixPendingHTML(orderData)
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('Erro ao enviar email PIX pendente:', error);
            return { success: false, error: error.message };
        }
    }

    // Função principal de envio (simulada para desenvolvimento)
    async sendEmail(emailData) {
        console.log('=== ENVIANDO EMAIL ===');
        console.log('Para:', emailData.to);
        console.log('Assunto:', emailData.subject);
        console.log('Configuração SMTP:', EMAIL_CONFIG.SMTP.host);

        if (!this.isProduction) {
            // Em desenvolvimento, apenas simular o envio
            console.log('📧 EMAIL SIMULADO (desenvolvimento):');
            console.log('HTML:', emailData.html);
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        messageId: 'simulated_' + Date.now(),
                        message: 'Email simulado enviado com sucesso'
                    });
                }, 1000);
            });
        } else {
            // Em produção, fazer a chamada real para o backend
            try {
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        smtp: EMAIL_CONFIG.SMTP,
                        from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM}>`,
                        ...emailData
                    })
                });

                const result = await response.json();
                return result;
            } catch (error) {
                console.error('Erro na chamada de envio de email:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // Template HTML para confirmação de pedido
    generateOrderConfirmationHTML(orderData) {
        const total = parseFloat(orderData.total || 0);
        const paymentMethod = orderData.payment?.method === 'online' ? 
            (orderData.payment.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito') : 
            'Pagamento na Entrega';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Pedido</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .items-table th { background: #e9ecef; font-weight: bold; }
        .total-row { font-weight: bold; background: #e8f5e8; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .pix-warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Pedido Confirmado!</h1>
            <h2>Pedido #${orderData.orderId}</h2>
        </div>
        
        <div class="content">
            <h3>Olá, ${orderData.cliente.nome}!</h3>
            <p>Seu pedido foi criado com sucesso. Abaixo estão os detalhes:</p>
            
            <div class="order-info">
                <h4>📦 Informações do Pedido</h4>
                <p><strong>Número:</strong> ${orderData.orderId}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Método de Pagamento:</strong> ${paymentMethod}</p>
                <p><strong>Status:</strong> ${orderData.payment?.status === 'pending_payment' ? 'Aguardando Pagamento PIX' : 'Confirmado'}</p>
            </div>
            
            ${orderData.payment?.payment_method === 'pix' && orderData.payment?.status === 'pending_payment' ? `
            <div class="pix-warning">
                <h4>⚠️ Atenção: Pagamento PIX Pendente</h4>
                <p>Seu pedido foi criado, mas o pagamento ainda está pendente. Para finalizar, complete o pagamento via PIX usando o QR Code enviado.</p>
                <p><strong>Prazo:</strong> O código PIX expira em 30 minutos.</p>
            </div>
            ` : ''}
            
            <h4>🛒 Itens do Pedido</h4>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qtd</th>
                        <th>Preço Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderData.items.map(item => `
                    <tr>
                        <td>${item.nome}</td>
                        <td>${item.quantidade}</td>
                        <td>R$ ${parseFloat(item.preco || 0).toFixed(2)}</td>
                        <td>R$ ${(parseFloat(item.preco || 0) * parseInt(item.quantidade || 1)).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="3"><strong>Total do Pedido:</strong></td>
                        <td><strong>R$ ${total.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="order-info">
                <h4>📍 Endereço de Entrega</h4>
                <p>
                    ${orderData.endereco.endereco}, ${orderData.endereco.numero}<br>
                    ${orderData.endereco.complemento ? orderData.endereco.complemento + '<br>' : ''}
                    ${orderData.endereco.bairro} - ${orderData.endereco.cidade}/${orderData.endereco.estado}<br>
                    CEP: ${orderData.endereco.cep}
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://fehunasuplementos.shop/loja/index.html" class="btn">Acompanhar Pedido</a>
            </div>
            
            <p style="margin-top: 30px;">
                <strong>Próximos passos:</strong><br>
                ${orderData.payment?.status === 'pending_payment' ? 
                    '1. Complete o pagamento PIX<br>2. Aguarde a confirmação automática<br>3. Seu pedido entrará em preparação' :
                    '1. Confirmaremos seu pagamento<br>2. Seu pedido entrará em preparação<br>3. Te avisaremos quando sair para entrega'
                }
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Fehuna Nutrition</strong></p>
            <p>📧 mikaelferreira@fehunasuplementos.shop | 📱 WhatsApp: (11) 99999-9999</p>
            <p>Dúvidas? Responda este email ou entre em contato conosco.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Template para PIX pendente
    generatePixPendingHTML(orderData) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pagamento PIX Pendente</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #ff9500; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .pix-box { background: #e7f3ff; border: 2px solid #007bff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Pagamento PIX Pendente</h1>
            <h2>Pedido #${orderData.orderId}</h2>
        </div>
        
        <div class="content">
            <h3>Olá, ${orderData.cliente.nome}!</h3>
            
            <div class="warning">
                <p><strong>⚠️ Seu pedido foi criado, mas o pagamento PIX ainda está pendente.</strong></p>
            </div>
            
            <div class="pix-box">
                <h4>📱 Complete seu pagamento PIX</h4>
                <p>Use o QR Code que foi exibido na tela ou acesse sua conta para finalizar o pagamento.</p>
                <p><strong>Valor:</strong> R$ ${parseFloat(orderData.total || 0).toFixed(2)}</p>
                <p><strong>Prazo:</strong> 30 minutos</p>
            </div>
            
            <h4>Como pagar via PIX:</h4>
            <ol>
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou cole o código PIX</li>
                <li>Confirme o pagamento</li>
            </ol>
            
            <p><strong>Após o pagamento:</strong> Você receberá uma confirmação automática e seu pedido entrará em preparação.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Template para atualização de status
    generateStatusUpdateHTML(orderData, newStatus) {
        const statusMessages = {
            'confirmado_preparacao': 'Seu pedido está sendo preparado! 👨‍🍳',
            'pronto_entrega': 'Pedido pronto para entrega! 📦',
            'em_entrega': 'Seu pedido está a caminho! 🚚',
            'entregue': 'Pedido entregue com sucesso! 🎉',
            'cancelado': 'Pedido cancelado 😔'
        };

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Atualização do Pedido</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .status-box { background: #e8f5e8; border: 2px solid #28a745; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Atualização do Pedido</h1>
            <h2>Pedido #${orderData.orderId}</h2>
        </div>
        
        <div class="content">
            <h3>Olá, ${orderData.cliente.nome}!</h3>
            
            <div class="status-box">
                <h2>${statusMessages[newStatus] || 'Status atualizado'}</h2>
                <p><strong>Novo status:</strong> ${newStatus}</p>
                <p><strong>Atualizado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <p>Continue acompanhando seu pedido em nossa plataforma.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

// Instância global do serviço de email
export const emailService = new EmailService();
