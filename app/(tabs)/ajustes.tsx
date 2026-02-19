import { useRouter } from 'expo-router';
import { Cloud, Info, LogOut, MessageSquare, Moon, Package, Sun, Trash2, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SettingsCard } from '../../components/SettingsCard';
import { StitchInput } from '../../components/StitchInput';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';

export default function AjustesScreen() {
    const { whatsappSaleTemplate, whatsappPaymentTemplate, updateWhatsAppTemplates, clearAllData } = useNeniStore();
    const { user, logout, updateProfileInfo, updateEmailInfo, updatePasswordInfo, userPhone, verifyPassword, businessName } = useAuth();
    const { theme, toggleTheme, colors, isDark } = useTheme();
    const styles = getStyles(colors);
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
                // Cloud mode - verify password
                const isVerified = await verifyPassword(confirmPassword);
                if (!isVerified) {
                    Alert.alert('Error', 'Contraseña incorrecta. No se pudo verificar tu identidad.');
                    setIsVerifying(false);
                    return;
                }
            } else {
                // Local mode - verify text
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
            // Update basic info
            if (newName !== user?.displayName || newPhone !== userPhone || newBusinessName !== businessName) {
                await updateProfileInfo(newName, newBusinessName, newPhone);
            }

            // Update Email (requires sensitive auth)
            if (newEmail && newEmail !== user?.email) {
                await updateEmailInfo(newEmail);
            }

            // Update Password (requires sensitive auth)
            if (newPassword) {
                await updatePasswordInfo(newPassword);
            }

            Alert.alert('Éxito', 'Perfil actualizado correctamente. Si cambiaste tu correo o contraseña, es posible que necesites re-iniciar sesión.');
            setEditModalVisible(false);
            setNewPassword('');
        } catch (error: any) {
            console.error('Update profile error:', error);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert('Seguridad', 'Para cambiar datos sensibles, debes haber iniciado sesión recientemente. Por favor, cierra sesión y vuelve a entrar.');
            } else {
                Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ConfirmDialog
                visible={deleteDialogVisible}
                title="¿Eliminar Datos?"
                message="Esta acción borrará todos tus clientes e historial. No se puede deshacer."
                confirmText="Siguiente"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogVisible(false)}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Image
                                source={require('../../assets/images/icon_round.png')}
                                style={styles.headerIcon}
                            />
                            <Text style={styles.title}>Ajustes</Text>
                        </View>
                        <Text style={styles.subtitle}>Configuración y gestión de datos</Text>
                    </View>

                    {/* Theme Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personalización</Text>
                        <SettingsCard
                            title="Tema de la App"
                            description={isDark ? "Modo Oscuro activado" : "Modo Claro activado"}
                            icon={isDark ? Moon : Sun}
                            rightText={isDark ? "Oscuro" : "Claro"}
                            onPress={toggleTheme}
                        />
                        <SettingsCard
                            title="Personalizar WhatsApp"
                            description="Mensajes automáticos de venta y abono"
                            icon={MessageSquare}
                            onPress={() => {
                                setTempSaleTemplate(whatsappSaleTemplate);
                                setTempPaymentTemplate(whatsappPaymentTemplate);
                                setWaModalVisible(true);
                            }}
                        />
                    </View>

                    {/* Account Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mi Cuenta</Text>
                        {user ? (
                            <>
                                <SettingsCard
                                    title="Editar Perfil"
                                    description="Nombre, Correo, Teléfono y Contraseña"
                                    icon={User}
                                    onPress={() => {
                                        setNewName(user.displayName || '');
                                        setNewEmail(user.email || '');
                                        setNewPhone(userPhone || '');
                                        setNewBusinessName(businessName || '');
                                        setEditModalVisible(true);
                                    }}
                                />
                                <SettingsCard
                                    title="Cerrar Sesión"
                                    description={user.email || ''}
                                    icon={LogOut}
                                    danger
                                    onPress={() => {
                                        Alert.alert(
                                            'Cerrar Sesión',
                                            '¿Estás seguro de que quieres salir?',
                                            [
                                                { text: 'Cancelar', style: 'cancel' },
                                                {
                                                    text: 'Salir',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        await logout();
                                                        router.replace('/auth' as any);
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                />
                            </>
                        ) : (
                            <SettingsCard
                                title="Iniciar Sesión / Registrarse"
                                description="Sincroniza tus datos en la nube"
                                icon={Cloud}
                                onPress={() => router.push('/auth')}
                            />
                        )}
                    </View>

                    {/* Data Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Datos locales</Text>
                        <SettingsCard
                            title="Limpiar Base de Datos"
                            description="Borrar todos los clientes y ventas locales"
                            icon={Trash2}
                            danger
                            onPress={() => setDeleteDialogVisible(true)}
                        />
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Acerca de</Text>
                        <SettingsCard
                            title="NeniPay v1.1.2"
                            description="Tu aliado en ventas y cobranza"
                            icon={Package}
                        />
                        <SettingsCard
                            title="Desarrollado por"
                            description="ROGUI SYSTEMS MX"
                            icon={User}
                        />
                        <SettingsCard
                            title="Soporte y Ayuda"
                            description="Contactar con el desarrollador"
                            icon={Info}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Hecho con ❤️ para las Nenis</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Edit Profile Modal */}
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
                                <Text style={styles.modalTitle}>Editar Mi Perfil</Text>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <StitchInput
                                    label="Nombre Completo"
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Tu nombre"
                                    isDark={isDark}
                                />
                                <StitchInput
                                    label="Nombre Comercial / Negocio"
                                    value={newBusinessName}
                                    onChangeText={setNewBusinessName}
                                    placeholder="Nombre de tu negocio"
                                    isDark={isDark}
                                />
                                <StitchInput
                                    label="Correo Electrónico"
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    placeholder="tu@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    isDark={isDark}
                                />
                                <StitchInput
                                    label="Teléfono"
                                    value={newPhone}
                                    onChangeText={setNewPhone}
                                    placeholder="1234567890"
                                    keyboardType="phone-pad"
                                    isDark={isDark}
                                />
                                <StitchInput
                                    label="Nueva Contraseña (opcional)"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Dejar en blanco para no cambiar"
                                    secureTextEntry
                                    isDark={isDark}
                                />
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setEditModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleUpdateProfile}
                                    disabled={loading}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* WhatsApp Templates Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={waModalVisible}
                onRequestClose={() => setWaModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <Text style={styles.modalTitle}>Mensajes de WhatsApp</Text>
                                    <TouchableOpacity onPress={() => setWaModalVisible(false)}>
                                        <X color={colors.text} size={24} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.instructionsText}>
                                    Puedes usar: {'\n'}
                                    <Text style={{ fontWeight: 'bold' }}>{"{name}"}</Text> (Cliente), {' '}
                                    <Text style={{ fontWeight: 'bold' }}>{"{amount}"}</Text> (Monto), {' '}
                                    <Text style={{ fontWeight: 'bold' }}>{"{description}"}</Text> (Nota), {' '}
                                    <Text style={{ fontWeight: 'bold' }}>{"{balance}"}</Text> (Saldo Total)
                                </Text>

                                <StitchInput
                                    label="Plantilla de Venta"
                                    value={tempSaleTemplate}
                                    onChangeText={setTempSaleTemplate}
                                    placeholder="Escribe tu mensaje..."
                                    multiline
                                    numberOfLines={4}
                                    isDark={isDark}
                                />

                                <StitchInput
                                    label="Plantilla de Abono"
                                    value={tempPaymentTemplate}
                                    onChangeText={setTempPaymentTemplate}
                                    placeholder="Escribe tu mensaje..."
                                    multiline
                                    numberOfLines={4}
                                    isDark={isDark}
                                />
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setWaModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={() => {
                                        updateWhatsAppTemplates(tempSaleTemplate, tempPaymentTemplate);
                                        setWaModalVisible(false);
                                        Alert.alert('Éxito', 'Plantillas guardadas correctamente');
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Security Verification Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={securityModalVisible}
                onRequestClose={() => setSecurityModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Verificar Identidad</Text>
                                <Text style={[styles.instructionsText, { textAlign: 'center', marginTop: 8 }]}>
                                    {user
                                        ? 'Ingresa tu contraseña para confirmar que eres tú.'
                                        : 'Escribe la palabra "ELIMINAR" para confirmar la limpieza.'}
                                </Text>
                            </View>

                            <View style={styles.modalBody}>
                                {user ? (
                                    <StitchInput
                                        label="Contraseña"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Tu contraseña"
                                        secureTextEntry
                                        isDark={isDark}
                                    />
                                ) : (
                                    <StitchInput
                                        label='Escribe "ELIMINAR"'
                                        value={confirmText}
                                        onChangeText={setConfirmText}
                                        placeholder="ELIMINAR"
                                        autoCapitalize="characters"
                                        isDark={isDark}
                                    />
                                )}
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setSecurityModalVisible(false)}
                                    disabled={isVerifying}
                                >
                                    <Text style={styles.cancelButtonText}>Abortar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.danger }]}
                                    onPress={handleFinalDelete}
                                    disabled={isVerifying}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {isVerifying ? 'Verificando...' : 'Confirmar Eliminación'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
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
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
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
    sectionTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    footer: {
        marginTop: 40,
        marginBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    modalTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '900',
    },
    modalBody: {
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    cancelButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    saveButton: {
        flex: 2,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    instructionsText: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 18,
    }
});
