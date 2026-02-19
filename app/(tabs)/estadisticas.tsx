import { useRouter } from 'expo-router';
import { BarChart3, ChevronRight, TrendingUp, Users, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
        const all: Transaction[] = [];
        clients.forEach(client => {
            (client.transactions || []).forEach(t => {
                const date = new Date(t.date);
                if (date.getFullYear() === selectedYear && date.getMonth() === selectedMonth) {
                    all.push(t);
                }
            });
        });
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clients, selectedYear, selectedMonth]);

    const stats = useMemo(() => {
        const sales = periodTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
        const payments = periodTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
        return { sales, payments, count: periodTransactions.length };
    }, [periodTransactions]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        clients.forEach(c => (c.transactions || []).forEach(t => years.add(new Date(t.date).getFullYear())));
        return Array.from(years).sort((a, b) => b - a);
    }, [clients]);

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const filteredDetails = useMemo(() => {
        if (detailsType === 'all') return periodTransactions;
        return periodTransactions.filter(t => t.type === detailsType);
    }, [periodTransactions, detailsType]);

    const openDetails = (type: 'sale' | 'payment' | 'all') => {
        setDetailsType(type);
        setDetailsModalVisible(true);
    };

    const renderDetailsItem: ListRenderItem<Transaction> = ({ item }) => (
        <TimelineItem
            transaction={item}
            onMorePress={() => { }}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Estadísticas</Text>
                    <Text style={styles.subtitle}>Resumen financiero de tu negocio</Text>
                </View>

                {/* Statistics Section */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleContainer}>
                        <TrendingUp size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Vista General</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <TouchableOpacity
                            style={styles.statItem}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <Users size={24} color={colors.primary} style={styles.statIcon} />
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{totalClients}</Text>
                                <ChevronRight size={16} color={colors.textSecondary} />
                            </View>
                            <Text style={styles.statLabel}>Clientes Totales</Text>
                        </TouchableOpacity>

                        <View style={styles.statItem}>
                            <BarChart3 size={24} color={colors.secondary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{totalPending === 0 ? 0 : clients.reduce((sum, c) => sum + ((c.transactions || []).length > 0 ? 1 : 0), 0)}</Text>
                            <Text style={styles.statLabel}>Con Actividad</Text>
                        </View>
                    </View>

                    <View style={[styles.statItem, { marginTop: 12, alignItems: 'center' }]}>
                        <Text
                            style={[styles.largeStatValue, { color: colors.danger }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            ${totalPending.toLocaleString()}
                        </Text>
                        <Text style={styles.statLabel}>PENDIENTE TOTAL POR COBRAR</Text>
                    </View>
                </View>

                {/* Period Selector */}
                <View style={styles.periodSection}>
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

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                        {months.map((month, idx) => (
                            <TouchableOpacity
                                key={month}
                                style={[styles.monthButton, selectedMonth === idx && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: colors.primary }]}
                                onPress={() => setSelectedMonth(idx)}
                            >
                                <Text style={[styles.monthButtonText, selectedMonth === idx && { color: colors.primary, fontWeight: '800' }]}>
                                    {month}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Monthly Performance Section */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleContainer}>
                        <BarChart3 size={20} color={colors.success} />
                        <Text style={styles.sectionTitle}>
                            Desempeño de {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.monthlyCard}
                        onPress={() => openDetails('all')}
                    >
                        <View style={styles.monthlyRow}>
                            <TouchableOpacity
                                style={styles.monthlyItem}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    openDetails('sale');
                                }}
                            >
                                <Text style={styles.monthlyLabel}>VENTAS (+)</Text>
                                <Text
                                    style={[styles.monthlyValue, { color: colors.primary }]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    ${stats.sales.toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.monthlyDivider} />
                            <TouchableOpacity
                                style={styles.monthlyItem}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    openDetails('payment');
                                }}
                            >
                                <Text style={styles.monthlyLabel}>ABONOS (-)</Text>
                                <Text
                                    style={[styles.monthlyValue, { color: colors.success }]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    ${stats.payments.toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.transactionCountContainer}>
                            <Text style={styles.transactionCountText}>
                                {stats.count} Transacciones en este periodo
                            </Text>
                            <ChevronRight size={14} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Details Modal */}
                <Modal
                    visible={detailsModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setDetailsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {detailsType === 'sale' ? 'Ventas' : detailsType === 'payment' ? 'Abonos' : 'Transacciones'}
                                </Text>
                                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                                    <X color={colors.text} size={24} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalPeriodInfo}>
                                <Text style={styles.modalPeriodText}>
                                    {months[selectedMonth]} {selectedYear}
                                </Text>
                            </View>

                            <FlatList
                                data={filteredDetails}
                                keyExtractor={(item) => item.id}
                                renderItem={renderDetailsItem}
                                contentContainerStyle={styles.detailsList}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No hay registros para este periodo</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>

                <View style={styles.infoSection}>
                    <Text style={styles.infoText}>
                        Las estadísticas se actualizan automáticamente con cada nueva venta o abono registrado.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 24,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        color: colors.text,
        fontSize: 32,
        fontWeight: '900',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statItem: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statIcon: {
        marginBottom: 12,
    },
    statValue: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 4,
    },
    largeStatValue: {
        fontSize: 42,
        fontWeight: '900',
        marginBottom: 8,
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    monthlyCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    monthlyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    monthlyItem: {
        flex: 1,
        alignItems: 'center',
    },
    monthlyDivider: {
        width: 1,
        height: 60,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
    monthlyLabel: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    monthlyValue: {
        fontSize: 24,
        fontWeight: '900',
    },
    infoSection: {
        marginTop: 20,
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(91, 19, 236, 0.05)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(91, 19, 236, 0.1)',
    },
    infoText: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 4,
    },
    periodSection: {
        marginBottom: 24,
    },
    yearScroll: {
        marginBottom: 10,
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
        paddingBottom: 5,
    },
    monthButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    transactionCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 4,
    },
    transactionCountText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
    },
    modalPeriodInfo: {
        marginBottom: 20,
    },
    modalPeriodText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    detailsList: {
        paddingBottom: 20,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
        marginBottom: 20,
    },
});
