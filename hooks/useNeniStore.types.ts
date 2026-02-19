export type TransactionType = 'sale' | 'payment';

export interface TransactionItem {
    productId?: string;
    productName: string;
    quantity: number;
    priceAtSale: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: string; // ISO string
    items?: TransactionItem[];
}

export interface Client {
    id: string;
    name: string;
    phone?: string; // WhatsApp number
    location?: string; // e.g., "Piso 1", "Oficina de Tesorería"
    image?: string;
    avatar?: string;
    memberSince: string;
    transactions: Transaction[];
    totalBalance: number; // Positive means debt
}

export interface NeniData {
    clients: Client[];
}
