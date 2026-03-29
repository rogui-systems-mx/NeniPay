import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    CreditCard, DollarSign, MessageCircle, TrendingUp,
    X, Wallet, ShieldCheck, AlertCircle, ChevronRight,
    Search, Filter, ArrowDownLeft, TrendingDown
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList, Image, Modal, Platform, SafeAreaView,
    StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
    KeyboardAvoidingView
} from 'react-native';
import { StitchButton } from '../../components/StitchButton';
import { StitchCard } from '../../components/StitchCard';
import { StitchInput } from '../../components/StitchInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Client } from '../../hooks/useNeniStore.types';
import { sendWhatsAppMessage, generatePaymentMessage } from '../../utils/whatsapp';
import { useAuth } from '../../context/AuthContext';

export default function PendientesScreen() {
    const { clients, addTransaction, whatsappPaymentTemplate } = useNeniStore();
    const { businessName } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors, isDark);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [sortBy, setSortBy] = useState<'amount' | 'name' | 'days'>('days');
    const [searchQuery, setSearchQuery] = useState('');

    // Data Filtering & Logic
    const getDebtDays = (client: Client) => {
        const payments = (client.transactions || []).filter(t => t.type === 'payment');
        if (payments.length === 0) {
            const sales = (client.transactions || []).filter(t => t.type === 'sale');
            if (sales.length === 0) return 0;
            const oldestSale = new Date(Math.min(...sales.map(s => new Date(s.date).getTime())));
            return Math.floor((new Date().getTime() - oldestSale.getTime()) / (1000 * 60 * 60 * 24));
        }
        const newestPayment = new Date(Math.max(...payments.map(p => new Date(p.date).getTime())));
        return Math.floor((new Date().getTime() - newestPayment.getTime()) / (1000 * 60 * 60 * 24));
    };

    const pendingClients = useMemo(() => {
        return clients
            .filter(c => c.totalBalance > 0)
            .filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (c.phone && c.phone.includes(searchQuery))
            )
            .map(c => ({
                ...c,
                debtDays: getDebtDays(c)
            })).sort((a, b) => {
                if (sortBy === 'amount') return b.totalBalance - a.totalBalance;
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return b.debtDays - a.debtDays;
            });
    }, [clients, sortBy, searchQuery]);

    const stats = useMemo(() => {
        const total = clients.filter(c => c.totalBalance > 0).reduce((sum, c) => sum + c.totalBalance, 0);
        return { total, count: pendingClients.length, totalCount: clients.filter(c => c.totalBalance > 0).length };
    }, [clients, pendingClients]);

    const handleQuickPayment = (client: Client) => {
        setSelectedClient(client);
        setPaymentAmount(client.totalBalance.toString());
        setModalVisible(true);
    };

    const handleSavePayment = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;
        if (selectedClient) {
            addTransaction(selectedClient.id, 'payment', amount, 'Abono rápido');
            setModalVisible(false);
            setSelectedClient(null);
            setPaymentAmount('');
        }
    };

    const handleWhatsAppReminder = (client: Client) => {
        if (!client.phone) return;
        const message = generatePaymentMessage(
            client.name, 0, "Recordatorio de pago pendiente",
            client.totalBalance, whatsappPaymentTemplate, businessName
        );
        sendWhatsAppMessage(client.phone, message);
    };

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <LinearGradient
                colors={colors.gradientPrimary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ 
                    borderRadius: 32, 
                    padding: 2, 
                    marginBottom: 32,
                    width: '100%'
                }}
            >
                <StitchCard 
                    intensity={30} 
                    style={[
                        styles.heroCard, 
                        { 
                            // Fondo blanco premium para el modo claro (solicitado)
                            backgroundColor: isDark ? '#0f172a' : 'rgba(255, 255, 255, 0.95)', 
                            borderWidth: 0, 
                            margin: 0, 
                            marginBottom: 0, 
                            borderRadius: 30, 
                            height: 180 - 4, 
                        }
                    ]}
                >
                    <View style={[styles.heroContent, { alignItems: 'center' }]}>
                        <View style={[styles.heroTop, { justifyContent: 'center', marginBottom: 8 }]}>
                            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.primary + '15' }]}>
                                <TrendingDown color={isDark ? "#FFFFFF" : colors.primary} size={20} />
                            </View>
                            <Text style={[styles.heroLabel, { color: isDark ? '#FFFFFF' : colors.text, opacity: 0.8 }]}>TOTAL POR COBRAR</Text>
                        </View>
                        <Text style={[styles.heroAmount, { color: colors.danger, textAlign: 'center' }]}>
                            ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={[styles.heroFooter, { justifyContent: 'center' }]}>
                            <AlertCircle color={isDark ? colors.textSecondary : colors.textSecondary} size={14} opacity={0.6} />
                            <Text style={[styles.heroMetaText, { color: isDark ? colors.textSecondary : colors.textSecondary, opacity: 0.7 }]}>{stats.totalCount} deudores activos</Text>
                        </View>
                    </View>
                </StitchCard>
            </LinearGradient>

            <View style={styles.searchBarWrapper}>
                <StitchCard intensity={15} style={styles.searchBar}>
                    <Search color={colors.textSecondary} size={20} />
                    <TextInput
                        placeholder="Buscar deudor..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X color={colors.textSecondary} size={18} />
                        </TouchableOpacity>
                    )}
                </StitchCard>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    {searchQuery ? `Resultados (${stats.count})` : 'Cuentas Pendientes'}
                </Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        if (sortBy === 'days') setSortBy('amount');
                        else if (sortBy === 'amount') setSortBy('name');
                        else setSortBy('days');
                    }}
                    style={styles.sortBtn}
                >
                    <Text style={styles.sortBtnText}>
                        {sortBy === 'amount' ? 'Monto' : sortBy === 'name' ? 'Nombre' : 'Antigüedad'}
                    </Text>
                    <Filter color={colors.primary} size={14} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
                <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
            </View>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
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
                        <StitchCard intensity={60} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Registrar Pago</Text>
                            <StitchPressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X color={colors.text} size={24} />
                            </StitchPressable>
                        </View>

                        {selectedClient && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.clientInfoModal}>
                                    <View style={styles.clientModalHeader}>
                                        <LinearGradient colors={colors.gradientPrimary as any} style={[styles.modalAvatar, { overflow: 'hidden' }]}>
                                            {selectedClient.image ? (
                                                <Image source={{ uri: selectedClient.image }} style={{ width: '100%', height: '100%' }} />
                                            ) : (
                                                <Text style={styles.modalAvatarText}>{getInitial(selectedClient.name)}</Text>
                                            )}
                                        </LinearGradient>
                                        <View>
                                            <Text style={styles.clientLabel}>CLIENTE</Text>
                                            <Text style={styles.clientNameModal}>{selectedClient.name}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.modalDebtContainer}>
                                        <Text style={styles.modalDebtLabel}>Saldo Pendiente</Text>
                                        <Text style={[styles.clientDebt, { color: colors.danger }]}>
                                            ${selectedClient.totalBalance.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>

                                <StitchInput
                                    label="Monto a Pagar ($)"
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    isDark={isDark}
                                />

                                <View style={styles.quickAmounts}>
                                    <StitchPressable
                                        style={styles.quickAmountButton}
                                        onPress={() => setPaymentAmount((selectedClient.totalBalance / 2).toFixed(2))}
                                    >
                                        <Text style={styles.quickAmountText}>50%</Text>
                                    </StitchPressable>
                                    <StitchPressable
                                        style={styles.quickAmountButton}
                                        onPress={() => setPaymentAmount(selectedClient.totalBalance.toString())}
                                    >
                                        <Text style={styles.quickAmountText}>Total</Text>
                                    </StitchPressable>
                                </View>

                                <StitchButton
                                    title="Confirmar Pago"
                                    variant="primary"
                                    onPress={handleSavePayment}
                                    style={{ marginTop: 10 }}
                                />
                            </ScrollView>
                        )}
                    </StitchCard>
                </KeyboardAvoidingView>
            </View>
        </Modal>

            <FlatList
                data={pendingClients}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIconContainer}>
                            <ShieldCheck color={colors.success} size={48} />
                        </View>
                        <Text style={styles.emptyText}>¡Todo al día!</Text>
                        <Text style={styles.emptySubtext}>No tienes cuentas por cobrar pendientes.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={() => router.push(`/cliente/${item.id}`)}
                        style={styles.cardPressable}
                    >
                        <StitchCard style={styles.itemCard} intensity={25}>
                            <View style={styles.itemHeader}>
                                <View style={styles.avatarWrapper}>
                                    <LinearGradient
                                        colors={colors.gradientPrimary as any}
                                        style={styles.avatarGradient}
                                    >
                                        {item.image ? (
                                            <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
                                        )}
                                    </LinearGradient>
                                </View>

                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: (item.debtDays >= 30 ? colors.danger : item.debtDays > 15 ? colors.warning : colors.success) + '15' }
                                        ]}>
                                            <View style={[
                                                styles.indicator,
                                                { backgroundColor: item.debtDays >= 30 ? colors.danger : item.debtDays > 15 ? colors.warning : colors.success }
                                            ]} />
                                            <Text style={[
                                                styles.statusText,
                                                { color: item.debtDays >= 30 ? colors.danger : item.debtDays > 15 ? colors.warning : colors.success }
                                            ]}>
                                                {item.debtDays >= 30 ? 'MOROSO' : item.debtDays > 15 ? 'RETRASO' : 'AL DÍA'}
                                            </Text>
                                        </View>
                                        <Text style={styles.daysText}>{item.debtDays}d sin abono</Text>
                                    </View>
                                </View>

                                <View style={styles.balanceContainer}>
                                    <Text style={styles.balanceLabel}>SALDO</Text>
                                    <Text style={styles.itemBalance}>${item.totalBalance.toLocaleString()}</Text>
                                </View>
                            </View>

                            <View style={styles.itemActions}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.actionBtn}
                                    onPress={() => handleQuickPayment(item)}
                                >
                                    <View style={[StyleSheet.absoluteFill, styles.btnGlassBase]} />
                                    <View style={[StyleSheet.absoluteFill, { 
                                        borderWidth: 1.5, 
                                        borderColor: colors.primary + '50', 
                                        borderRadius: 18,
                                    }]} />
                                    <View style={styles.btnContentInner}>
                                        <DollarSign color={colors.primary} size={18} />
                                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>COBRAR</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.actionBtn}
                                    onPress={() => handleWhatsAppReminder(item)}
                                >
                                    <View style={[StyleSheet.absoluteFill, styles.btnGlassBase]} />
                                    <View style={[StyleSheet.absoluteFill, { 
                                        borderWidth: 1.5, 
                                        borderColor: colors.whatsapp + '40', 
                                        borderRadius: 18,
                                    }]} />
                                    <View style={styles.btnContentInner}>
                                        <MessageCircle color={colors.whatsapp} size={18} />
                                        <Text style={[styles.actionBtnText, { color: colors.whatsapp }]}>WHATSAPP</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </StitchCard>
                    </TouchableOpacity>
                )}
            />
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
        width: 500,
        height: 500,
        borderRadius: 250,
        opacity: 0.6,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 32 : 10,
    },
    heroCard: {
        height: 130,
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        padding: 0,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    heroContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        gap: 8,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLabel: {
        fontSize: 12,
        fontFamily: 'Manrope_800ExtraBold',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
    },
    heroAmount: {
        fontSize: 32,
        fontFamily: 'Manrope_800ExtraBold',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    heroFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroMetaText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontFamily: 'Manrope_700Bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    sortBtnText: {
        fontSize: 12,
        fontFamily: 'Manrope_700Bold',
        color: colors.primary,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    searchBarWrapper: {
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontFamily: 'Manrope_600SemiBold',
        fontSize: 15,
    },
    list: {
        paddingBottom: 100,
    },
    cardPressable: {
        marginHorizontal: 16,
        marginBottom: 8,
    },
    itemCard: {
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.95)',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        overflow: 'hidden',
    },
    avatarGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Manrope_800ExtraBold',
        textAlign: 'center',
        textAlignVertical: 'center', // Robust centering for Android
    },
    itemInfo: {
        flex: 1,
        marginLeft: 16,
    },
    itemName: {
        fontSize: 18,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    itemNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    statusRow: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 1,
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textSecondary,
        opacity: 0.3,
    },
    daysText: {
        fontSize: 11,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
        opacity: 0.6,
    },
    balanceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    balanceLabel: {
        fontSize: 8,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    itemBalance: {
        fontSize: 20,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    btnGlassBase: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    btnContentInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 1,
        height: 48,
        paddingHorizontal: 12,
    },
    actionBtnText: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        includeFontPadding: false,
        textAlignVertical: 'center',
        marginTop: 0,
    },
    empty: {
        padding: 60,
        alignItems: 'center',
        gap: 16,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.success + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: 'Manrope_500Medium',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.98)',
        borderRadius: 32,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    clientInfoModal: {
        backgroundColor: colors.cardSecondary,
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    clientModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    modalAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalAvatarText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
    },
    clientLabel: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    clientNameModal: {
        fontSize: 18,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    modalDebtContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.glassBorder,
        paddingTop: 12,
    },
    modalDebtLabel: {
        fontSize: 14,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
    },
    clientDebt: {
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
    },
    quickAmounts: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    quickAmountButton: {
        flex: 1,
        height: 50,
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAmountText: {
        fontSize: 14,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    }
});
