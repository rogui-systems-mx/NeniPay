import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Search, UserPlus, Users, X, ChevronRight, Phone, MapPin, MoreVertical, Plus
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList, Image, SafeAreaView, StyleSheet,
    Text, View, Platform, TextInput, TouchableOpacity
} from 'react-native';
import { StitchCard } from '../../components/StitchCard';
import { StitchPressable } from '../../components/StitchPressable';
import { StitchButton } from '../../components/StitchButton';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { Client } from '../../hooks/useNeniStore.types';

export default function ClientesScreen() {
    const { clients, getClientColor } = useNeniStore();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors, isDark);

    const [searchQuery, setSearchQuery] = useState('');

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery)
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, searchQuery]);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.title}>Mis Clientes</Text>
                    <Text style={styles.subtitle}>{clients.length} CLIENTES REGISTRADOS</Text>
                </View>
                <StitchPressable 
                    onPress={() => router.push('/cliente/nuevo')}
                    style={styles.headerActionBtn}
                >
                    <Plus color={colors.primary} size={28} />
                </StitchPressable>
            </View>

            <View style={styles.searchContainer}>
                <StitchCard intensity={30} style={styles.searchWrapper}>
                    <Search color={colors.textSecondary} size={20} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Buscar por nombre o teléfono..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X color={colors.textSecondary} size={20} />
                        </TouchableOpacity>
                    )}
                </StitchCard>
            </View>
        </View>
    );

    const renderClientItem = ({ item }: { item: Client }) => {
        const clientColor = getClientColor(item);
        
        return (
            <View style={{ marginBottom: 20 }}>
                <StitchPressable 
                    onPress={() => router.push(`/cliente/${item.id}`)}
                >
                <StitchCard style={styles.clientCard} intensity={25}>
                    <View style={styles.clientMain}>
                        <View style={styles.avatarContainer}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.avatarImage} />
                            ) : (
                                <LinearGradient
                                    colors={colors.gradientPrimary as any}
                                    style={styles.avatarImage}
                                >
                                    <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )}
                        </View>
                        
                        <View style={styles.clientInfo}>
                            <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
                            <View style={styles.clientMeta}>
                                {item.phone ? (
                                    <View style={styles.metaItem}>
                                        <Phone size={12} color={colors.textSecondary} />
                                        <Text style={styles.metaText}>{item.phone}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.metaText}>Sin teléfono</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.clientRight}>
                            <Text style={[
                                styles.balanceText,
                                { color: item.totalBalance > 0 ? colors.danger : colors.success }
                            ]}>
                                ${item.totalBalance.toLocaleString()}
                            </Text>
                            <ChevronRight size={18} color={colors.textSecondary} opacity={0.5} />
                        </View>
                    </View>

                    {item.location && (
                        <View style={styles.locationTag}>
                            <MapPin size={10} color={colors.textSecondary} />
                            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                        </View>
                    )}
                </StitchCard>
            </StitchPressable>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
                <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
            </View>

            {renderHeader()}

            <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={renderClientItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Users size={60} color={colors.textSecondary} opacity={0.2} />
                        <Text style={styles.emptyTitle}>No hay clientes</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery ? 'No se encontraron resultados para tu búsqueda.' : 'Comienza agregando tu primer cliente.'}
                        </Text>
                        {!searchQuery && (
                            <StitchButton
                                title="Agregar Cliente"
                                onPress={() => router.push('/cliente/nuevo')}
                                style={{ marginTop: 20 }}
                            />
                        )}
                    </View>
                }
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
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 52 : 12,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
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
    headerActionBtn: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        marginTop: 4,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    searchIcon: {
        marginRight: 10,
        opacity: 0.5,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontFamily: 'Manrope_600SemiBold',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    clientItemWrapper: {
        marginBottom: 24,
    },
    clientCard: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        backgroundColor: colors.card + '90',
    },
    clientMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontFamily: 'Manrope_800ExtraBold',
        textAlign: 'center',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 17,
        fontFamily: 'Manrope_700Bold',
        color: colors.text,
        marginBottom: 4,
    },
    clientMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontFamily: 'Manrope_500Medium',
    },
    clientRight: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    balanceText: {
        fontSize: 16,
        fontFamily: 'Manrope_800ExtraBold',
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.glassBorder,
        opacity: 0.7,
    },
    locationText: {
        fontSize: 11,
        fontFamily: 'Manrope_500Medium',
        color: colors.textSecondary,
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontFamily: 'Manrope_500Medium',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    }
});
