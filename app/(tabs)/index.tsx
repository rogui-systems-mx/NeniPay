import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, Search, UserPlus, MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, View, TextInput } from 'react-native';
import { StitchCard } from '../../components/StitchCard';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';

export default function ClientesScreen() {
  const { clients } = useNeniStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors, isDark);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchQuery]);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Reciente';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>Gestiona tu red de contactos</Text>
        </View>
        <StitchPressable
          onPress={() => router.push('/cliente/nuevo')}
          style={styles.addBtn}
        >
          <LinearGradient
            colors={colors.gradientPrimary as any}
            style={styles.addBtnGradient}
          >
            <Plus color="#fff" size={24} />
          </LinearGradient>
        </StitchPressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search color={colors.textSecondary} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente por nombre o teléfono..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Client List */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <UserPlus color={colors.primary} size={48} />
            </View>
            <Text style={styles.emptyText}>No hay clientes</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'No se encontraron resultados para tu búsqueda.' : 'Toca el botón + para agregar tu primer cliente.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StitchPressable onPress={() => router.push(`/cliente/${item.id}`)} scaleTo={0.97}>
            <StitchCard style={styles.agendaCard}>
              <View style={styles.cardContent}>
                <View style={styles.avatarWrapper}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.avatarImg} />
                  ) : (
                    <LinearGradient
                      colors={colors.gradientSecondary as any}
                      style={styles.avatarPlaceholder}
                    >
                      <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
                    </LinearGradient>
                  )}
                </View>

                <View style={styles.infoWrapper}>
                  <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin color={colors.textSecondary} size={12} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.location || 'Sin dirección'}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Calendar color={colors.textSecondary} size={12} />
                      <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionWrapper}>
                  <ChevronRight color={colors.border} size={20} />
                </View>
              </View>
            </StitchCard>
          </StitchPressable>
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
  header: {
    padding: 24,
    paddingBottom: 12,
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
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  agendaCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  infoWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  clientName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  actionWrapper: {
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
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
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
});
