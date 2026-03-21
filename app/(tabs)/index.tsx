import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Plus, Search, UserPlus, Bell, TrendingUp,
  CreditCard, Calendar, BarChart2, MoreHorizontal,
  ShoppingBag, Wallet, ArrowUpRight, ArrowDownLeft,
  Users, X, ChevronRight, Package, AlertTriangle, PhoneCall
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList, Image, SafeAreaView, StyleSheet,
  Text, View, Platform, ScrollView, Modal, TextInput,
  TouchableOpacity
} from 'react-native';
import { StitchCard } from '../../components/StitchCard';
import { StitchPressable } from '../../components/StitchPressable';
import { QuickAction } from '../../components/QuickAction';
import { TimelineItem } from '../../components/TimelineItem';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const { clients, products } = useNeniStore();
  const { user, businessName } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors, isDark);

  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorAction, setSelectorAction] = useState<'sale' | 'payment'>('sale');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  // Data Aggregation
  const totalBalance = useMemo(() => {
    return clients.reduce((sum, c) => sum + (c.totalBalance || 0), 0);
  }, [clients]);

  const recentActivity = useMemo(() => {
    const all = clients.flatMap(c =>
      (c.transactions || []).map(t => ({
        ...t,
        clientName: c.name,
        clientId: c.id
      }))
    );
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [clients]);

  const periodStats = useMemo(() => {
    let sales = 0;
    let payments = 0;
    clients.forEach(c => {
      (c.transactions || []).forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          if (t.type === 'sale') sales += t.amount;
          else payments += t.amount;
        }
      });
    });
    return { sales, payments };
  }, [clients, selectedMonth, selectedYear]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone?.includes(searchQuery)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchQuery]);

  const filteredGlobalResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return { clients: [], products: [] };
    const query = globalSearchQuery.toLowerCase();
    return {
      clients: clients.filter(c => c.name.toLowerCase().includes(query) || c.phone?.includes(query)),
      products: products.filter(p => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
    };
  }, [clients, products, globalSearchQuery]);

  const notifications = useMemo(() => {
    const list: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Notification: Low Stock
    products.filter(p => p.stock !== undefined && p.stock < 5).forEach(p => {
      list.push({
        id: `stock-${p.id}`,
        type: 'warning',
        title: 'Stock Bajo',
        message: `${p.name} tiene solo ${p.stock} unidades.`,
        icon: <AlertTriangle color="#F59E0B" size={18} />,
        action: () => router.push('/(tabs)/productos'),
        label: 'Reabastecer'
      });
    });

    // Notification: Smart Reminders (Traffic Light)
    const now = new Date();
    clients.forEach(c => {
      if (c.totalBalance <= 0) return;
      
      const txs = c.transactions || [];
      if (txs.length === 0) return;
      
      const sorted = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = new Date(sorted[0].date);
      if (isNaN(lastDate.getTime())) return;
      
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 30) {
        list.push({
          id: `moroso-${c.id}`,
          type: 'danger',
          title: '🔴 Cliente Moroso',
          message: `${c.name} lleva ${diffDays} días sin abonar. Deuda: $${c.totalBalance.toLocaleString()}`,
          icon: <AlertTriangle color="#EF4444" size={18} />,
          action: () => router.push(`/cliente/${c.id}`),
          label: 'Cobrar ahora'
        });
      } else if (diffDays >= 15) {
        list.push({
          id: `retraso-${c.id}`,
          type: 'warning',
          title: '🟡 Cliente en Retraso',
          message: `${c.name} lleva ${diffDays} días sin abonar. Deuda: $${c.totalBalance.toLocaleString()}`,
          icon: <AlertTriangle color="#F59E0B" size={18} />,
          action: () => router.push(`/cliente/${c.id}`),
          label: 'Ver detalle'
        });
      }
    });

    // Notification: Activity Today
    let transactionsToday = 0;
    clients.forEach(c => {
      (c.transactions || []).forEach(t => {
        if (t.date.startsWith(today)) transactionsToday++;
      });
    });

    if (transactionsToday > 0) {
      list.push({
        id: 'activity-today',
        type: 'info',
        title: 'Actividad de Hoy',
        message: `Has registrado ${transactionsToday} movimientos hoy.`,
        icon: <TrendingUp color="#3B82F6" size={18} />,
        action: () => router.push('/(tabs)/pendientes'),
        label: 'Ver historial'
      });
    }

    return list;
  }, [clients, products]);

  const handleAction = (type: 'sale' | 'payment') => {
    setSelectorAction(type);
    setSearchQuery('');
    setSelectorVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.profileImageContainer}>
          <LinearGradient
            colors={colors.gradientPrimary as any}
            style={styles.profileGlow}
          />
          <Image
            source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?u=nenipay' }}
            style={styles.profileImage}
          />
        </View>
        <View style={styles.greetingContainer}>
          <Text style={styles.welcomeBack}>BIENVENIDO</Text>
          <Text style={styles.adminName}>{businessName || user?.displayName || 'Admin'}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <StitchPressable 
          style={styles.headerIconBtn}
          onPress={() => {
            setGlobalSearchQuery('');
            setGlobalSearchVisible(true);
          }}
        >
          <Search color={colors.text} size={22} />
        </StitchPressable>
        <StitchPressable 
          style={styles.headerIconBtn}
          onPress={() => setNotificationsVisible(true)}
        >
          <Bell color={colors.text} size={22} />
          {notifications.length > 0 && <View style={styles.notificationDot} />}
        </StitchPressable>
      </View>
    </View>
  );

  const renderBalanceCard = () => (
    <StitchCard intensity={45} style={styles.heroCard}>
      <LinearGradient
        colors={['#1e1b4b', '#312e81', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroTop}>
          <View style={styles.iconCircle}>
            <Wallet color="#fff" size={18} />
          </View>
          <Text style={styles.heroLabel}>CAPITAL POR COBRAR</Text>
        </View>
        <Text style={styles.heroAmount}>
          ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.avatarStack}>
            {clients.slice(0, 3).map((c, i) => (
              <View key={c.id} style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -15, zIndex: 10 - i }]}>
                {c.image ? (
                  <Image source={{ uri: c.image }} style={styles.stackAvatar} />
                ) : (
                  <LinearGradient
                    colors={colors.gradientPrimary as any}
                    style={styles.stackAvatar}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Manrope_800ExtraBold' }}>{c.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </View>
            ))}
            {clients.length > 3 && (
              <View style={[styles.stackItem, styles.stackMore, { marginLeft: -15 }]}>
                <Text style={styles.stackMoreText}>+{clients.length - 3}</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroMetaText}>{clients.length} Clientes activos</Text>
        </View>
      </View>
    </StitchCard>
  );

  const renderQuickActions = () => (
    <View style={styles.actionGrid}>
      <QuickAction
        icon={<UserPlus color={colors.secondary} size={24} />}
        label="Cliente"
        onPress={() => router.push('/cliente/nuevo')}
      />
      <QuickAction
        icon={<ShoppingBag color={colors.primary} size={24} />}
        label="Venta"
        onPress={() => handleAction('sale')}
      />
      <QuickAction
        icon={<ArrowDownLeft color="#FFB800" size={24} />}
        label="Abono"
        onPress={() => handleAction('payment')}
      />
        <QuickAction
        icon={<Package color="#D946EF" size={24} />}
        label="Producto"
        onPress={() => router.push('/producto/nuevo')}
      />
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.statsSection}>
      <StitchCard intensity={25} style={styles.statCard}>
        <View style={styles.statIconCircle}>
          <TrendingUp color={colors.primary} size={16} />
        </View>
        <Text style={styles.statLabel}>VENTAS MES</Text>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          ${periodStats.sales.toLocaleString()}
        </Text>
      </StitchCard>
      <StitchCard intensity={25} style={styles.statCard}>
        <View style={[styles.statIconCircle, { backgroundColor: colors.success + '20' }]}>
          <ArrowDownLeft color={colors.success} size={16} />
        </View>
        <Text style={styles.statLabel}>ABONOS MES</Text>
        <Text style={[styles.statValue, { color: colors.success }]}>
          ${periodStats.payments.toLocaleString()}
        </Text>
      </StitchCard>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgGlowWrapper} pointerEvents="none">
        <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
        <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
      </View>

      <FlatList
        data={recentActivity}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TimelineItem
            transaction={item}
            onPress={() => router.push(`/cliente/${item.clientId}`)}
          />
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderBalanceCard()}
            {renderQuickActions()}
            {renderStatsSection()}
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <StitchPressable onPress={() => router.push('/(tabs)/pendientes')}>
                <Text style={styles.viewMore}>VER TODO</Text>
              </StitchPressable>
            </View>
          </>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <TrendingUp color={colors.textSecondary} size={40} opacity={0.3} />
            <Text style={styles.emptyText}>No hay actividad aún</Text>
          </View>
        }
      />

      {/* Client Selector Modal */}
      <Modal
        visible={selectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <StitchCard intensity={isDark ? 80 : 80} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
                <Text style={styles.modalSubtitle}>¿PARA QUIÉN ES EL/LA {selectorAction === 'sale' ? 'VENTA' : 'ABONO'}?</Text>
              </View>
              <StitchPressable onPress={() => setSelectorVisible(false)} style={styles.closeBtn}>
                <X color={colors.text} size={24} />
              </StitchPressable>
            </View>

            <View style={styles.searchBar}>
              <Search color={colors.textSecondary} size={18} />
              <TextInput
                placeholder="Buscar cliente..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <StitchPressable
                  onPress={() => {
                    setSelectorVisible(false);
                    router.push(`/cliente/${item.id}?action=${selectorAction}`);
                  }}
                  style={styles.clientItem}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.clientDebt}>Saldo: ${item.totalBalance.toLocaleString()}</Text>
                  </View>
                  <ChevronRight color={colors.primary} size={18} />
                </StitchPressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users color={colors.textSecondary} size={40} opacity={0.3} />
                  <Text style={styles.emptyText}>No se encontraron clientes</Text>
                </View>
              }
            />
          </StitchCard>
        </View>
      </Modal>

      {/* Global Search Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={globalSearchVisible}
        onRequestClose={() => setGlobalSearchVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <StitchCard intensity={isDark ? 90 : 90} style={[styles.modalContent, { height: '85%', justifyContent: 'flex-start' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Búsqueda Global</Text>
                <Text style={styles.modalSubtitle}>CLIENTES Y PRODUCTOS</Text>
              </View>
              <StitchPressable onPress={() => setGlobalSearchVisible(false)} style={styles.closeBtn}>
                <X color={colors.text} size={28} />
              </StitchPressable>
            </View>

            <View style={styles.searchBar}>
              <Search color={colors.primary} size={18} />
              <TextInput
                placeholder="¿Qué buscas hoy?"
                placeholderTextColor={colors.textSecondary}
                value={globalSearchQuery}
                onChangeText={setGlobalSearchQuery}
                style={styles.searchInput}
                autoFocus
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {globalSearchQuery.trim() === '' ? (
                <View style={styles.emptySearch}>
                  <TrendingUp color={colors.textSecondary} size={48} opacity={0.2} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptySearchText}>Escribe para buscar...</Text>
                </View>
              ) : (
                <>
                  {filteredGlobalResults.clients.length > 0 && (
                    <View style={styles.searchSection}>
                      <Text style={styles.sectionLabel}>CLIENTES</Text>
                      {filteredGlobalResults.clients.map(item => (
                        <StitchPressable
                          key={`c-${item.id}`}
                          onPress={() => {
                            setGlobalSearchVisible(false);
                            router.push(`/cliente/${item.id}`);
                          }}
                          style={styles.searchResultItem}
                        >
                          <LinearGradient
                            colors={colors.gradientPrimary as any}
                            style={styles.resultAvatar}
                          >
                            <Text style={{ color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' }}>{item.name.charAt(0).toUpperCase()}</Text>
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultName}>{item.name}</Text>
                            <Text style={styles.resultMeta}>Saldo: ${item.totalBalance.toLocaleString()}</Text>
                          </View>
                          <ChevronRight color={colors.textSecondary} size={16} />
                        </StitchPressable>
                      ))}
                    </View>
                  )}

                  {filteredGlobalResults.products.length > 0 && (
                    <View style={styles.searchSection}>
                      <Text style={styles.sectionLabel}>PRODUCTOS</Text>
                      {filteredGlobalResults.products.map(item => (
                        <StitchPressable
                          key={`p-${item.id}`}
                          onPress={() => {
                            setGlobalSearchVisible(false);
                            router.push('/(tabs)/productos');
                          }}
                          style={styles.searchResultItem}
                        >
                          <View style={[styles.resultAvatar, { backgroundColor: colors.primary + '15' }]}>
                            {item.image ? (
                               <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                            ) : (
                               <Package color={colors.primary} size={16} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultName}>{item.name}</Text>
                            <Text style={styles.resultMeta}>${item.price.toLocaleString()} • Stock: {item.stock}</Text>
                          </View>
                          <ChevronRight color={colors.textSecondary} size={16} />
                        </StitchPressable>
                      ))}
                    </View>
                  )}

                  {filteredGlobalResults.clients.length === 0 && filteredGlobalResults.products.length === 0 && (
                    <View style={styles.emptySearch}>
                      <X color={colors.textSecondary} size={40} opacity={0.2} />
                      <Text style={styles.emptySearchText}>No se encontraron resultados</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </StitchCard>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <StitchCard intensity={isDark ? 95 : 95} style={[styles.modalContent, { height: '70%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notificaciones</Text>
                <Text style={styles.modalSubtitle}>ALERTAS Y RECORDATORIOS</Text>
              </View>
              <StitchPressable onPress={() => setNotificationsVisible(false)} style={styles.closeBtn}>
                <X color={colors.text} size={24} />
              </StitchPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {notifications.length === 0 ? (
                <View style={styles.emptySearch}>
                  <Bell color={colors.textSecondary} size={48} opacity={0.2} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptySearchText}>Todo al día. No hay alertas nuevas.</Text>
                </View>
              ) : (
                notifications.map(n => (
                  <View key={n.id} style={styles.notificationItem}>
                    <View style={[styles.notiIconCircle, { backgroundColor: n.type === 'warning' ? '#F59E0B20' : n.type === 'danger' ? '#EF444420' : '#3B82F620' }]}>
                      {n.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notiTitle}>{n.title}</Text>
                      <Text style={styles.notiMessage}>{n.message}</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          setNotificationsVisible(false);
                          n.action();
                        }}
                        style={styles.notiAction}
                      >
                        <Text style={[styles.notiActionText, { color: n.type === 'warning' ? '#F59E0B' : n.type === 'danger' ? '#EF4444' : '#3B82F6' }]}>{n.label}</Text>
                        <ChevronRight color={n.type === 'warning' ? '#F59E0B' : n.type === 'danger' ? '#EF4444' : '#3B82F6'} size={12} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 52 : 12,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImageContainer: {
    width: 54,
    height: 54,
    position: 'relative',
  },
  profileGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 27,
    opacity: 0.5,
    transform: [{ scale: 1.1 }],
  },
  profileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.background,
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  welcomeBack: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  adminName: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  heroCard: {
    height: 180,
    borderRadius: 32,
    marginBottom: 32,
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
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  heroAmount: {
    fontSize: 38,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#312e81',
    overflow: 'hidden',
  },
  stackAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackMore: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  stackMoreText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.text,
  },
  viewMore: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.primary,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.3)',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginLeft: 12,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
  },
  clientDebt: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Manrope_500Medium',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 12,
  },
  // Global Search Styles
  emptySearch: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptySearchText: {
    color: colors.textSecondary,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
    opacity: 0.6,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultName: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Manrope_500Medium',
  },
  // Notifications
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  notiIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notiTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  notiMessage: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  notiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notiActionText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    textTransform: 'uppercase',
  }
});
