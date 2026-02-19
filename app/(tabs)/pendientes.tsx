import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { DollarSign, TrendingUp, Users, X } from 'lucide-react-native';
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

export default function PendientesScreen() {
    const { clients, addTransaction } = useNeniStore();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors);

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
                                    <Text style={styles.clientDebt}>
                                        Saldo: ${selectedClient.totalBalance.toLocaleString()}
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

            {/* Header with Stats */}
            <View style={styles.header}>
                <Text style={styles.title}>Cuentas Pendientes</Text>
                <Text style={styles.subtitle}>Gestión de cobros</Text>
            </View>

            {/* Statistics Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 44, 44, 0.1)' }]}>
                        <DollarSign color={colors.danger} size={20} />
                    </View>
                    <Text
                        style={styles.statValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        ${stats.total.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Total Pendiente</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                        <Users color={colors.primary} size={20} />
                    </View>
                    <Text style={styles.statValue}>{stats.count}</Text>
                    <Text style={styles.statLabel}>Clientes</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(244, 123, 37, 0.1)' }]}>
                        <TrendingUp color={colors.secondary} size={20} />
                    </View>
                    <Text
                        style={styles.statValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        ${stats.average.toFixed(0)}
                    </Text>
                    <Text style={styles.statLabel}>Promedio</Text>
                </View>
            </View>

            {/* Sort Toggle */}
            <View style={styles.sortContainer}>
                <StitchPressable
                    style={StyleSheet.flatten([
                        styles.sortButton,
                        sortBy === 'amount' ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent' }
                    ])}
                    onPress={() => setSortBy('amount')}
                >
                    <Text style={[styles.sortText, sortBy === 'amount' && { color: '#fff' }]}>
                        Mayor Deuda
                    </Text>
                </StitchPressable>
                <StitchPressable
                    style={StyleSheet.flatten([
                        styles.sortButton,
                        sortBy === 'name' ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent' }
                    ])}
                    onPress={() => setSortBy('name')}
                >
                    <Text style={[styles.sortText, sortBy === 'name' && { color: '#fff' }]}>
                        Alfabético
                    </Text>
                </StitchPressable>
            </View>

            {/* Pending Clients List */}
            <FlatList
                data={pendingClients}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>¡Excelente!</Text>
                        <Text style={styles.emptySubtext}>No hay cuentas pendientes</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <StitchPressable onPress={() => router.push(`/cliente/${item.id}`)}>
                        <StitchCard style={styles.clientCard}>
                            <LinearGradient
                                colors={colors.gradientPrimary as any}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <View style={styles.clientAvatar}>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={styles.letterAvatarSmall}>
                                            <Text style={styles.letterAvatarTextSmall}>{getInitial(item.name)}</Text>
                                        </View>
                                    )}
                                </View>
                            </LinearGradient>
                            <View style={styles.clientInfoCard}>
                                <Text style={styles.clientName}>{item.name}</Text>
                                <Text style={styles.clientTransactions}>
                                    {(item.transactions || []).length} transacciones
                                </Text>
                            </View>
                            <View style={styles.amountContainer}>
                                {Platform.OS === 'web' ? (
                                    <Text
                                        style={[
                                            styles.clientBalance,
                                            { color: item.totalBalance > stats.average * 1.5 ? colors.danger : colors.primary }
                                        ]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        ${item.totalBalance.toLocaleString()}
                                    </Text>
                                ) : (
                                    <MaskedView
                                        style={styles.maskedViewSmall}
                                        maskElement={
                                            <Text
                                                style={styles.clientBalance}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                            >
                                                ${item.totalBalance.toLocaleString()}
                                            </Text>
                                        }
                                    >
                                        <LinearGradient
                                            colors={(item.totalBalance > stats.average * 1.5
                                                ? [colors.danger || '#ef4444', '#ff8e8e']
                                                : colors.gradientPrimary || ['#3B82F6', '#8B5CF6']) as [string, string, ...string[]]}
                                            start={{ x: 0, y: 0.5 }}
                                            end={{ x: 1, y: 0.5 }}
                                            style={styles.gradientFill}
                                        >
                                            <Text
                                                style={[styles.clientBalance, { opacity: 0 }]}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                            >
                                                ${item.totalBalance.toLocaleString()}
                                            </Text>
                                        </LinearGradient>
                                    </MaskedView>
                                )}
                                <StitchPressable
                                    style={[styles.payButton, { backgroundColor: colors.success }]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleQuickPayment(item);
                                    }}
                                >
                                    <Text style={styles.payButtonText}>Cobrar</Text>
                                </StitchPressable>
                            </View>
                        </StitchCard>
                    </StitchPressable>
                )}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 20,
        paddingBottom: 16,
    },
    title: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '900',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: 'center',
    },
    sortContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 16,
    },
    sortButton: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    list: {
        padding: 20,
        paddingTop: 0,
    },
    empty: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptySubtext: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    clientAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    letterAvatarSmall: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterAvatarTextSmall: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    clientInfoCard: {
        flex: 1,
    },
    clientName: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    clientTransactions: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    clientBalance: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
        textAlign: 'right',
    },
    maskedViewSmall: {
        height: 28,
        width: 100,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    gradientFill: {
        flex: 1,
    },
    payButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
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
        fontSize: 20,
        fontWeight: '800',
    },
    clientInfoModal: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    clientLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    clientNameModal: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    clientDebt: {
        color: colors.danger,
        fontSize: 14,
        fontWeight: '700',
    },
    quickAmounts: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        marginBottom: 12,
    },
    quickAmountButton: {
        flex: 1,
        backgroundColor: colors.card,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickAmountText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
});
