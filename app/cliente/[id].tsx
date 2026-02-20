import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CircleDollarSign, Edit2, FileText, MoreVertical, Plus, ShoppingCart, Trash2, X } from 'lucide-react-native';
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
import { TimelineItem } from '../../components/TimelineItem';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Transaction, TransactionItem, TransactionType } from '../../hooks/useNeniStore.types';
import { useProductStore } from '../../hooks/useProductStore';
import { uploadImage } from '../../utils/firebase';
import { shareClientHistoryPDF } from '../../utils/pdf';

export default function ClienteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth());
    const [notifyViaWhatsApp, setNotifyViaWhatsApp] = useState(true);
    const [cart, setCart] = useState<{ [productId: string]: number }>({});
    const [manualItems, setManualItems] = useState<TransactionItem[]>([]);
    const [manualItemModalVisible, setManualItemModalVisible] = useState(false);
    const [newManualName, setNewManualName] = useState('');
    const [newManualPrice, setNewManualPrice] = useState('');
    const [newManualQuantity, setNewManualQuantity] = useState('1');

    const client = getClientById(id);

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

    const handleOpenModal = (type: TransactionType) => {
        setModalType(type);
        setAmount('');
        setDescription(type === 'sale' ? '' : 'Abono a cuenta');
        setCart({});
        setManualItems([]);
        setModalVisible(true);
    };

    const updateSalesSummary = (currentCart: { [id: string]: number }, currentManual: TransactionItem[]) => {
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
                updateTransaction(client.id, selectedTransaction.id, numAmount, description.trim());
                setEditTransactionModalVisible(false);
                setSelectedTransaction(null);
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Transaction Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {modalType === 'sale' ? 'Nueva Venta' : 'Registrar Abono'}
                                </Text>
                                <StitchPressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                                    <X color={colors.text} size={24} />
                                </StitchPressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {modalType === 'sale' && (
                                    <View style={styles.productSelectionContainer}>
                                        <View style={styles.sectionHeaderSmall}>
                                            <Text style={styles.inputLabel}>Seleccionar del Catálogo</Text>
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScrollLarge}>
                                            {products.map(p => {
                                                const quantity = cart[p.id] || 0;
                                                return (
                                                    <StitchPressable
                                                        key={p.id}
                                                        style={[
                                                            styles.productCardLarge,
                                                            quantity > 0 ? { borderColor: colors.primary, backgroundColor: colors.primary + '10' } : {}
                                                        ]}
                                                        onPress={() => {
                                                            const newCart = { ...cart };
                                                            if (quantity > 0) {
                                                                delete newCart[p.id];
                                                            } else {
                                                                newCart[p.id] = 1;
                                                            }
                                                            setCart(newCart);
                                                            updateSalesSummary(newCart, manualItems);
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
                                            })}
                                        </ScrollView>

                                        <StitchPressable
                                            onPress={() => setManualItemModalVisible(true)}
                                            style={{ marginBottom: 24 }}
                                        >
                                            <View style={styles.addManualButton}>
                                                <Plus size={20} color="#fff" />
                                                <Text style={styles.addManualButtonText}>Añadir Item Personalizado</Text>
                                            </View>
                                        </StitchPressable>

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
                                                            <Text style={styles.cartItemNameElegant}>{item.productName} (Custom)</Text>
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

                                {modalType === 'payment' && (
                                    <>
                                        <StitchInput
                                            label="Monto ($)"
                                            value={amount}
                                            onChangeText={setAmount}
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            isDark={isDark}
                                        />

                                        <StitchInput
                                            label="Nota / Descripción"
                                            value={description}
                                            onChangeText={setDescription}
                                            placeholder="Ej. Pago semanal"
                                            isDark={isDark}
                                        />
                                    </>
                                )}

                                {client.phone ? (
                                    <StitchPressable
                                        onPress={() => setNotifyViaWhatsApp(!notifyViaWhatsApp)}
                                        style={{ marginVertical: 18 }}
                                    >
                                        <View style={styles.whatsappToggle}>
                                            <View style={[styles.checkbox, notifyViaWhatsApp && { backgroundColor: colors.primary, borderColor: colors.primary }] as any}>
                                                {notifyViaWhatsApp && <View style={styles.checkboxInner} />}
                                            </View>
                                            <Text style={styles.whatsappToggleText} numberOfLines={1}>Enviar comprobante por WhatsApp</Text>
                                        </View>
                                    </StitchPressable>
                                ) : (
                                    <Text style={styles.noPhoneText}>Añade un teléfono para enviar comprobantes por WhatsApp</Text>
                                )}

                                <StitchButton
                                    title={modalType === 'sale' ? 'Agregar Venta' : 'Confirmar Abono'}
                                    variant={modalType === 'sale' ? 'primary' : 'secondary'}
                                    onPress={handleSaveTransaction}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Transaction Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editTransactionModalVisible}
                onRequestClose={() => setEditTransactionModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Editar Transacción</Text>
                                <StitchPressable onPress={() => setEditTransactionModalVisible(false)} style={{ padding: 4 }}>
                                    <X color={colors.text} size={24} />
                                </StitchPressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <StitchInput
                                    label="Monto ($)"
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    isDark={isDark}
                                />

                                <StitchInput
                                    label="Descripción"
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Descripción"
                                    isDark={isDark}
                                />

                                <StitchButton
                                    title="Guardar Cambios"
                                    onPress={handleSaveEditTransaction}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
                                        const updatedManual = [...manualItems, newItem];
                                        setManualItems(updatedManual);
                                        updateSalesSummary(cart, updatedManual);
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
                                        setAmount(selectedTransaction.amount.toString());
                                        setDescription(selectedTransaction.description);
                                        setShowTransactionMenu(false);
                                        setEditTransactionModalVisible(true);
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
                                    <View style={styles.letterAvatar}>
                                        <Text style={styles.letterAvatarText}>{getInitial(client.name)}</Text>
                                    </View>
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
        </SafeAreaView >
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.card,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    headerLocation: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        fontStyle: 'italic',
    },
    moreButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.card,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    scrollContent: {
        padding: 24,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
    },
    avatarGradient: {
        width: 140,
        height: 140,
        borderRadius: 70,
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImageContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 62,
        backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterAvatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterAvatarText: {
        fontSize: 48,
        fontWeight: '800',
        color: '#fff',
    },
    editImageIcon: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    balanceContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    balanceLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
    },
    balanceWrapper: {
        height: 80,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    maskedView: {
        width: '100%',
        height: '100%',
    },
    gradientFill: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceAmount: {
        fontSize: 56,
        fontWeight: Platform.OS === 'ios' ? '900' : 'bold',
        color: 'black',
        letterSpacing: -1,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    updateTime: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 48,
    },
    historySection: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIndicator: {
        width: 4,
        height: 24,
        backgroundColor: colors.secondary,
        borderRadius: 2,
        marginRight: 12,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '800',
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        flexWrap: 'nowrap',
        minHeight: 44,
    },
    exportText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
    },
    filterSection: {
        marginBottom: 24,
    },
    yearScroll: {
        marginBottom: 12,
    },
    yearButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.card,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    yearButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    monthScroll: {
        marginBottom: 16,
    },
    monthScrollContent: {
        paddingHorizontal: 20,
    },
    monthScrollInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12, // Modern way to handle spacing
    },
    monthButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    groupText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        marginHorizontal: 16,
    },
    groupContainer: {
        marginBottom: 32,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    groupHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    emptyHistory: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 40,
        fontStyle: 'italic',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
    },
    catalogSection: {
        marginBottom: 20,
    },
    catalogTitle: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    catalogScroll: {
        flexGrow: 0,
    },
    productSelectionContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    productsScroll: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    productChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginRight: 8,
        backgroundColor: colors.card,
    },
    productChipText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    productImageTiny: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    quantityBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    quantityBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cartSummary: {
        marginTop: 15,
        padding: 15,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cartTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 10,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cartItemName: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 15,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        minWidth: 15,
        textAlign: 'center',
    },
    cartItemPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        minWidth: 70,
        textAlign: 'right',
    },
    catalogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    catalogItemName: {
        color: colors.text,
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '600',
    },
    catalogItemPrice: {
        color: colors.primary,
        fontSize: 13,
        marginLeft: 8,
        fontWeight: '800',
    },
    whatsappToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginVertical: 18,
        paddingLeft: 4,
        flexWrap: 'nowrap',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    checkboxInner: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: '#fff',
    },
    whatsappToggleText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
    },
    noPhoneText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 15,
    },
    sheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 14,
        paddingHorizontal: 16,
        paddingBottom: 40,
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    sheetIndicator: {
        width: 36,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    sheetList: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        gap: 16,
    },
    sheetRowIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sheetRowText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    sheetDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: 76,
        marginRight: 20,
    },
    sheetCancelRow: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetCancelText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    // New Sales Flow Styles
    sectionHeaderSmall: {
        marginBottom: 12,
    },
    productsScrollLarge: {
        marginBottom: 20,
        paddingBottom: 5,
    },
    productCardLarge: {
        width: 140,
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginRight: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    productImageLarge: {
        width: '100%',
        height: 100,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    productCardInfo: {
        padding: 12,
    },
    productCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    productCardPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.primary,
    },
    productSelectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
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
        fontWeight: '900',
    },
    addManualButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondary,
        paddingVertical: 18,
        paddingHorizontal: 12, // Ensure text doesn't hit edges
        borderRadius: 20,
        flexWrap: 'nowrap',
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        width: '100%', // Ensure it takes full width
    },
    addManualButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        marginLeft: 12,
    },
    cartSummaryElegant: {
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.primary + '20',
        marginBottom: 20,
    },
    cartTitleElegant: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 2,
        marginBottom: 16,
        textAlign: 'center',
    },
    cartItemElegant: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '50',
    },
    cartItemIdentity: {
        flex: 1,
    },
    cartItemNameElegant: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    cartItemPriceElegant: {
        fontSize: 12,
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
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    qtyBtnModern: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyTextModern: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
        marginHorizontal: 10,
        minWidth: 20,
        textAlign: 'center',
    },
    cartItemTotalElegant: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        minWidth: 70,
        textAlign: 'right',
    },
    removeManualBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.danger + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

