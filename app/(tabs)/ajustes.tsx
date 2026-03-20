import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Cloud, Info, LogOut, MessageSquare, Moon, Package,
    Sun, Trash2, User, X, Settings, ShieldCheck,
    HelpCircle, ChevronRight, Camera, Bell, Lock, Play, Youtube
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert, Image, KeyboardAvoidingView, Modal, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text,
    TouchableOpacity, View, Linking
} from 'react-native';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SettingsCard } from '../../components/SettingsCard';
import { StitchInput } from '../../components/StitchInput';
import { StitchButton } from '../../components/StitchButton';
import { StitchPressable } from '../../components/StitchPressable';
import { StitchCard } from '../../components/StitchCard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../utils/firebase';

export default function AjustesScreen() {
    const { 
        whatsappSaleTemplate, whatsappPaymentTemplate, updateWhatsAppTemplates, 
        clearAllData, notificationsEnabled, toggleNotifications 
    } = useNeniStore();
    const { user, logout, updateProfileInfo, updateEmailInfo, updatePasswordInfo, userPhone, verifyPassword, businessName } = useAuth();
    const { theme, toggleTheme, colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    const router = useRouter();

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [securityModalVisible, setSecurityModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [waModalVisible, setWaModalVisible] = useState(false);

    // Security state
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Edit states
    const [newName, setNewName] = useState(user?.displayName || '');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [newPhone, setNewPhone] = useState(userPhone || '');
    const [newBusinessName, setNewBusinessName] = useState(businessName || '');
    const [newPassword, setNewPassword] = useState('');
    const [tempSaleTemplate, setTempSaleTemplate] = useState(whatsappSaleTemplate);
    const [tempPaymentTemplate, setTempPaymentTemplate] = useState(whatsappPaymentTemplate);
    const [loading, setLoading] = useState(false);

    const handleConfirmDelete = () => {
        setDeleteDialogVisible(false);
        setConfirmPassword('');
        setConfirmText('');
        setSecurityModalVisible(true);
    };

    const handleFinalDelete = async () => {
        setIsVerifying(true);
        try {
            if (user) {
                const isVerified = await verifyPassword(confirmPassword);
                if (!isVerified) {
                    Alert.alert('Error', 'Contraseña incorrecta. No se pudo verificar tu identidad.');
                    setIsVerifying(false);
                    return;
                }
            } else {
                if (confirmText.toUpperCase() !== 'ELIMINAR') {
                    Alert.alert('Error', 'Debes escribir ELIMINAR para continuar.');
                    setIsVerifying(false);
                    return;
                }
            }

            await clearAllData();
            Alert.alert('Éxito', 'Todos los datos han sido eliminados.');
            setSecurityModalVisible(false);
        } catch (error) {
            console.error('Final delete error:', error);
            Alert.alert('Error', 'Ocurrió un error al intentar eliminar los datos.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            if (newName !== user?.displayName || (newPhone && newPhone !== userPhone) || newBusinessName !== businessName) {
                await updateProfileInfo(newName, newBusinessName, newPhone || undefined);
            }

            if (newEmail && newEmail !== user?.email) {
                await updateEmailInfo(newEmail);
            }

            if (newPassword) {
                await updatePasswordInfo(newPassword);
            }

            Alert.alert('Éxito', 'Perfil actualizado correctamente.');
            setEditModalVisible(false);
            setNewPassword('');
        } catch (error: any) {
            console.error('Update profile error:', error);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert('Seguridad', 'Por favor, cierra sesión y vuelve a entrar para realizar cambios sensibles.');
            } else {
                Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos para cambiar tu perfil.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            try {
                setLoading(true);
                const downloadUrl = await uploadImage(result.assets[0].uri, `profiles/${user?.uid || 'local'}`);
                await updateProfileInfo(user?.displayName ?? '', businessName ?? undefined, userPhone ?? undefined, downloadUrl ?? undefined);
                Alert.alert('Éxito', 'Foto de perfil actualizada.');
            } catch (error) {
                console.error('Upload error:', error);
                Alert.alert('Error', 'No se pudo subir la imagen.');
            } finally {
                setLoading(false);
            }
        }
    };

    const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : '?');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
                <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
            </View>

            <ConfirmDialog
                visible={deleteDialogVisible}
                title="¿Eliminar Datos?"
                message="Esta acción borrará todos tus clientes e historial. No se puede deshacer."
                confirmText="SIGUIENTE"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogVisible(false)}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Ajustes</Text>
                    <Text style={styles.subtitle}>CONFIGURACIÓN DEL SISTEMA</Text>
                </View>

                {/* Profile Profile Hero */}
                <View style={styles.profileSection}>
                    <StitchCard intensity={45} style={styles.profileCard}>
                        <LinearGradient
                            colors={['#1e1b4b', '#312e81', '#4338ca']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.profileContent}>
                            <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.8}>
                                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.avatarGlow}>
                                    {user?.photoURL ? (
                                        <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>{getInitial(user?.displayName || businessName || undefined)}</Text>
                                    )}
                                </LinearGradient>
                                <View style={styles.editAvatarBtn}>
                                    <Camera color="#fff" size={12} />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{user?.displayName || businessName || 'Neni User'}</Text>
                                <Text style={styles.profileMeta}>{user?.email || 'Modo Local'}</Text>
                            </View>
                            <StitchPressable
                                style={styles.editBtnSimple}
                                onPress={() => {
                                    setNewName(user?.displayName || '');
                                    setNewEmail(user?.email || '');
                                    setNewPhone(userPhone || '');
                                    setNewBusinessName(businessName || '');
                                    setEditModalVisible(true);
                                }}
                            >
                                <Settings color="#fff" size={20} />
                            </StitchPressable>
                        </View>
                    </StitchCard>
                </View>

                {/* Settings Groups */}
                <View style={styles.section}>
                    <Text style={styles.groupTitle}>APARIENCIA Y MENSAJERÍA</Text>
                    <SettingsCard
                        title="Tema Visual"
                        description={isDark ? "Modo Premium Dark" : "Modo Premium Light"}
                        icon={isDark ? Moon : Sun}
                        rightText={isDark ? "DARK" : "LIGHT"}
                        onPress={toggleTheme}
                    />
                    <SettingsCard
                        title="WhatsApp Templates"
                        description="Mensajes de venta y abono"
                        icon={MessageSquare}
                        onPress={() => {
                            setTempSaleTemplate(whatsappSaleTemplate);
                            setTempPaymentTemplate(whatsappPaymentTemplate);
                            setWaModalVisible(true);
                        }}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.groupTitle}>SEGURIDAD Y DATOS</Text>
                    <SettingsCard
                        title="Alertas Inteligentes"
                        description="Cobros a los 15 y 30 días"
                        icon={Bell}
                        rightText={notificationsEnabled ? "ON" : "OFF"}
                        onPress={async () => {
                            const newState = !notificationsEnabled;
                            const success = await toggleNotifications(newState);
                            if (!success && newState) {
                                Alert.alert('Permiso Denegado', 'No pudimos activar las notificaciones. Verifica que la app tenga los permisos en los Ajustes de tu celular.');
                            } else if (success) {
                                Alert.alert('Notificaciones', newState ? 'Alertas inteligentes activadas para cobrar a los 15 y 30 días.' : 'Notificaciones desactivadas.');
                            }
                        }}
                    />
                    <SettingsCard
                        title="Limpiar Base de Datos"
                        description="Borrar historial local"
                        icon={Trash2}
                        danger
                        onPress={() => setDeleteDialogVisible(true)}
                    />
                    {user && (
                        <SettingsCard
                            title="Cerrar Sesión"
                            description="Salir de la cuenta en la nube"
                            icon={LogOut}
                            danger
                            onPress={() => {
                                Alert.alert('Salir', '¿Seguro que quieres cerrar sesión?', [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'SALIR', style: 'destructive', onPress: async () => {
                                            await logout();
                                            router.replace('/auth' as any);
                                        }
                                    }
                                ]);
                            }}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.groupTitle}>SOPORTE</Text>

                    {/* NeniPay Academy Banner */}
                    <TouchableOpacity 
                        activeOpacity={0.9} 
                        onPress={() => Linking.openURL('https://youtube.com/@nenipaysistemas')}
                        style={{ marginBottom: 16 }}
                    >
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                borderRadius: 28,
                                padding: 2,
                            }}
                        >
                            <StitchCard intensity={25} style={{ padding: 20, borderRadius: 26, borderWidth: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.15)' }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Youtube color="#FF0000" size={16} />
                                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 2, marginLeft: 6 }}>NENIPAY ACADEMY</Text>
                                    </View>
                                    <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5, marginBottom: 2 }}>Aprende a usar la app</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Manrope_500Medium' }}>Videotutoriales y tips exclusivos</Text>
                                </View>
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Play color="#FFF" size={20} style={{ marginLeft: 3 }} />
                                </View>
                            </StitchCard>
                        </LinearGradient>
                    </TouchableOpacity>

                    <SettingsCard title="Versión 2.0.0" description="Official Release" icon={Package} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerHeart}>Hecho con ❤️ para las Nenis</Text>
                    <Text style={styles.footerBrand}>NENIPAY</Text>
                    <Text style={styles.footerCredit}>Desarrollado por ROGUI SYSTEMS MX</Text>
                </View>
            </ScrollView>

            {/* Profile Edit Modal */}
            <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <StitchCard intensity={80} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Editar Perfil</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}><X color={colors.text} size={28} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <StitchInput label="NOMBRE" value={newName} onChangeText={setNewName} isDark={isDark} />
                                <StitchInput label="NEGOCIO" value={newBusinessName} onChangeText={setNewBusinessName} isDark={isDark} />
                                <StitchInput label="TELÉFONO" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" isDark={isDark} />
                                {user && (
                                    <>
                                        <StitchInput label="CORREO" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" isDark={isDark} />
                                        <StitchInput label="NUEVA CONTRASEÑA" value={newPassword} onChangeText={setNewPassword} secureTextEntry isDark={isDark} placeholder="••••••••" />
                                    </>
                                )}
                                <StitchButton title={loading ? "GUARDANDO..." : "GUARDAR CAMBIOS"} onPress={handleUpdateProfile} loading={loading} style={{ marginTop: 20 }} />
                            </ScrollView>
                        </StitchCard>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* WhatsApp Templates Modal */}
            <Modal animationType="slide" transparent={true} visible={waModalVisible} onRequestClose={() => setWaModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <StitchCard intensity={80} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>WhatsApp</Text>
                                <TouchableOpacity onPress={() => setWaModalVisible(false)}><X color={colors.text} size={28} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.infoBox}>
                                    <Text style={styles.instructionsText}>
                                        Variables: <Text style={styles.bold}>{"{name}"}</Text>, <Text style={styles.bold}>{"{amount}"}</Text>, <Text style={styles.bold}>{"{balance}"}</Text>
                                    </Text>
                                </View>
                                <StitchInput label="PLANTILLA VENTA" value={tempSaleTemplate} onChangeText={setTempSaleTemplate} multiline numberOfLines={4} isDark={isDark} />
                                <StitchInput label="PLANTILLA ABONO" value={tempPaymentTemplate} onChangeText={setTempPaymentTemplate} multiline numberOfLines={4} isDark={isDark} />
                                <StitchButton title="GUARDAR PLANTILLAS" onPress={() => {
                                    updateWhatsAppTemplates(tempSaleTemplate, tempPaymentTemplate);
                                    setWaModalVisible(false);
                                    Alert.alert('Éxito', 'Configuración guardada');
                                }} style={{ marginTop: 20 }} />
                            </ScrollView>
                        </StitchCard>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Security Modal */}
            <Modal animationType="fade" transparent={true} visible={securityModalVisible} onRequestClose={() => setSecurityModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <StitchCard intensity={90} style={styles.securityContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Validar</Text>
                            <TouchableOpacity onPress={() => setSecurityModalVisible(false)}><X color={colors.text} size={28} /></TouchableOpacity>
                        </View>
                        <Text style={styles.securityDesc}>
                            {user ? 'Contraseña para confirmar:' : 'Escribe "ELIMINAR":'}
                        </Text>
                        {user ? (
                            <StitchInput label="CONTRASEÑA" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry isDark={isDark} />
                        ) : (
                            <StitchInput label="VALIDACIÓN" value={confirmText} onChangeText={setConfirmText} placeholder="ELIMINAR" autoCapitalize="characters" isDark={isDark} />
                        )}
                        <StitchButton
                            title={isVerifying ? "PROCESANDO..." : "CONFIRMAR ACCIÓN"}
                            onPress={handleFinalDelete}
                            loading={isVerifying}
                            style={{ marginTop: 20, backgroundColor: colors.danger || '#EF4444' }}
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
    profileSection: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    profileCard: {
        height: 120,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    profileContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    avatarWrapper: {
        width: 64,
        height: 64,
        position: 'relative',
    },
    avatarGlow: {
        width: 64,
        height: 64,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Manrope_800ExtraBold',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: colors.primary,
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#1e1b4b',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    profileName: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
        marginBottom: 2,
    },
    profileMeta: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Manrope_600SemiBold',
    },
    editBtnSimple: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    groupTitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
        opacity: 0.7,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerBrand: {
        color: colors.text,
        fontSize: 14,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 4,
        opacity: 0.3,
    },
    footerCredit: {
        color: colors.textSecondary,
        fontSize: 10,
        fontFamily: 'Manrope_600SemiBold',
        marginTop: 4,
        opacity: 0.3,
    },
    footerHeart: {
        color: colors.primary,
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        marginBottom: 8,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
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
    infoBox: {
        backgroundColor: colors.primary + '10',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    instructionsText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontFamily: 'Manrope_600SemiBold',
        lineHeight: 18,
    },
    bold: {
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.primary,
    },
    securityContent: {
        borderRadius: 36,
        padding: 24,
        width: '100%',
    },
    securityDesc: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: 'Manrope_600SemiBold',
        marginBottom: 16,
    }
});
