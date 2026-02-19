// Custom safe import for GoogleSignin to prevent crash in Expo Go
let GoogleSignin: any = null;
try {
    const GoogleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = GoogleModule.GoogleSignin;
} catch (e) {
    console.warn('Google Sign-In not available in this environment (likely Expo Go).');
}
import { useRouter } from 'expo-router';
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { Eye, EyeOff, LogIn, Mail, Moon, Smartphone, Sun, User as UserIcon, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { StitchButton } from '../../components/StitchButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../utils/firebase';

export default function AuthScreen() {
    const { isConfigured, signInWithGoogle, updateProfileInfo } = useAuth();
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        if (GoogleSignin) {
            try {
                GoogleSignin.configure({
                    webClientId: '451033486398-1pinfnbqg6kese7fc6l8k8eb45e40uc8.apps.googleusercontent.com',
                    offlineAccess: true,
                });
            } catch (e) {
                console.error('Failed to configure Google Sign-In:', e);
            }
        }
    }, []);

    if (!isConfigured) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.scrollContent}>
                    <Text style={styles.title}>Configuración Requerida</Text>
                    <Text style={styles.subtitle}>
                        Para habilitar la nube y el inicio de sesión, necesitas configurar Firebase en `utils/firebase.ts`.
                    </Text>
                    <View style={{ gap: 12, marginTop: 20 }}>
                        <StitchButton
                            title="Continuar en Modo Local"
                            onPress={() => router.replace('/(tabs)' as any)}
                        />
                        <Text style={[styles.subtitle, { fontSize: 13 }]}>
                            Nota: En modo local la información solo se guarda en este teléfono.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const handleAuth = async () => {
        if (!email || !password) return Alert.alert('Error', 'Por favor completa todos los campos');

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        setLoading(true);
        try {
            if (isRegister) {
                if (!displayName.trim()) return Alert.alert('Error', 'Por favor ingresa tu nombre');
                if (!phone.trim()) return Alert.alert('Error', 'Por favor ingresa tu teléfono');

                const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

                // Save profile info immediately
                if (userCredential.user) {
                    await updateProfileInfo(displayName.trim(), phone.trim());
                }

                Alert.alert('Éxito', 'Cuenta creada correctamente', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)') }
                ]);
            } else {
                await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error('Auth Error:', error);
            let errorMessage = 'Ocurrió un error inesperado';
            if (error.code === 'auth/invalid-email') errorMessage = 'El correo electrónico no es válido.';
            if (error.code === 'auth/user-not-found') errorMessage = 'No existe una cuenta con este correo.';
            if (error.code === 'auth/wrong-password') errorMessage = 'La contraseña es incorrecta.';
            if (error.code === 'auth/email-already-in-use') errorMessage = 'Este correo ya está registrado.';
            if (error.code === 'auth/weak-password') errorMessage = 'La contraseña debe tener al menos 6 caracteres.';

            Alert.alert('Error de Autenticación', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!GoogleSignin) {
            Alert.alert(
                'Entorno No Compatible',
                'El inicio de sesión con Google requiere la aplicación instalada (APK) o un Build de Desarrollo. Por ahora, utiliza Correo y Contraseña en Expo Go.'
            );
            return;
        }

        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const { data } = await GoogleSignin.signIn();
            const idToken = data?.idToken;

            if (idToken) {
                await signInWithGoogle(idToken);
                router.replace('/(tabs)');
            } else {
                throw new Error('No se recibió el token de Google');
            }
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            if (error.code === '7') {
                Alert.alert('Error de Configuración', 'El inicio de sesión no está configurado correctamente en Firebase Console (verifica los SHA-1).');
            } else if (error.code !== 'SIGN_IN_CANCELLED') {
                Alert.alert('Error', error.message || 'No se pudo iniciar sesión con Google');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!recoveryEmail) return Alert.alert('Error', 'Ingresa tu correo para recuperar la contraseña');

        const cleanEmail = recoveryEmail.trim();
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, cleanEmail);
            setForgotPasswordModalVisible(false);
            setRecoveryEmail('');
            Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.');
        } catch (error: any) {
            let errorMessage = 'No se pudo enviar el correo.';
            if (error.code === 'auth/user-not-found') errorMessage = 'No existe cuenta con este correo.';
            if (error.code === 'auth/invalid-email') errorMessage = 'El correo no es válido.';

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.themeToggle}
                            onPress={toggleTheme}
                        >
                            {isDark ? <Sun size={20} color={colors.primary} /> : <Moon size={20} color={colors.primary} />}
                        </TouchableOpacity>

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>
                            {isRegister ? 'Crear Cuenta' : 'Bienvenid@'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isRegister ? 'Regístrate para sincronizar tu negocio' : 'Inicia sesión para acceder a tu información'}
                        </Text>
                    </View>
                    <View style={styles.form}>
                        {isRegister && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nombre Completo</Text>
                                    <View style={styles.inputWrapper}>
                                        <UserIcon size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Tu nombre completo"
                                            placeholderTextColor={colors.textSecondary}
                                            value={displayName}
                                            onChangeText={setDisplayName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Teléfono</Text>
                                    <View style={styles.inputWrapper}>
                                        <Smartphone size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej. 5551234567"
                                            placeholderTextColor={colors.textSecondary}
                                            value={phone}
                                            onChangeText={setPhone}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Correo Electrónico</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="correo@ejemplo.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña</Text>
                            <View style={styles.inputWrapper}>
                                <LogIn size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color={colors.textSecondary} />
                                    ) : (
                                        <Eye size={20} color={colors.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {!isRegister && (
                        <TouchableOpacity onPress={() => setForgotPasswordModalVisible(true)}>
                            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ gap: 12, width: '100%', marginTop: 24 }}>
                        <StitchButton
                            title={loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Entrar')}
                            onPress={handleAuth}
                            loading={loading}
                            style={styles.button}
                        />
                    </View>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>o continúa con</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.socialButtons}>
                        <TouchableOpacity
                            style={[styles.socialButton, { flex: 1 }]}
                            onPress={handleGoogleLogin}
                        >
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                                style={{ width: 22, height: 22 }}
                            />
                            <Text style={styles.socialButtonText}>Continuar con Google</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.switchContainer}
                        onPress={() => {
                            setIsRegister(!isRegister);
                        }}
                    >
                        <Text style={styles.switchText}>
                            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>



            <Modal
                animationType="fade"
                transparent={true}
                visible={forgotPasswordModalVisible}
                onRequestClose={() => setForgotPasswordModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, padding: 24, borderRadius: 28, width: '90%', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }]}>
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
                            onPress={() => setForgotPasswordModalVisible(false)}
                        >
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>

                        <Text style={[styles.title, { fontSize: 24, textAlign: 'left', marginTop: 10, marginBottom: 8 }]}>Recuperar Contraseña</Text>
                        <Text style={[styles.subtitle, { textAlign: 'left', marginBottom: 24 }]}>Ingresa tu correo y te enviaremos las instrucciones.</Text>

                        <View style={[styles.inputGroup, { marginBottom: 32 }]}>
                            <Text style={styles.label}>Correo Electrónico</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="correo@ejemplo.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={recoveryEmail}
                                    onChangeText={setRecoveryEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={{ gap: 12 }}>
                            <StitchButton
                                title={loading ? "Enviando..." : "Enviar Enlace"}
                                onPress={handleForgotPassword}
                                loading={loading}
                            />
                            <TouchableOpacity
                                onPress={() => setForgotPasswordModalVisible(false)}
                                style={{ paddingVertical: 12, alignItems: 'center' }}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: 32,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    themeToggle: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    logoContainer: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 56,
        color: colors.text,
        fontSize: 16,
    },
    forgotText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 24,
    },
    button: {
        marginTop: 8,
    },
    switchContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    switchText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        color: colors.textSecondary,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        height: 56,
        gap: 12,
    },
    socialButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        // defined inline for now to access colors easier
    }
});


