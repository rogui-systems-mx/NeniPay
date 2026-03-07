import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CreditCard, DollarSign, MessageCircle, TrendingUp, Users, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
// @ts-ignore - No types available for this package
import MaskedView from '@react-native-masked-view/masked-view';
import { StitchButton } from '../../components/StitchButton';
import { StitchCard } from '../../components/StitchCard';
import { StitchInput } from '../../components/StitchInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Client } from '../../hooks/useNeniStore.types';
import { generatePaymentMessage, sendWhatsAppMessage } from '../../utils/whatsapp';
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
    const [sortBy, setSortBy] = useState<'amount' | 'name'>('amount');

    // Filter clients with pending balance and sort
    const pendingClients = useMemo(() => {
        const filtered = clients.filter(c => c.totalBalance > 0);
        return filtered.sort((a, b) => {
            if (sortBy === 'amount') {
                return b.totalBalance - a.totalBalance; // Highest first
            }
            return a.name.localeCompare(b.name); // Alphabetical
        });
    }, [clients, sortBy]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = pendingClients.reduce((sum, c) => sum + c.totalBalance, 0);
        const count = pendingClients.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }, [pendingClients]);

    const handleQuickPayment = (client: Client) => {
        setSelectedClient(client);
        setPaymentAmount(client.totalBalance.toString());
        setModalVisible(true);
    };

    const handleSavePayment = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            return;
        }
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
            client.name,
            0, // No payment amount for reminder
            "Recordatorio de pago pendiente",
            client.totalBalance,
            whatsappPaymentTemplate,
            businessName
        );
        sendWhatsAppMessage(client.phone, message);
    };

    const getDebtLevelColor = (balance: number) => {
        if (balance > stats.average * 1.5) return colors.danger;
        if (balance > stats.average * 0.8) return colors.warning;
        return colors.success;
    };

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    return (
        <SafeAreaView style={styles.container}>
            {/* Quick Payment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Registrar Pago</Text>
                            <StitchPressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                                <X color={colors.text} size={24} />
                            </StitchPressable>
                        </View>

                        {selectedClient && (
                            <>
                                <View style={styles.clientInfoModal}>
                                    <Text style={styles.clientLabel}>Cliente</Text>
                                    <Text style={styles.clientNameModal}>{selectedClient.name}</Text>
                                    <Text style={[styles.clientDebt, { color: colors.danger }]}>
                                        Saldo Total: ${selectedClient.totalBalance.toLocaleString()}
                                    </Text>
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
                                    variant="secondary"
                                    onPress={handleSavePayment}
                                    style={{ marginTop: 10 }}
                                />
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Cobranza</Text>
                    <Text style={styles.subtitle}>Gestiona tus ingresos pendientes</Text>
                </View>
            </View>

            {/* Statistics Dashboard */}
            <View style={styles.statsContainer}>
                <LinearGradient
                    colors={colors.gradientPrimary as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mainStatCard}
                >
                    <View style={styles.mainStatHeader}>
                        <DollarSign color="rgba(255,255,255,0.8)" size={16} />
                        <Text style={styles.mainStatLabel}>COBRO TOTAL PENDIENTE</Text>
                    </View>
                    <Text style={styles.mainStatValue}>
                        ${stats.total.toLocaleString()}
                    </Text>
                    <View style={styles.mainStatFooter}>
                        <Users color="rgba(255,255,255,0.8)" size={14} />
                        <Text style={styles.mainStatSublabel}>{stats.count} Clientes deudores</Text>
                    </View>
                </LinearGradient>
            </View>

            {/* Sort Controls */}
            <View style={styles.sortContainer}>
                <StitchPressable
                    style={StyleSheet.flatten([
                        styles.sortBadge,
                        sortBy === 'amount' && { backgroundColor: isDark ? colors.primary : colors.primary, borderColor: colors.primary }
                    ])}
                    onPress={() => setSortBy('amount')}
                >
                    <Text style={[styles.sortText, sortBy === 'amount' && { color: '#fff' }]}>Mayor Deuda</Text>
                </StitchPressable>
                <StitchPressable
                    style={StyleSheet.flatten([
                        styles.sortBadge,
                        sortBy === 'name' && { backgroundColor: isDark ? colors.primary : colors.primary, borderColor: colors.primary }
                    ])}
                    onPress={() => setSortBy('name')}
                >
                    <Text style={[styles.sortText, sortBy === 'name' && { color: '#fff' }]}>Alfabético</Text>
                </StitchPressable>
            </View>

            {/* List */}
            <FlatList
                data={pendingClients}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIconContainer}>
                            <TrendingUp color={colors.success} size={48} />
                        </View>
                        <Text style={styles.emptyText}>¡Todo al día!</Text>
                        <Text style={styles.emptySubtext}>No tienes cuentas por cobrar pendientes.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <StitchPressable onPress={() => router.push(`/cliente/${item.id}`)} scaleTo={0.98}>
                        <StitchCard style={styles.proCard}>
                            <View style={styles.cardIndicator(getDebtLevelColor(item.totalBalance))} />

                            <View style={styles.cardHeader}>
                                <View style={styles.avatarContainer}>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.avatarImg} />
                                    ) : (
                                        <LinearGradient
                                            colors={colors.gradientSecondary as any}
                                            style={styles.avatarLetter}
                                        >
                                            <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
                                        </LinearGradient>
                                    )}
                                </View>
                                <View style={styles.clientDetail}>
                                    <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.clientMeta}>{item.transactions?.length || 0} transacciones</Text>
                                </View>
                                <View style={styles.balanceContainer}>
                                    <Text style={[styles.balanceValue, { color: getDebtLevelColor(item.totalBalance) }]}>
                                        ${item.totalBalance.toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardDivider} />

                            <View style={styles.cardActions}>
                                <StitchPressable
                                    style={[styles.actionBtn, { backgroundColor: isDark ? colors.cardSecondary : colors.gray100 }]}
                                    onPress={() => handleQuickPayment(item)}
                                >
                                    <CreditCard color={colors.primary} size={18} />
                                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Abonar</Text>
                                </StitchPressable>

                                <StitchPressable
                                    style={[styles.actionBtn, { backgroundColor: colors.whatsapp }]}
                                    onPress={() => handleWhatsAppReminder(item)}
                                    disabled={!item.phone}
                                >
                                    <MessageCircle color="#fff" size={18} />
                                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>WhatsApp</Text>
                                </StitchPressable>
                            </View>
                        </StitchCard>
                    </StitchPressable>
                )}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => {
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 24,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        title: {
            color: colors.text,
            fontSize: 32,
            fontWeight: '900',
            letterSpacing: -0.5,
        },
        subtitle: {
            color: colors.textSecondary,
            fontSize: 14,
            marginTop: 2,
        },
        statsContainer: {
            paddingHorizontal: 24,
            marginBottom: 20,
        },
        mainStatCard: {
            borderRadius: 24,
            padding: 24,
            elevation: 10,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
        },
        mainStatHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        mainStatLabel: {
            color: 'rgba(255,255,255,0.7)',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1,
            marginLeft: 6,
        },
        mainStatValue: {
            color: '#fff',
            fontSize: 36,
            fontWeight: '900',
            marginVertical: 12,
        },
        mainStatFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            alignSelf: 'flex-start',
        },
        mainStatSublabel: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '600',
            marginLeft: 6,
        },
        sortContainer: {
            flexDirection: 'row',
            paddingHorizontal: 24,
            marginBottom: 16,
        },
        sortBadge: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            marginRight: 8,
        },
        sortText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        list: {
            paddingHorizontal: 24,
            paddingBottom: 40,
        },
        proCard: {
            marginBottom: 16,
            padding: 0,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            paddingLeft: 20,
        },
        avatarContainer: {
            width: 48,
            height: 48,
            borderRadius: 16,
            overflow: 'hidden',
        },
        avatarImg: {
            width: '100%',
            height: '100%',
        },
        avatarLetter: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            color: '#fff',
            fontSize: 20,
            fontWeight: '900',
        },
        clientDetail: {
            flex: 1,
            marginLeft: 12,
        },
        clientName: {
            color: colors.text,
            fontSize: 17,
            fontWeight: '800',
        },
        clientMeta: {
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 2,
        },
        balanceContainer: {
            alignItems: 'flex-end',
        },
        balanceValue: {
            fontSize: 20,
            fontWeight: '900',
        },
        cardDivider: {
            height: 1,
            backgroundColor: colors.border,
            marginHorizontal: 16,
        },
        cardActions: {
            flexDirection: 'row',
            padding: 12,
            paddingHorizontal: 16,
        },
        actionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 12,
            marginRight: 12,
        },
        actionBtnText: {
            fontSize: 13,
            fontWeight: '800',
            marginLeft: 8,
        },
        empty: {
            marginTop: 60,
            alignItems: 'center',
            padding: 40,
        },
        emptyIconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        emptyText: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '900',
            marginBottom: 8,
        },
        emptySubtext: {
            color: colors.textSecondary,
            fontSize: 16,
            textAlign: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            padding: 24,
            paddingBottom: 40,
            borderWidth: 1,
            borderColor: colors.border,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
        },
        modalTitle: {
            color: colors.text,
            fontSize: 22,
            fontWeight: '900',
        },
        clientInfoModal: {
            backgroundColor: isDark ? colors.cardSecondary : (colors.gray100 || colors.border || '#f1f5f9'),
            padding: 20,
            borderRadius: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
        },
        clientLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.5,
            marginBottom: 4,
        },
        clientNameModal: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '900',
            marginBottom: 4,
        },
        clientDebt: {
            fontSize: 15,
            fontWeight: '700',
        },
        quickAmounts: {
            flexDirection: 'row',
            marginTop: 16,
            marginBottom: 16,
        },
        quickAmountButton: {
            flex: 1,
            backgroundColor: colors.card,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            marginRight: 12,
        },
        quickAmountText: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '800',
        },
    });

    return {
        ...styles,
        cardIndicator: (color: string) => ({
            width: 4,
            height: '100%Custom' as any, // Cast to any to bypass DimensionValue strict check if needed, but '100%' is usually fine in RN. The lint error suggests a mismatch.
            backgroundColor: color,
            position: 'absolute' as const,
            left: 0,
            top: 0,
        } as const),
    };
};



