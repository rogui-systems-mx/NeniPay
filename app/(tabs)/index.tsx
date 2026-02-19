import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// @ts-ignore - No types available for this package
import MaskedView from '@react-native-masked-view/masked-view';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StitchButton } from '../../components/StitchButton';
import { StitchCard } from '../../components/StitchCard';
import { StitchInput } from '../../components/StitchInput';
import { StitchPhoneInput } from '../../components/StitchPhoneInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';

export default function ClientesScreen() {
  const { clients, loading, addClient, updateClient, deleteClient } = useNeniStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors, isDark);

  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; phone?: string; location?: string } | null>(null);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(client => client.name.toLowerCase().includes(query));
  }, [clients, searchQuery]);

  const totalPending = useMemo(() => clients.reduce((sum, c) => sum + c.totalBalance, 0), [clients]);
  const totalClientsCount = clients.length;

  if (loading) return null;

  const handleAddClient = () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre');
      return;
    }
    addClient(clientName, clientPhone.trim() || undefined, clientLocation.trim() || undefined);
    setClientName('');
    setClientPhone('');
    setClientLocation('');
    setModalVisible(false);
  };

  const handleEditClient = (client: { id: string; name: string; phone?: string; location?: string }) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone || '');
    setClientLocation(client.location || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre');
      return;
    }
    if (selectedClient) {
      updateClient(selectedClient.id, clientName, clientPhone.trim() || undefined, clientLocation.trim() || undefined);
      setEditModalVisible(false);
      setClientName('');
      setClientPhone('');
      setClientLocation('');
      setSelectedClient(null);
    }
  };

  const handleDeleteClient = (client: { id: string; name: string }) => {
    setSelectedClient(client);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = () => {
    if (selectedClient) {
      deleteClient(selectedClient.id);
      setDeleteDialogVisible(false);
      setSelectedClient(null);
    }
  };
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar clientes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <StitchPressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X color={colors.textSecondary} size={20} />
            </StitchPressable>
          )}
        </View>
      </View>

      <View style={styles.summaryHeader}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>PENDIENTE TOTAL</Text>
          {totalPending > 0 ? (
            Platform.OS === 'web' ? (
              <Text
                style={[styles.summaryValue, { color: colors.primary }]} // Web fallback to primary blue
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ${totalPending.toLocaleString()}
              </Text>
            ) : (
              <MaskedView
                style={{ height: 40, width: '100%' }}
                maskElement={
                  <Text
                    style={[styles.summaryValue, { textAlign: 'center' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ${totalPending.toLocaleString()}
                  </Text>
                }
              >
                <LinearGradient
                  colors={colors.gradientPrimary as any}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </MaskedView>
            )
          ) : (
            <Text
              style={[styles.summaryValue, { color: colors.success }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ${totalPending.toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>CLIENTES</Text>
          <Text style={styles.summaryValue}>{totalClientsCount}</Text>
        </View>
      </View>

      {/* Add Client Modal */}
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
                <Text style={styles.modalTitle}>Nuevo Cliente</Text>
                <StitchPressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
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
                  title="Crear Cliente"
                  onPress={handleAddClient}
                  style={{ marginTop: 10 }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Cliente</Text>
                <StitchPressable onPress={() => setEditModalVisible(false)} style={{ padding: 4 }}>
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

                <StitchInput
                  label="Teléfono / WhatsApp (Opcional)"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  placeholder="Ej. 5551234567"
                  keyboardType="phone-pad"
                  isDark={isDark}
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
                  onPress={handleSaveEdit}
                  style={{ marginTop: 10 }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Eliminar Cliente"
        message={`¿Estás seguro de eliminar a ${selectedClient?.name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogVisible(false)}
      />

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron clientes' : 'No tienes clientes aún'}
            </Text>
            {!searchQuery && (
              <StitchButton
                title="Agregar Primer Cliente"
                onPress={() => setModalVisible(true)}
                icon={<Plus color="#fff" size={24} />}
                style={{ marginTop: 20 }}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <StitchPressable
            onPress={() => router.push(`/cliente/${item.id}`)}
            scaleTo={0.98}
          >
            <StitchCard style={styles.clientCard}>
              <LinearGradient
                colors={colors.gradientPrimary as any}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
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
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                {item.location && (
                  <Text style={styles.clientLocation}>{item.location}</Text>
                )}
                <Text style={styles.clientBalanceStatus}>
                  {item.totalBalance > 0 ? 'Saldo pendiente' : 'Al día'}
                </Text>
              </View>
              <View style={styles.clientRight}>
                <Text style={[styles.clientBalance, { color: item.totalBalance > 0 ? colors.danger : colors.success }]}>
                  ${item.totalBalance.toLocaleString()}
                </Text>
              </View>
            </StitchCard>
          </StitchPressable>
        )}
      />

      <View style={styles.fabContainer}>
        <StitchPressable
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={[colors.primary || '#3B82F6', colors.secondary || '#8B5CF6']}
            style={styles.fab}
          >
            <Plus color="#fff" size={32} />
          </LinearGradient>
        </StitchPressable>
      </View>
    </SafeAreaView >
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: 12,
    fontSize: 16,
  },
  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100, // Space for FAB
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
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
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterAvatarTextSmall: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  clientLocation: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },
  clientBalanceStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  clientBalance: {
    fontSize: 18,
    fontWeight: '900',
  },
  clientRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fab: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
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
    maxHeight: '90%',
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
});
