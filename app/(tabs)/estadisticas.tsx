import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    BarChart3, ChevronRight, TrendingUp, Users, X,
    PieChart, Activity, ShoppingBag, Wallet, Calendar,
    ArrowUpRight, ArrowDownLeft
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList, Image, ListRenderItem, Modal, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';

import { StitchCard } from '../../components/StitchCard';
import { StitchPressable } from '../../components/StitchPressable';
import { TimelineItem } from '../../components/TimelineItem';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Transaction } from '../../hooks/useNeniStore.types';

export default function EstadisticasScreen() {
    const { clients } = useNeniStore();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors, isDark);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [detailsType, setDetailsType] = useState<'sale' | 'payment' | 'all'>('all');

    const totalClients = clients.length;
    const totalPending = clients.reduce((sum, c) => sum + c.totalBalance, 0);

    // Calculate all transactions for the selected period
    const periodTransactions = useMemo(() => {
        const all: { transaction: Transaction; clientId: string }[] = [];
        clients.forEach(client => {
            (client.transactions || []).forEach(t => {
                const date = new Date(t.date);
                if (date.getFullYear() === selectedYear && date.getMonth() === selectedMonth) {
                    all.push({ transaction: t, clientId: client.id });
                }
            });
        });
        return all.sort((a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime());
    }, [clients, selectedYear, selectedMonth]);

    const stats = useMemo(() => {
        const sales = periodTransactions.filter(item => item.transaction.type === 'sale').reduce((sum, item) => sum + item.transaction.amount, 0);
        const payments = periodTransactions.filter(item => item.transaction.type === 'payment').reduce((sum, item) => sum + item.transaction.amount, 0);
        return { sales, payments, count: periodTransactions.length };
    }, [periodTransactions]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        clients.forEach(c => (c.transactions || []).forEach(t => years.add(new Date(t.date).getFullYear())));
        return Array.from(years).sort((a, b) => b - a);
    }, [clients]);

    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    const filteredDetails = useMemo(() => {
        if (detailsType === 'all') return periodTransactions;
        return periodTransactions.filter(item => item.transaction.type === detailsType);
    }, [periodTransactions, detailsType]);

    const openDetails = (type: 'sale' | 'payment' | 'all') => {
        setDetailsType(type);
        setDetailsModalVisible(true);
    };

    const renderDetailsItem: ListRenderItem<{ transaction: Transaction; clientId: string }> = ({ item }) => (
        <TimelineItem
            transaction={item.transaction}
            clientName={clients.find(c => c.id === item.clientId)?.name}
            onPress={() => {
                setDetailsModalVisible(false);
                router.push(`/cliente/${item.clientId}`);
            }}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
                <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Estadísticas</Text>
                    <Text style={styles.subtitle}>RESUMEN DE DESEMPEÑO</Text>
                </View>

                {/* Main Capital Card */}
                <View style={styles.section}>
                    <StitchCard intensity={45} style={styles.heroCard}>
                        <LinearGradient
                            colors={['#4338ca', '#312e81', '#1e1b4b']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.heroContent}>
                            <View style={styles.heroTop}>
                                <View style={styles.iconCircle}>
                                    <Wallet color="#fff" size={20} />
                                </View>
                                <Text style={styles.heroLabel}>CAPITAL POR COBRAR</Text>
                            </View>
                            <Text style={styles.heroAmount}>
                                ${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Text>
                            <View style={styles.heroFooter}>
                                <Users color="rgba(255,255,255,0.6)" size={14} />
                                <Text style={styles.heroMetaText}>{totalClients} Clientes totales</Text>
                            </View>
                        </View>
                    </StitchCard>
                </View>

                {/* Period Selector */}
                <View style={styles.periodSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll} contentContainerStyle={{ paddingHorizontal: 24 }}>
                        {availableYears.map(year => (
                            <TouchableOpacity
                                key={year}
                                style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
                                onPress={() => setSelectedYear(year)}
                            >
                                <Text style={[styles.yearButtonText, selectedYear === year && styles.yearButtonTextActive]}>
                                    {year}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={{ paddingHorizontal: 24 }}>
                        {months.map((month, idx) => (
                            <TouchableOpacity
                                key={month}
                                style={[styles.monthButton, selectedMonth === idx && styles.monthButtonActive]}
                                onPress={() => setSelectedMonth(idx)}
                            >
                                <Text style={[styles.monthButtonText, selectedMonth === idx && styles.monthButtonTextActive]}>
                                    {month}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Period Stats Grid */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Activity size={18} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Balance del Periodo</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <StitchPressable style={{ flex: 1 }} onPress={() => openDetails('sale')}>
                            <StitchCard style={styles.statCard} intensity={25}>
                                <View style={styles.statIconCircle}>
                                    <ArrowUpRight color={colors.primary} size={20} />
                                </View>
                                <Text style={styles.statLabel}>VENTAS</Text>
                                <Text style={[styles.statValue, { color: colors.primary }]}>
                                    ${stats.sales.toLocaleString()}
                                </Text>
                            </StitchCard>
                        </StitchPressable>

                        <StitchPressable style={{ flex: 1 }} onPress={() => openDetails('payment')}>
                            <StitchCard style={styles.statCard} intensity={25}>
                                <View style={[styles.statIconCircle, { backgroundColor: colors.success + '20' }]}>
                                    <ArrowDownLeft color={colors.success} size={20} />
                                </View>
                                <Text style={styles.statLabel}>ABONOS</Text>
                                <Text style={[styles.statValue, { color: colors.success }]}>
                                    ${stats.payments.toLocaleString()}
                                </Text>
                            </StitchCard>
                        </StitchPressable>
                    </View>

                    <StitchPressable onPress={() => openDetails('all')}>
                        <StitchCard style={styles.summaryCard} intensity={20}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryInfo}>
                                    <Text style={styles.summaryLabel}>TRANSACCIONES</Text>
                                    <Text style={styles.summaryValue}>{stats.count} Movimientos</Text>
                                </View>
                                <View style={styles.summaryAction}>
                                    <Text style={styles.summaryLink}>Ver todo</Text>
                                    <ChevronRight size={16} color={colors.primary} />
                                </View>
                            </View>
                        </StitchCard>
                    </StitchPressable>
                </View>

                <View style={styles.infoWrapper}>
                    <Text style={styles.infoText}>
                        Resumen generado automáticamente basado en los registros de {months[selectedMonth]} {selectedYear}.
                    </Text>
                </View>
            </ScrollView>

            {/* Details Modal */}
            <Modal animationType="slide" transparent={true} visible={detailsModalVisible} onRequestClose={() => setDetailsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <StitchCard intensity={80} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Detalle</Text>
                                <Text style={styles.modalSubtitle}>
                                    {months[selectedMonth]} {selectedYear} • {detailsType.toUpperCase()}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.closeBtn}>
                                <X color={colors.text} size={28} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={filteredDetails}
                            keyExtractor={(item) => item.transaction.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.detailsList}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Activity color={colors.textSecondary} size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
                                    <Text style={styles.emptyText}>No hay registros en este periodo</Text>
                                </View>
                            }
                            renderItem={renderDetailsItem}
                        />
                    </StitchCard>
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
        width: 500,
        height: 500,
        borderRadius: 250,
        opacity: 0.6,
    },
    content: {
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 52 : 12,
        paddingBottom: 24,
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: -1.2,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    heroCard: {
        height: 180,
        borderRadius: 32,
        overflow: 'hidden',
        padding: 0,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    heroContent: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
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
        fontSize: 38,
        fontFamily: 'Manrope_800ExtraBold',
        color: '#FFFFFF',
        letterSpacing: -1.5,
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
    periodSection: {
        marginBottom: 32,
    },
    yearScroll: {
        marginBottom: 16,
    },
    yearButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: colors.card,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    yearButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    yearButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
    },
    yearButtonTextActive: {
        color: '#fff',
    },
    monthScroll: {
        marginBottom: 10,
    },
    monthButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: colors.card,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthButtonActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '30',
    },
    monthButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: 'Manrope_600SemiBold',
    },
    monthButtonTextActive: {
        color: colors.primary,
        fontFamily: 'Manrope_800ExtraBold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    statCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
    },
    summaryCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryInfo: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
    },
    summaryAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    summaryLink: {
        fontSize: 12,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.primary,
    },
    infoWrapper: {
        paddingHorizontal: 40,
        marginTop: 10,
    },
    infoText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 12,
        fontFamily: 'Manrope_500Medium',
        lineHeight: 18,
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.98)',
        borderRadius: 36,
        padding: 24,
        maxHeight: '85%',
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
    modalSubtitle: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    detailsList: {
        paddingBottom: 20,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Manrope_600SemiBold',
        color: colors.textSecondary,
    },
});
