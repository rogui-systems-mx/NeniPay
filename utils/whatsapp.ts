import { Linking } from 'react-native';
import { TransactionItem } from '../hooks/useNeniStore.types';

/**
 * Sends a WhatsApp message to a phone number
 * @param phone Phone number (can include country code)
 * @param message Message to send
 */
export const sendWhatsAppMessage = async (phone: string, message: string) => {
    // Remove any non-numeric characters (including +)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // WhatsApp URL scheme
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
            return true;
        } else {
            console.warn('WhatsApp is not installed');
            return false;
        }
    } catch (error) {
        console.error('Error opening WhatsApp:', error);
        return false;
    }
};

/**
 * Default templates for WhatsApp messages
 */
export const DEFAULT_SALE_TEMPLATE = `Hola {name}! 👋

Se ha registrado una nueva compra:
📦 {description}
💵 ${"${amount}"}

Tu saldo actual es: ${"${balance}"}

¡Gracias por tu preferencia! 😊`;

export const DEFAULT_PAYMENT_TEMPLATE = `Hola {name}! 👋

Se ha registrado tu pago:
💰 ${"${amount}"}
📝 {description}

Tu saldo pendiente es: ${"${balance}"}

¡Gracias por tu pago! 😊`;

/**
 * Generates a friendly message for a new sale
 */
export const generateSaleMessage = (
    clientName: string,
    amount: number,
    description: string,
    newBalance: number,
    template: string = DEFAULT_SALE_TEMPLATE,
    items?: TransactionItem[],
    businessName?: string | null
) => {
    let details = '';
    const businessHeader = businessName ? `*${businessName}*\n\n` : '';

    if (items && items.length > 0) {
        details = '\n\n*Detalle de compra:*';
        items.forEach(item => {
            const subtotal = item.quantity * item.priceAtSale;
            details += `\n✅ ${item.quantity}x ${item.productName} .... $${subtotal.toLocaleString()}`;
        });
    }

    return businessHeader + template
        .replace(/{name}/g, clientName)
        .replace(/{amount}/g, `$${amount.toLocaleString()}`)
        .replace(/{description}/g, description + details)
        .replace(/{balance}/g, `$${newBalance.toLocaleString()}`);
};

/**
 * Generates a friendly message for a payment
 */
export const generatePaymentMessage = (clientName: string, amount: number, description: string, newBalance: number, template: string = DEFAULT_PAYMENT_TEMPLATE, businessName?: string | null) => {
    const isPaidOff = newBalance <= 0;
    const businessHeader = businessName ? `*${businessName}*\n\n` : '';

    let message = businessHeader + template
        .replace(/{name}/g, clientName)
        .replace(/{amount}/g, `$${amount.toLocaleString()}`)
        .replace(/{description}/g, description)
        .replace(/{balance}/g, `$${newBalance.toLocaleString()}`);

    if (isPaidOff && template === DEFAULT_PAYMENT_TEMPLATE) {
        message = businessHeader + `Hola ${clientName}! 👋\n\n` +
            `Se ha registrado tu pago:\n` +
            `💰 $${amount.toLocaleString()}\n` +
            `📝 ${description}\n\n` +
            `✅ ¡Felicidades! Tu cuenta está al día.\n\n` +
            `¡Gracias por tu pago! 😊`;
    }

    return message;
};
