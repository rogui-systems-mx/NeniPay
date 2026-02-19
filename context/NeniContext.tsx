import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Client, Transaction, TransactionItem, TransactionType } from '../hooks/useNeniStore.types';
import { Product } from '../hooks/useProductStore.types';
import { db } from '../utils/firebase';
import { getFromStorage, saveToStorage } from '../utils/storage';
import { getProductsFromStorage, saveProductsToStorage } from '../utils/storageProducts';
import { DEFAULT_PAYMENT_TEMPLATE, DEFAULT_SALE_TEMPLATE, generatePaymentMessage, generateSaleMessage, sendWhatsAppMessage } from '../utils/whatsapp';
import { useAuth } from './AuthContext';

export interface NeniContextType {
    clients: Client[];
    products: Product[];
    loading: boolean;
    // Client actions
    addClient: (name: string, phone?: string, location?: string) => void;
    updateClient: (id: string, name: string, phone?: string, location?: string, image?: string) => void;
    deleteClient: (clientId: string) => void;
    getClientById: (id: string) => Client | undefined;
    importData: (data: { clients: Client[] }) => boolean;
    getClientColor: (client: Client) => string;
    // Transaction actions
    addTransaction: (clientId: string, type: TransactionType, amount: number, description: string, notifyViaWhatsApp?: boolean, items?: TransactionItem[]) => void;
    updateTransaction: (clientId: string, transactionId: string, amount: number, description: string) => void;
    deleteTransaction: (clientId: string, transactionId: string) => void;
    whatsappSaleTemplate: string;
    whatsappPaymentTemplate: string;
    updateWhatsAppTemplates: (saleTemplate: string, paymentTemplate: string) => void;
    // Product actions
    addProduct: (name: string, price: number, stock?: number, description?: string, category?: string, image?: string) => void;
    updateProduct: (productId: string, name: string, price: number, stock?: number, description?: string, category?: string, image?: string) => void;
    deleteProduct: (productId: string) => void;
    clearAllData: () => Promise<void>;
}

const NeniContext = createContext<NeniContextType | undefined>(undefined);

export const NeniProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, businessName } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [whatsappSaleTemplate, setWhatsappSaleTemplate] = useState(DEFAULT_SALE_TEMPLATE);
    const [whatsappPaymentTemplate, setWhatsappPaymentTemplate] = useState(DEFAULT_PAYMENT_TEMPLATE);
    const [loading, setLoading] = useState(true);

    // Sync logic (Cloud + Local fallback)
    useEffect(() => {
        let unsubscribe: () => void;

        const loadData = async () => {
            setLoading(true);

            if (user) {
                // CLOUD MODE: Listen to Firestore
                const userDocRef = doc(db, 'users', user.uid);

                unsubscribe = onSnapshot(userDocRef, (snapshot) => {
                    const data = snapshot.data();
                    if (data) {
                        setClients((data.clients || []).map((c: any) => ({ ...c, transactions: c.transactions || [] })));
                        setProducts(data.products || []);
                        if (data.whatsappSaleTemplate) setWhatsappSaleTemplate(data.whatsappSaleTemplate);
                        if (data.whatsappPaymentTemplate) setWhatsappPaymentTemplate(data.whatsappPaymentTemplate);
                    } else {
                        // First time login - Check if we should migrate local data
                        handleInitialMigration(user.uid);
                    }
                    setLoading(false);
                });
            } else {
                // LOCAL MODE: Use AsyncStorage
                const [clientData, productData] = await Promise.all([
                    getFromStorage(),
                    getProductsFromStorage()
                ]);
                setClients((clientData?.clients || []).map((c: any) => ({ ...c, transactions: c.transactions || [] })));
                setProducts(productData?.products || []);
                setLoading(false);
            }
        };

        const handleInitialMigration = async (userId: string) => {
            const [clientData, productData] = await Promise.all([
                getFromStorage(),
                getProductsFromStorage()
            ]);

            const localClients = clientData?.clients || [];
            const localProducts = productData?.products || [];

            if (localClients.length > 0 || localProducts.length > 0) {
                // Auto-migrate if cloud is empty but local has data
                await setDoc(doc(db, 'users', userId), {
                    clients: sanitizeClientsData(localClients),
                    products: sanitizeProductsData(localProducts),
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Just initialize cloud doc
                await setDoc(doc(db, 'users', userId), {
                    clients: [],
                    products: [],
                    updatedAt: new Date().toISOString()
                });
            }
        };

        loadData();
        return () => unsubscribe?.();
    }, [user]);

    // Local Persistence (Fallback/Cache)
    useEffect(() => {
        if (!loading && !user) {
            saveToStorage({ clients });
        }
    }, [clients, loading, user]);

    useEffect(() => {
        if (!loading && !user) {
            saveProductsToStorage({ products });
        }
    }, [products, loading, user]);

    // Helper to persist changes
    const sanitizeClientsData = (clientsList: Client[]) => {
        return clientsList.map(c => {
            const persistImage = (c.image?.startsWith('http') || c.image?.startsWith('https')) ? c.image : null;
            return {
                ...c,
                phone: c.phone ?? null,
                location: c.location ?? null,
                image: persistImage,
                avatar: c.avatar ?? null,
                transactions: (c.transactions || []).map(t => ({
                    ...t,
                    items: t.items ?? null
                }))
            };
        });
    };

    const sanitizeProductsData = (productsList: Product[]) => {
        return productsList.map(p => ({
            ...p,
            stock: p.stock ?? 0,
            description: p.description ?? '',
            category: p.category ?? null,
            image: p.image ?? null,
        }));
    };

    const persistChange = async (newClients: Client[], newProducts: Product[], saleTemplate?: string, paymentTemplate?: string) => {
        if (user) {
            await setDoc(doc(db, 'users', user.uid), {
                clients: sanitizeClientsData(newClients),
                products: sanitizeProductsData(newProducts),
                whatsappSaleTemplate: saleTemplate || whatsappSaleTemplate,
                whatsappPaymentTemplate: paymentTemplate || whatsappPaymentTemplate,
                updatedAt: new Date().toISOString()
            });
        }
    };

    const calculateBalance = (transactions: Transaction[]) => {
        return transactions.reduce((acc, curr) => {
            return curr.type === 'sale' ? acc + curr.amount : acc - curr.amount;
        }, 0);
    };

    // --- Client Implementations ---
    const addClient = (name: string, phone?: string, location?: string) => {
        const newClient: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            phone,
            location,
            memberSince: new Date().toLocaleDateString(),
            transactions: [],
            totalBalance: 0,
        };
        const updated = [newClient, ...clients];
        setClients(updated);
        persistChange(updated, products);
    };

    const updateClient = (id: string, name: string, phone?: string, location?: string, image?: string) => {
        const updated = clients.map(client => {
            if (client.id === id) {
                return {
                    ...client,
                    name,
                    phone: phone !== undefined ? phone : client.phone,
                    location: location !== undefined ? location : client.location,
                    image: image !== undefined ? image : client.image,
                };
            }
            return client;
        });
        setClients(updated);
        persistChange(updated, products);
    };

    const deleteClient = (clientId: string) => {
        const updated = clients.filter(c => c.id !== clientId);
        setClients(updated);
        persistChange(updated, products);
    };

    const getClientById = (id: string) => clients.find(c => c.id === id);

    const importData = (data: { clients: Client[] }) => {
        if (data && Array.isArray(data.clients)) {
            setClients(data.clients);
            return true;
        }
        return false;
    };

    // --- Transaction Implementations ---
    const addTransaction = (clientId: string, type: TransactionType, amount: number, description: string, notifyViaWhatsApp: boolean = false, items?: TransactionItem[]) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        const transactions = client.transactions || [];
        const newTransaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            amount,
            description,
            date: new Date().toISOString(),
            items,
        };

        const updatedTransactions = [newTransaction, ...transactions];
        const newBalance = calculateBalance(updatedTransactions);

        // Update product stock if items are present
        let updatedProducts = [...products];
        if (type === 'sale' && items) {
            items.forEach(item => {
                if (item.productId) {
                    updatedProducts = updatedProducts.map(p => {
                        if (p.id === item.productId) {
                            return { ...p, stock: Math.max(0, (p.stock || 0) - item.quantity) };
                        }
                        return p;
                    });
                }
            });
        }

        const updated = clients.map(c => {
            if (c.id === clientId) {
                return {
                    ...c,
                    transactions: updatedTransactions,
                    totalBalance: newBalance,
                };
            }
            return c;
        });

        setClients(updated);
        setProducts(updatedProducts);
        persistChange(updated, updatedProducts);

        // Auto-WhatsApp Logic
        if (notifyViaWhatsApp && client.phone) {
            const message = type === 'sale'
                ? generateSaleMessage(client.name, amount, description, newBalance, whatsappSaleTemplate, items, businessName)
                : generatePaymentMessage(client.name, amount, description, newBalance, whatsappPaymentTemplate, businessName);

            // We use setTimeout to ensure the context has updated and the UI is not blocked
            setTimeout(() => {
                sendWhatsAppMessage(client.phone!, message);
            }, 500);
        }
    };

    const updateTransaction = (clientId: string, transactionId: string, amount: number, description: string) => {
        const updated = clients.map(client => {
            if (client.id === clientId) {
                const updatedTransactions = (client.transactions || []).map(t =>
                    t.id === transactionId ? { ...t, amount, description } : t
                );
                return {
                    ...client,
                    transactions: updatedTransactions,
                    totalBalance: calculateBalance(updatedTransactions),
                };
            }
            return client;
        });
        setClients(updated);
        persistChange(updated, products);
    };

    const deleteTransaction = (clientId: string, transactionId: string) => {
        const updated = clients.map(client => {
            if (client.id === clientId) {
                const updatedTransactions = (client.transactions || []).filter(t => t.id !== transactionId);
                return {
                    ...client,
                    transactions: updatedTransactions,
                    totalBalance: calculateBalance(updatedTransactions),
                };
            }
            return client;
        });
        setClients(updated);
        persistChange(updated, products);
    };

    // --- Product Implementations ---
    const addProduct = (name: string, price: number, stock: number = 0, description: string = '', category?: string, image?: string) => {
        const sanitizedPrice = isNaN(price) ? 0 : Math.max(0, price);
        const sanitizedStock = isNaN(stock) ? 0 : stock;

        const newProduct: Product = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            price: sanitizedPrice,
            stock: sanitizedStock,
            description: description.trim(),
            category,
            image,
        };
        const updated = [newProduct, ...products];
        setProducts(updated);
        persistChange(clients, updated);
    };

    const updateProduct = (productId: string, name: string, price: number, stock: number = 0, description: string = '', category?: string, image?: string) => {
        const sanitizedPrice = isNaN(price) ? 0 : Math.max(0, price);
        const sanitizedStock = isNaN(stock) ? 0 : stock;

        const updated = products.map(p =>
            p.id === productId ? {
                ...p,
                name: name.trim(),
                price: sanitizedPrice,
                stock: sanitizedStock,
                description: description.trim(),
                category,
                image: image !== undefined ? image : p.image
            } : p
        );
        setProducts(updated);
        persistChange(clients, updated);
    };

    const deleteProduct = (productId: string) => {
        const updated = products.filter(p => p.id !== productId);
        setProducts(updated);
        persistChange(clients, updated);
    };

    const clearAllData = async () => {
        try {
            await Promise.all([
                saveToStorage({ clients: [] }),
                saveProductsToStorage({ products: [] })
            ]);
            setClients([]);
            setProducts([]);
        } catch (error) {
            console.error('Error clearing data:', error);
        }
    };

    const getClientColor = (client: Client) => {
        const colors = [
            '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
            '#EF4444', '#EC4899', '#6366F1', '#14B8A6'
        ];
        // Use hash of id to pick a stable color
        let hash = 0;
        const str = client.id + (client.phone || '');
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const value: NeniContextType = useMemo(() => ({
        clients,
        products,
        loading,
        addClient,
        updateClient,
        deleteClient,
        getClientById,
        importData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addProduct,
        updateProduct,
        deleteProduct,
        clearAllData,
        getClientColor,
        whatsappSaleTemplate,
        whatsappPaymentTemplate,
        updateWhatsAppTemplates: (sale: string, payment: string) => {
            setWhatsappSaleTemplate(sale);
            setWhatsappPaymentTemplate(payment);
            persistChange(clients, products, sale, payment);
        }
    }), [clients, products, loading, whatsappSaleTemplate, whatsappPaymentTemplate]);

    return <NeniContext.Provider value={value}>{children}</NeniContext.Provider>;
};

export const useNeniContext = () => {
    const context = useContext(NeniContext);
    if (!context) throw new Error('useNeniContext must be used within a NeniProvider');
    return context;
};
