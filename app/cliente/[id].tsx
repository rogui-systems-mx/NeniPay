import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CircleDollarSign, Edit2, FileText, MoreVertical, Plus, ShoppingCart, Trash2, X, Wallet, MessageCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore - No types available for this package
import MaskedView from '@react-native-masked-view/masked-view';
import * as ImagePicker from 'expo-image-picker';
import { ActionCard } from '../../components/ActionCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StitchButton } from '../../components/StitchButton';
import { StitchInput } from '../../components/StitchInput';
import { StitchPhoneInput } from '../../components/StitchPhoneInput';
import { StitchPressable } from '../../components/StitchPressable';
import { StitchCard } from '../../components/StitchCard';
import { TimelineItem } from '../../components/TimelineItem';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Transaction, TransactionItem, TransactionType } from '../../hooks/useNeniStore.types';
import { useProductStore } from '../../hooks/useProductStore';
import { uploadImage } from '../../utils/firebase';
import { shareClientHistoryPDF } from '../../utils/pdf';
import { sendWhatsAppMessage, generatePaymentMessage } from '../../utils/whatsapp';
import { BlurView } from 'expo-blur';

export default function ClienteDetailScreen() {
    const { id, action, month, year } = useLocalSearchParams<{ id: string, action?: string, month?: string, year?: string }>();
    const router = useRouter();
    const { getClientById, addTransaction, updateTransaction, deleteTransaction, deleteClient, updateClient, getClientColor } = useNeniStore();
    const { products } = useProductStore();
    const { colors, isDark } = useTheme();
    const { businessName } = useAuth();
    const styles = getStyles(colors, isDark);

    const [modalVisible, setModalVisible] = useState(false);
    const [editTransactionModalVisible, setEditTransactionModalVisible] = useState(false);
    const [deleteTransactionDialogVisible, setDeleteTransactionDialogVisible] = useState(false);
    const [deleteClientDialogVisible, setDeleteClientDialogVisible] = useState(false);
    const [editClientModalVisible, setEditClientModalVisible] = useState(false);
    const [modalType, setModalType] = useState<TransactionType>('sale');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientLocation, setClientLocation] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showClientMenu, setShowClientMenu] = useState(false);
    const [showTransactionMenu, setShowTransactionMenu] = useState(false);
    const [selectedYear, setSelectedYear] = useState(year ? parseInt(year) : new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(month ? parseInt(month) : new Date().getMonth());
    const [notifyViaWhatsApp, setNotifyViaWhatsApp] = useState(true);
    const [cart, setCart] = useState<{ [productId: string]: number }>({});
    const [editCart, setEditCart] = useState<{ [productId: string]: number }>({});
    const [manualItems, setManualItems] = useState<TransactionItem[]>([]);
    const [editManualItems, setEditManualItems] = useState<TransactionItem[]>([]);
    const [manualItemModalVisible, setManualItemModalVisible] = useState(false);
    const [isEditingManual, setIsEditingManual] = useState(false);
    const [newManualName, setNewManualName] = useState('');
    const [newManualPrice, setNewManualPrice] = useState('');
    const [newManualQuantity, setNewManualQuantity] = useState('1');

    const client = getClientById(id);

    React.useEffect(() => {
        if (action === 'sale') handleOpenModal('sale');
        if (action === 'payment') handleOpenModal('payment');
    }, [action]);

    const groupedTransactions = useMemo(() => {
        if (!client || !client.transactions) return {};

        let filtered = [...client.transactions];
        if (selectedMonth !== 'all') {
            filtered = filtered.filter(t => {
                if (!t || !t.date) return false;
                const date = new Date(t.date);
                return !isNaN(date.getTime()) && date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
            });
        } else {
            filtered = filtered.filter(t => t && t.date && !isNaN(new Date(t.date).getTime()) && new Date(t.date).getFullYear() === selectedYear);
        }

        const groups: { [key: string]: Transaction[] } = {};
        filtered.forEach(t => {
            if (!t || !t.date) return;
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return;
            const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [client, selectedMonth, selectedYear]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        if (client && client.transactions) {
            client.transactions.forEach(t => {
                if (t && t.date) years.add(new Date(t.date).getFullYear());
            });
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [client]);

    if (!client) {
        return (
            <View style={styles.center}>
                <Text style={{ color: colors.text }}>Cliente no encontrado</Text>
                <StitchButton title="Volver" onPress={() => router.back()} style={{ marginTop: 20 }} />
            </View>
        );
    }

    const { totalSales, totalPayments } = useMemo(() => {
        if (!client) return { totalSales: 0, totalPayments: 0 };
        const sales = client.transactions
            .filter(t => t.type === 'sale')
            .reduce((acc, t) => acc + t.amount, 0);
        const payments = client.transactions
            .filter(t => t.type === 'payment')
            .reduce((acc, t) => acc + t.amount, 0);
        return { totalSales: sales, totalPayments: payments };
    }, [client]);

    const handleOpenModal = (type: TransactionType) => {
        setModalType(type);
        setAmount('');
        setDescription(type === 'sale' ? '' : 'Abono a cuenta');
        setCart({});
        setManualItems([]);
        setIsEditingManual(false);
        setModalVisible(true);
    };

    const updateSalesSummary = (currentCart: { [id: string]: number }, currentManual: TransactionItem[], isEdit: boolean = false) => {
        const cartItems = Object.entries(currentCart).map(([id, qty]) => {
            const prod = products.find(pr => pr.id === id);
            return { name: prod?.name || '', total: (prod?.price || 0) * qty };
        });

        const manualTotals = currentManual.reduce((acc, curr) => acc + (curr.priceAtSale * curr.quantity), 0);
        const manualDesc = currentManual.map(item => item.productName).join(', ');

        const totalAmount = cartItems.reduce((acc, curr) => acc + curr.total, 0) + manualTotals;
        const catalogDesc = cartItems.map(item => item.name).join(', ');

        let finalDesc = catalogDesc;
        if (manualDesc) {
            finalDesc = finalDesc ? `${finalDesc}, ${manualDesc}` : manualDesc;
        }

        setAmount(totalAmount.toString());
        setDescription(finalDesc);
    };

    const handleSaveTransaction = async () => {
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Por favor ingresa un monto válido');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Por favor ingresa una descripción');
            return;
        }

        const catalogItems = Object.entries(cart).map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            return {
                productId,
                productName: product?.name || 'Producto',
                quantity,
                priceAtSale: product?.price || 0,
            };
        });

        const allItems = [...catalogItems, ...manualItems];

        try {
            addTransaction(client.id, modalType, numAmount, description.trim(), notifyViaWhatsApp, allItems.length > 0 ? allItems : undefined);
            setModalVisible(false);
            setAmount('');
            setDescription('');
            setCart({});
            setManualItems([]);
        } catch (error) {
            console.error('Error adding transaction:', error);
            Alert.alert('Error', 'No se pudo guardar la transacción');
        }
    };

    const handleEditTransaction = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setAmount(transaction.amount.toString());
        setDescription(transaction.description);

        // Initialize edit states from transaction items
        const newCart: { [id: string]: number } = {};
        const newManual: TransactionItem[] = [];

        if (transaction.items) {
            transaction.items.forEach(item => {
                if (item.productId) {
                    newCart[item.productId] = (newCart[item.productId] || 0) + item.quantity;
                } else {
                    newManual.push(item);
                }
            });
        }

        setEditCart(newCart);
        setEditManualItems(newManual);
        setIsEditingManual(true);
        setEditTransactionModalVisible(true);
    };

    const handleSaveEditTransaction = () => {
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Por favor ingresa un monto válido');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Por favor ingresa una descripción');
            return;
        }

        if (selectedTransaction) {
            try {
                let itemsToUpdate: TransactionItem[] | undefined = undefined;

                if (selectedTransaction.type === 'sale') {
                    const catalogItems = Object.entries(editCart).map(([productId, quantity]) => {
                        const product = products.find(p => p.id === productId);
                        return {
                            productId,
                            productName: product?.name || 'Producto',
                            quantity,
                            priceAtSale: product?.price || 0,
                        };
                    });
                    itemsToUpdate = [...catalogItems, ...editManualItems];
                }

                updateTransaction(client.id, selectedTransaction.id, numAmount, description.trim(), itemsToUpdate);
                setEditTransactionModalVisible(false);
                setSelectedTransaction(null);
                setEditCart({});
                setEditManualItems([]);
            } catch (error) {
                console.error('Error updating transaction:', error);
                Alert.alert('Error', 'No se pudo actualizar la transacción');
            }
        }
    };

    const handleDeleteTransaction = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setDeleteTransactionDialogVisible(true);
    };

    const confirmDeleteTransaction = () => {
        if (selectedTransaction) {
            deleteTransaction(client.id, selectedTransaction.id);
            setDeleteTransactionDialogVisible(false);
            setShowTransactionMenu(false);
            setSelectedTransaction(null);
        }
    };

    const handleOpenTransactionMenu = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionMenu(true);
    };

    const handleDeleteClient = () => {
        setShowClientMenu(false);
        setDeleteClientDialogVisible(true);
    };

    const confirmDeleteClient = () => {
        deleteClient(client.id);
        setDeleteClientDialogVisible(false);
        router.back();
    };

    const handleOpenEditClient = () => {
        if (client) {
            setClientName(client.name);
            setClientPhone(client.phone || '');
            setClientLocation(client.location || '');
            setShowClientMenu(false);
            setEditClientModalVisible(true);
        }
    };


    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0].uri) {
                const localUri = result.assets[0].uri;
                // Update local UI immediately for responsiveness
                updateClient(client.id, client.name, client.phone || undefined, client.location || undefined, localUri);

                // Upload to Firebase for persistence
                const remoteUrl = await uploadImage(localUri, 'avatars');
                if (remoteUrl) {
                    updateClient(client.id, client.name, client.phone || undefined, client.location || undefined, remoteUrl);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const handleSaveEditClient = () => {
        if (!clientName.trim()) {
            Alert.alert('Error', 'Por favor ingresa un nombre');
            return;
        }
        updateClient(client.id, clientName, clientPhone.trim() || undefined, clientLocation.trim() || undefined, client.image);
        setEditClientModalVisible(false);
    };

    const handleExportPDF = async () => {
        try {
            const success = await shareClientHistoryPDF(client);
            if (!success) {
                // Optional: Show specific error if needed, but pdf utility already handles Alerts
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Alert.alert('Error', 'Hubo un problema al generar el PDF');
        }
    };

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    const handleWhatsAppManual = () => {
        if (!client || !client.phone) return;
        // Accessing store state through the context values or hook if available, 
        // since useNeniStore.getState() is usually for pure zustand stores.
        // If it's a context hook, we might need to expose it.
        // For now, I'll use a hardcoded fallback or try to get it from the store if it's a store.
        const message = generatePaymentMessage(
            client.name, 0, "Expediente de cuenta",
            client.totalBalance, "Hola {cliente}, te recordamos que tu saldo actual es de {saldo}. ¡Gracias!", businessName
        );
        sendWhatsAppMessage(client.phone, message);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Depth Effects */}
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-20%', backgroundColor: colors.primary + '15' }]} />
                <View style={[styles.glowSphere, { bottom: '10%', left: '-30%', backgroundColor: colors.secondary + '15' }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <StitchPressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={24} />
                </StitchPressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerSubtitle}>EXPEDIENTE</Text>
                    <Text style={styles.headerTitle}>{client.name}</Text>
                    {client.location && (
                        <Text style={styles.headerLocation}>{client.location}</Text>
                    )}
                </View>
                <StitchPressable style={styles.moreButton} onPress={() => setShowClientMenu(true)}>
                    <MoreVertical color={colors.text} size={24} />
                </StitchPressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileSection}>
                    <StitchPressable onPress={handlePickImage} style={styles.avatarContainer}>
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.avatarGradient}
                        >
                            <View style={[
                                styles.avatarImageContainer,
                                !client.image && { backgroundColor: 'transparent' }
                            ]}>
                                {client.image ? (
                                    <Image
                                        source={{ uri: client.image }}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                ) : (
                                    <LinearGradient
                                        colors={colors.gradientPrimary as any}
                                        style={styles.letterAvatar}
                                    >
                                        <Text style={styles.letterAvatarText}>{getInitial(client.name)}</Text>
                                    </LinearGradient>
                                )}
                            </View>
                            <View style={styles.editImageIcon}>
                                <Plus size={14} color="#fff" />
                            </View>
                        </LinearGradient>
                    </StitchPressable>
                </View>

                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceLabel}>SALDO PENDIENTE</Text>
                    <View style={styles.balanceWrapper}>
                        {Platform.OS === 'web' ? (
                            <Text
                                style={[styles.balanceAmount, { color: client.totalBalance > 0 ? (colors.primary || '#3B82F6') : (colors.success || '#10b981') }]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                ${(client.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        ) : (
                            <MaskedView
                                style={styles.maskedView}
                                maskElement={
                                    <Text
                                        style={styles.balanceAmount}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        ${(client.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                }
                            >
                                <LinearGradient
                                    colors={colors.gradientPrimary as any}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={styles.gradientFill}
                                >
                                    <Text
                                        style={[styles.balanceAmount, { opacity: 0 }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        ${(client.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </LinearGradient>
                            </MaskedView>
                        )}
                    </View>
                    <Text style={styles.updateTime}>Actualizado recientemente</Text>
                </View>

                <View style={styles.actionButtons}>
                    <ActionCard
                        title="Venta"
                        subtitle="Nueva"
                        icon={ShoppingCart}
                        variant="sale"
                        onPress={() => handleOpenModal('sale')}
                    />
                    <ActionCard
                        title="Abono"
                        subtitle="Registrar"
                        icon={CircleDollarSign}
                        variant="payment"
                        onPress={() => handleOpenModal('payment')}
                    />
                </View>

                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={styles.sectionIndicator} />
                            <Text style={styles.sectionTitle}>Historial</Text>
                        </View>
                        <StitchPressable onPress={handleExportPDF}>
                            <View style={styles.exportButton}>
                                <FileText color={colors.primary} size={18} />
                                <Text style={styles.exportText} numberOfLines={1}>Exportar PDF</Text>
                            </View>
                        </StitchPressable>
                    </View>
                    <View style={styles.filterSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                            {availableYears.map(year => (
                                <TouchableOpacity
                                    key={year}
                                    style={[styles.yearButton, selectedYear === year && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setSelectedYear(year)}
                                >
                                    <Text style={[styles.yearButtonText, selectedYear === year && { color: '#fff' }]}>
                                        {year}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.monthScroll}
                            contentContainerStyle={styles.monthScrollContent}
                        >
                            <View style={styles.monthScrollInner}>
                                <TouchableOpacity
                                    style={[styles.monthButton, selectedMonth === 'all' && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: colors.primary }]}
                                    onPress={() => setSelectedMonth('all')}
                                >
                                    <Text style={[styles.monthButtonText, selectedMonth === 'all' && { color: colors.primary, fontWeight: '800' }]}>
                                        Todos
                                    </Text>
                                </TouchableOpacity>
                                {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((month, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.monthButton, selectedMonth === idx && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: colors.primary }]}
                                        onPress={() => setSelectedMonth(idx)}
                                    >
                                        <Text style={[styles.monthButtonText, selectedMonth === idx && { color: colors.primary, fontWeight: '800' }]}>
                                            {month}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {Object.keys(groupedTransactions).length > 0 ? (
                        Object.keys(groupedTransactions || {}).map((groupKey) => (
                            <View key={groupKey} style={styles.groupContainer}>
                                <View style={styles.groupHeader}>
                                    <View style={styles.groupHeaderLine} />
                                    <Text style={styles.groupText}>{groupKey.toUpperCase()}</Text>
                                    <View style={styles.groupHeaderLine} />
                                </View>
                                {groupedTransactions[groupKey]?.map((t) => (
                                    <TimelineItem
                                        key={t.id}
                                        transaction={t}
                                        onMorePress={handleOpenTransactionMenu}
                                    />
                                ))}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyHistory}>No hay transacciones para este periodo</Text>
                    )}
                </View>
            </ScrollView>

            {/* Transaction Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                        />
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ width: '100%' }}
                        >
                            <StitchCard
                                style={styles.modalContent}
                                variant="solid"
                            >
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalTitleContainer}>
                                        <View style={[styles.modalTitleIcon, { backgroundColor: modalType === 'sale' ? colors.primary + '20' : colors.success + '20' }]}>
                                            {modalType === 'sale' ? <ShoppingCart size={20} color={colors.primary} /> : <CircleDollarSign size={20} color={colors.success} />}
                                        </View>
                                        <Text style={styles.modalTitle}>
                                            {modalType === 'sale' ? 'Nueva Venta' : 'Registrar Abono'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                        <X color={colors.text} size={20} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    {modalType === 'sale' && (
                                        <View style={styles.productSelectionContainer}>
                                            <Text style={styles.inputLabel}>Seleccionar del Catálogo</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScrollLarge}>
                                                {products.map(p => {
                                                    const quantity = cart[p.id] || 0;
                                                    return (
                                                        <TouchableOpacity
                                                            key={p.id}
                                                            style={[
                                                                styles.productCardLarge,
                                                                quantity > 0 && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                                                            ]}
                                                            onPress={() => {
                                                                const newCart = { ...cart };
                                                                if (quantity > 0) delete newCart[p.id];
                                                                else newCart[p.id] = 1;
                                                                setCart(newCart);
                                                                updateSalesSummary(newCart, manualItems);
                                                            }}
                                                        >
                                                            {p.image ? (
                                                                <Image source={{ uri: p.image }} style={styles.productImageLarge} />
                                                            ) : (
                                                                <View style={[styles.productImageLarge, { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }]}>
                                                                    <ShoppingCart size={28} color={colors.textSecondary} />
                                                                </View>
                                                            )}
                                                            <View style={styles.productCardInfo}>
                                                                <Text style={styles.productCardName} numberOfLines={1}>{p.name}</Text>
                                                                <Text style={styles.productCardPrice}>${p.price.toLocaleString()}</Text>
                                                            </View>
                                                            {quantity > 0 && (
                                                                <View style={styles.productSelectedBadge}>
                                                                    <Text style={styles.productSelectedBadgeText}>{quantity}</Text>
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>

                                            <StitchButton
                                                title="Añadir Item Personalizado"
                                                variant="secondary"
                                                onPress={() => setManualItemModalVisible(true)}
                                                style={{ marginBottom: 20 }}
                                                icon={<Plus size={20} color="#fff" />}
                                            />

                                            {(Object.keys(cart).length > 0 || manualItems.length > 0) && (
                                                <View style={styles.cartSummaryElegant}>
                                                    <Text style={styles.cartTitleElegant}>CARRITO DE COMPRA</Text>
                                                    {Object.entries(cart).map(([prodId, qty]) => {
                                                        const prod = products.find(p => p.id === prodId);
                                                        if (!prod) return null;
                                                        return (
                                                            <View key={prodId} style={styles.cartItemElegant}>
                                                                <View style={styles.cartItemIdentity}>
                                                                    <Text style={styles.cartItemNameElegant}>{prod.name}</Text>
                                                                    <Text style={styles.cartItemPriceElegant}>${prod.price.toLocaleString()} c/u</Text>
                                                                </View>
                                                                <View style={styles.cartItemActions}>
                                                                    <View style={styles.quantityControlsModern}>
                                                                        <TouchableOpacity
                                                                            onPress={() => {
                                                                                const newCart = { ...cart };
                                                                                if (qty > 1) newCart[prodId] = qty - 1;
                                                                                else delete newCart[prodId];
                                                                                setCart(newCart);
                                                                                updateSalesSummary(newCart, manualItems);
                                                                            }}
                                                                            style={styles.qtyBtnModern}
                                                                        >
                                                                            <X size={12} color={colors.text} />
                                                                        </TouchableOpacity>
                                                                        <Text style={styles.qtyTextModern}>{qty}</Text>
                                                                        <TouchableOpacity
                                                                            onPress={() => {
                                                                                const newCart = { ...cart, [prodId]: qty + 1 };
                                                                                setCart(newCart);
                                                                                updateSalesSummary(newCart, manualItems);
                                                                            }}
                                                                            style={styles.qtyBtnModern}
                                                                        >
                                                                            <Plus size={12} color={colors.text} />
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                    <Text style={styles.cartItemTotalElegant}>${(prod.price * qty).toLocaleString()}</Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                    {manualItems.map((item, index) => (
                                                        <View key={`manual-${index}`} style={styles.cartItemElegant}>
                                                            <View style={styles.cartItemIdentity}>
                                                                <Text style={styles.cartItemNameElegant}>{item.productName} (Personalizado)</Text>
                                                                <Text style={styles.cartItemPriceElegant}>${item.priceAtSale.toLocaleString()} c/u</Text>
                                                            </View>
                                                            <View style={styles.cartItemActions}>
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        const updated = manualItems.filter((_, i) => i !== index);
                                                                        setManualItems(updated);
                                                                        updateSalesSummary(cart, updated);
                                                                    }}
                                                                    style={styles.removeManualBtn}
                                                                >
                                                                    <Trash2 size={16} color={colors.danger} />
                                                                </TouchableOpacity>
                                                                <Text style={styles.cartItemTotalElegant}>${(item.priceAtSale * item.quantity).toLocaleString()}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <StitchInput
                                        label={modalType === 'sale' ? "Monto Total ($)" : "Monto del Abono ($)"}
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        isDark={isDark}
                                        editable={modalType !== 'sale' || (Object.keys(cart).length === 0 && manualItems.length === 0)}
                                    />

                                    <StitchInput
                                        label="Descripción / Nota"
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Ej. Pago semanal"
                                        isDark={isDark}
                                    />

                                    {client.phone && (
                                        <TouchableOpacity
                                            onPress={() => setNotifyViaWhatsApp(!notifyViaWhatsApp)}
                                            style={styles.whatsappToggle}
                                        >
                                            <View style={[styles.checkbox, notifyViaWhatsApp && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                                {notifyViaWhatsApp && <View style={styles.checkboxInner} />}
                                            </View>
                                            <Text style={styles.whatsappToggleText}>Notificar por WhatsApp</Text>
                                        </TouchableOpacity>
                                    )}

                                    <StitchButton
                                        title={modalType === 'sale' ? 'Confirmar Venta' : 'Confirmar Abono'}
                                        variant={modalType === 'sale' ? 'primary' : 'secondary'}
                                        onPress={handleSaveTransaction}
                                    />
                                </ScrollView>
                            </StitchCard>
                        </KeyboardAvoidingView>
                    </View>
                </BlurView>
            </Modal>

            {/* Edit Transaction Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editTransactionModalVisible}
                onRequestClose={() => setEditTransactionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setEditTransactionModalVisible(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ width: '100%' }}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {selectedTransaction?.type === 'sale' ? 'Editar Venta' : 'Editar Abono'}
                                </Text>
                                <StitchPressable onPress={() => setEditTransactionModalVisible(false)} style={{ padding: 4 }}>
                                    <X color={colors.text} size={24} />
                                </StitchPressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {selectedTransaction?.type === 'sale' && (
                                    <View style={styles.productSelectionContainer}>
                                        <View style={styles.sectionHeaderSmall}>
                                            <Text style={styles.inputLabel}>Seleccionar del Catálogo</Text>
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScrollLarge}>
                                            {products.length > 0 ? products.map(p => {
                                                const quantity = editCart[p.id] || 0;
                                                return (
                                                    <StitchPressable
                                                        key={p.id}
                                                        style={[
                                                            styles.productCardLarge,
                                                            quantity > 0 ? { borderColor: colors.primary, backgroundColor: colors.primary + '10' } : {}
                                                        ]}
                                                        onPress={() => {
                                                            const newCart = { ...editCart };
                                                            if (quantity > 0) {
                                                                delete newCart[p.id];
                                                            } else {
                                                                newCart[p.id] = 1;
                                                            }
                                                            setEditCart(newCart);
                                                            updateSalesSummary(newCart, editManualItems, true);
                                                        }}
                                                    >
                                                        {p.image ? (
                                                            <Image source={{ uri: p.image }} style={styles.productImageLarge} />
                                                        ) : (
                                                            <View style={[styles.productImageLarge, { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }]}>
                                                                <ShoppingCart size={32} color={colors.textSecondary} />
                                                            </View>
                                                        )}
                                                        <View style={styles.productCardInfo}>
                                                            <Text style={styles.productCardName} numberOfLines={1}>{p.name}</Text>
                                                            <Text style={styles.productCardPrice}>${p.price.toLocaleString()}</Text>
                                                        </View>
                                                        {quantity > 0 && (
                                                            <View style={styles.productSelectedBadge}>
                                                                <Text style={styles.productSelectedBadgeText}>{quantity}</Text>
                                                            </View>
                                                        )}
                                                    </StitchPressable>
                                                );
                                            }) : (
                                                <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginBottom: 15 }}>No hay productos en el catálogo</Text>
                                            )}
                                        </ScrollView>

                                        <StitchPressable
                                            onPress={() => {
                                                setIsEditingManual(true);
                                                setManualItemModalVisible(true);
                                            }}
                                            style={{ marginBottom: 15 }}
                                        >
                                            <View style={styles.addManualButton}>
                                                <Plus size={20} color="#fff" />
                                                <Text style={styles.addManualButtonText}>Añadir Item Personalizado</Text>
                                            </View>
                                        </StitchPressable>

                                        {(Object.keys(editCart).length > 0 || editManualItems.length > 0) && (
                                            <View style={styles.cartSummaryElegant}>
                                                <Text style={styles.cartTitleElegant}>PRODUCTOS EN ESTA VENTA</Text>

                                                {Object.entries(editCart).map(([prodId, qty]) => {
                                                    const prod = products.find(p => p.id === prodId);
                                                    if (!prod) return null;
                                                    return (
                                                        <View key={prodId} style={styles.cartItemElegant}>
                                                            <View style={styles.cartItemIdentity}>
                                                                <Text style={styles.cartItemNameElegant}>{prod.name}</Text>
                                                                <Text style={styles.cartItemPriceElegant}>${prod.price.toLocaleString()} c/u</Text>
                                                            </View>
                                                            <View style={styles.cartItemActions}>
                                                                <View style={styles.quantityControlsModern}>
                                                                    <TouchableOpacity
                                                                        onPress={() => {
                                                                            const newCart = { ...editCart };
                                                                            if (qty > 1) newCart[prodId] = qty - 1;
                                                                            else delete newCart[prodId];
                                                                            setEditCart(newCart);
                                                                            updateSalesSummary(newCart, editManualItems, true);
                                                                        }}
                                                                        style={styles.qtyBtnModern}
                                                                    >
                                                                        <X size={12} color={colors.text} />
                                                                    </TouchableOpacity>
                                                                    <Text style={styles.qtyTextModern}>{qty}</Text>
                                                                    <TouchableOpacity
                                                                        onPress={() => {
                                                                            const newCart = { ...editCart, [prodId]: qty + 1 };
                                                                            setEditCart(newCart);
                                                                            updateSalesSummary(newCart, editManualItems, true);
                                                                        }}
                                                                        style={styles.qtyBtnModern}
                                                                    >
                                                                        <Plus size={12} color={colors.text} />
                                                                    </TouchableOpacity>
                                                                </View>
                                                                <Text style={styles.cartItemTotalElegant}>${(prod.price * qty).toLocaleString()}</Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}

                                                {editManualItems.map((item, index) => (
                                                    <View key={`manual-edit-${index}`} style={styles.cartItemElegant}>
                                                        <View style={styles.cartItemIdentity}>
                                                            <Text style={styles.cartItemNameElegant}>{item.productName} (Custom)</Text>
                                                            <Text style={styles.cartItemPriceElegant}>${item.priceAtSale.toLocaleString()} c/u</Text>
                                                        </View>
                                                        <View style={styles.cartItemActions}>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    const updated = editManualItems.filter((_, i) => i !== index);
                                                                    setEditManualItems(updated);
                                                                    updateSalesSummary(editCart, updated, true);
                                                                }}
                                                                style={styles.removeManualBtn}
                                                            >
                                                                <Trash2 size={16} color={colors.danger} />
                                                            </TouchableOpacity>
                                                            <Text style={styles.cartItemTotalElegant}>${(item.priceAtSale * item.quantity).toLocaleString()}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                <StitchInput
                                    label={selectedTransaction?.type === 'sale' ? "Monto Total Estimado ($)" : "Monto del Abono ($)"}
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    isDark={isDark}
                                    editable={selectedTransaction?.type !== 'sale' || (Object.keys(editCart).length === 0 && editManualItems.length === 0)}
                                />

                                <StitchInput
                                    label="Descripción / Nota"
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Descripción"
                                    isDark={isDark}
                                    multiline
                                    editable={selectedTransaction?.type !== 'sale' || (Object.keys(editCart).length === 0 && editManualItems.length === 0)}
                                />

                                <StitchButton
                                    title="Guardar Cambios"
                                    onPress={handleSaveEditTransaction}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Confirm Dialogs */}
            <ConfirmDialog
                visible={deleteTransactionDialogVisible}
                title="Eliminar Transacción"
                message="¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                onConfirm={confirmDeleteTransaction}
                onCancel={() => setDeleteTransactionDialogVisible(false)}
            />

            <ConfirmDialog
                visible={deleteClientDialogVisible}
                title="Eliminar Cliente"
                message={`¿Estás seguro de eliminar a ${client.name}? Se eliminarán todas las transacciones. Esta acción no se puede deshacer.`}
                confirmText="Eliminar Cliente"
                onConfirm={confirmDeleteClient}
                onCancel={() => setDeleteClientDialogVisible(false)}
            />

            {/* Client Menu Modal (Bottom Sheet) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showClientMenu}
                onRequestClose={() => setShowClientMenu(false)}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableOpacity
                        style={styles.sheetBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowClientMenu(false)}
                    />
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetIndicator} />
                        <Text style={styles.sheetTitle}>Gestionar Cliente</Text>
                        <Text style={styles.sheetSubtitle}>{client.name}</Text>

                        <View style={styles.sheetList}>
                            <TouchableOpacity
                                style={styles.sheetRow}
                                activeOpacity={0.7}
                                onPress={handleOpenEditClient}
                            >
                                <View style={[styles.sheetRowIcon, { backgroundColor: colors.primary + '20' }]}>
                                    <Edit2 color={colors.primary} size={20} />
                                </View>
                                <Text style={styles.sheetRowText}>Editar Información</Text>
                            </TouchableOpacity>

                            <View style={styles.sheetDivider} />

                            <TouchableOpacity
                                style={styles.sheetRow}
                                activeOpacity={0.7}
                                onPress={handleDeleteClient}
                            >
                                <View style={[styles.sheetRowIcon, { backgroundColor: colors.danger + '20' }]}>
                                    <Trash2 color={colors.danger} size={20} />
                                </View>
                                <Text style={[styles.sheetRowText, { color: colors.danger }]}>Eliminar Cliente</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.sheetCancelRow}
                            activeOpacity={0.7}
                            onPress={() => setShowClientMenu(false)}
                        >
                            <Text style={styles.sheetCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Client Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editClientModalVisible}
                onRequestClose={() => setEditClientModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Editar Cliente</Text>
                                <StitchPressable onPress={() => setEditClientModalVisible(false)} style={{ padding: 4 }}>
                                    <X color={colors.text} size={24} />
                                </StitchPressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <StitchInput
                                    label="Nombre del Cliente"
                                    value={clientName}
                                    onChangeText={setClientName}
                                    placeholder="Ej. María García"
                                    isDark={isDark}
                                />

                                <StitchPhoneInput
                                    label="Teléfono / WhatsApp"
                                    value={clientPhone}
                                    onChangeText={setClientPhone}
                                    placeholder="5551234567"
                                />

                                <StitchInput
                                    label="Ubicación (Opcional)"
                                    value={clientLocation}
                                    onChangeText={setClientLocation}
                                    placeholder="Ej. Piso 1, Oficina de Tesorería"
                                    isDark={isDark}
                                />

                                <StitchButton
                                    title="Guardar Cambios"
                                    onPress={handleSaveEditClient}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={manualItemModalVisible}
                onRequestClose={() => setManualItemModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Añadir Item Manual</Text>
                                <StitchPressable onPress={() => setManualItemModalVisible(false)}>
                                    <X color={colors.text} size={24} />
                                </StitchPressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <StitchInput
                                    label="Nombre del Producto"
                                    value={newManualName}
                                    onChangeText={setNewManualName}
                                    placeholder="Ej. Servicio de Envío"
                                    isDark={isDark}
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <StitchInput
                                            label="Precio ($)"
                                            value={newManualPrice}
                                            onChangeText={setNewManualPrice}
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            isDark={isDark}
                                        />
                                    </View>
                                    <View style={{ width: 100 }}>
                                        <StitchInput
                                            label="Cant."
                                            value={newManualQuantity}
                                            onChangeText={setNewManualQuantity}
                                            placeholder="1"
                                            keyboardType="numeric"
                                            isDark={isDark}
                                        />
                                    </View>
                                </View>

                                <StitchButton
                                    title="Añadir al Carrito"
                                    onPress={() => {
                                        const price = parseFloat(newManualPrice.replace(',', '.'));
                                        const qty = parseInt(newManualQuantity) || 1;
                                        if (!newManualName || isNaN(price)) {
                                            Alert.alert('Error', 'Completa nombre y precio');
                                            return;
                                        }
                                        const newItem: TransactionItem = {
                                            productName: newManualName,
                                            quantity: qty,
                                            priceAtSale: price
                                        };
                                        if (isEditingManual) {
                                            const updatedManual = [...editManualItems, newItem];
                                            setEditManualItems(updatedManual);
                                            updateSalesSummary(editCart, updatedManual, true);
                                        } else {
                                            const updatedManual = [...manualItems, newItem];
                                            setManualItems(updatedManual);
                                            updateSalesSummary(cart, updatedManual);
                                        }
                                        setManualItemModalVisible(false);
                                        setNewManualName('');
                                        setNewManualPrice('');
                                        setNewManualQuantity('1');
                                    }}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Transaction Menu Modal (Bottom Sheet) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showTransactionMenu}
                onRequestClose={() => setShowTransactionMenu(false)}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableOpacity
                        style={styles.sheetBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowTransactionMenu(false)}
                    />
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetIndicator} />
                        <Text style={styles.sheetTitle}>Transacción</Text>
                        {selectedTransaction && (
                            <Text style={styles.sheetSubtitle}>
                                {selectedTransaction.type === 'sale' ? '🛍 Venta' : '💰 Abono'} · ${selectedTransaction.amount.toLocaleString()}
                            </Text>
                        )}

                        <View style={styles.sheetList}>
                            <TouchableOpacity
                                style={styles.sheetRow}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (selectedTransaction) {
                                        setShowTransactionMenu(false);
                                        handleEditTransaction(selectedTransaction);
                                    }
                                }}
                            >
                                <View style={[styles.sheetRowIcon, { backgroundColor: colors.primary + '20' }]}>
                                    <Edit2 color={colors.primary} size={20} />
                                </View>
                                <Text style={styles.sheetRowText}>Editar Transacción</Text>
                            </TouchableOpacity>

                            <View style={styles.sheetDivider} />

                            <TouchableOpacity
                                style={styles.sheetRow}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setDeleteTransactionDialogVisible(true);
                                }}
                            >
                                <View style={[styles.sheetRowIcon, { backgroundColor: colors.danger + '20' }]}>
                                    <Trash2 color={colors.danger} size={20} />
                                </View>
                                <Text style={[styles.sheetRowText, { color: colors.danger }]}>Eliminar Transacción</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.sheetCancelRow}
                            activeOpacity={0.7}
                            onPress={() => setShowTransactionMenu(false)}
                        >
                            <Text style={styles.sheetCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    bgGlowWrapper: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: -1,
    },
    glowSphere: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 20,
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    headerSubtitle: {
        fontSize: 9,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        opacity: 0.6,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        letterSpacing: -0.3,
    },
    headerLocation: {
        fontSize: 13,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
        opacity: 0.8,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    moreButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    avatarContainer: {
        width: 106,
        height: 106,
        borderRadius: 53,
        position: 'relative',
    },
    avatarGradient: {
        width: 106,
        height: 106,
        borderRadius: 53,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.card,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.background,
    },
    letterAvatar: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '20',
    },
    letterAvatarText: {
        fontSize: 40,
        fontFamily: 'Manrope_800ExtraBold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    editImageIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    balanceContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    balanceWrapper: {
        height: 60,
        justifyContent: 'center',
    },
    maskedView: {
        height: 60,
        width: 300,
    },
    gradientFill: {
        flex: 1,
    },
    balanceLabel: {
        fontSize: 12,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    balanceAmount: {
        fontSize: 38,
        fontFamily: 'Manrope_800ExtraBold',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textAlign: 'center',
    },
    updateTime: {
        fontSize: 12,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
        opacity: 0.5,
        marginTop: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 32,
    },
    historySection: {
        paddingTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionIndicator: {
        width: 4,
        height: 20,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        letterSpacing: -0.5,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    exportText: {
        fontSize: 13,
        fontFamily: 'Manrope_700Bold',
        color: colors.primary,
    },
    filterSection: {
        marginBottom: 20,
    },
    yearScroll: {
        paddingLeft: 20,
        marginBottom: 16,
    },
    yearButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.glass,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    yearButtonText: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.textSecondary,
    },
    monthScroll: {
        paddingLeft: 20,
    },
    monthScrollContent: {
        paddingRight: 20,
    },
    monthScrollInner: {
        flexDirection: 'row',
        gap: 8,
    },
    monthButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    monthButtonText: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.textSecondary,
    },
    groupContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    groupHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.glassBorder,
    },
    groupText: {
        fontSize: 11,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
    },
    emptyHistory: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontFamily: 'Manrope_600SemiBold',
        marginTop: 40,
        fontSize: 15,
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 15,
        fontFamily: 'Manrope_500Medium',
        color: colors.textSecondary,
    },
    // BottomSheet Styles
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContent: {
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.98)',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    sheetIndicator: {
        width: 40,
        height: 5,
        backgroundColor: colors.glassBorder,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
        marginBottom: 24,
    },
    sheetList: {
        marginBottom: 20,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    sheetRowIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetRowText: {
        fontSize: 16,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: colors.glassBorder,
        marginVertical: 4,
    },
    sheetCancelRow: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    sheetCancelText: {
        fontSize: 16,
        fontFamily: 'Manrope_700Bold',
        color: colors.textSecondary,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.95)',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitleIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    modalScroll: {
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.textSecondary,
        marginBottom: 12,
        marginLeft: 4,
    },
    productSelectionContainer: {
        marginBottom: 24,
    },
    productsScrollLarge: {
        marginBottom: 20,
    },
    productCardLarge: {
        width: 140,
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.92)',
        borderRadius: 24,
        marginRight: 14,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        overflow: 'hidden',
    },
    productImageLarge: {
        width: '100%',
        height: 100,
    },
    productCardInfo: {
        padding: 12,
    },
    productCardName: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
        marginBottom: 4,
    },
    productCardPrice: {
        fontSize: 13,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.primary,
    },
    productSelectedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    productSelectedBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Manrope_800ExtraBold',
    },
    cartSummaryElegant: {
        backgroundColor: isDark ? colors.glass : 'rgba(241, 245, 249, 0.95)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        marginBottom: 24,
    },
    cartTitleElegant: {
        fontSize: 12,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 2,
        marginBottom: 16,
        textAlign: 'center',
    },
    cartItemElegant: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    cartItemIdentity: {
        flex: 1,
    },
    cartItemNameElegant: {
        fontSize: 15,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    cartItemPriceElegant: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    cartItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    quantityControlsModern: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    qtyBtnModern: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    qtyTextModern: {
        fontSize: 15,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    cartItemTotalElegant: {
        fontSize: 15,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        minWidth: 70,
        textAlign: 'right',
    },
    whatsappToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 15,
        padding: 16,
        borderRadius: 18,
        backgroundColor: isDark ? colors.glass : 'rgba(255, 255, 255, 0.85)',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxInner: {
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    whatsappToggleText: {
        fontSize: 15,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    addManualButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 18,
    },
    addManualButtonText: {
        color: '#fff',
        fontFamily: 'Manrope_700Bold',
        fontSize: 16,
    },
    sectionHeaderSmall: {
        marginBottom: 12,
    },
    removeManualBtn: {
        padding: 4,
    },
});
