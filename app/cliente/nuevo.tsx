import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, UserPlus, MapPin, Phone, Camera, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { 
    KeyboardAvoidingView, Platform, SafeAreaView, 
    ScrollView, StyleSheet, Text, View, Image, 
    Alert, TouchableOpacity 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StitchButton } from '../../components/StitchButton';
import { StitchInput } from '../../components/StitchInput';
import { StitchPhoneInput } from '../../components/StitchPhoneInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useNeniStore } from '../../hooks/useNeniStore';
import { uploadImage } from '../../utils/firebase';

export default function NuevoClienteScreen() {
    const { addClient } = useNeniStore();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors, isDark);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
            });

            if (!result.canceled && result.assets[0].uri) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Ingresa un nombre');
        
        setUploading(true);
        try {
            let finalImage = image;
            if (image && !image.startsWith('http')) {
                const uploadedUrl = await uploadImage(image, 'avatars');
                if (uploadedUrl) finalImage = uploadedUrl;
            }

            const newId = addClient(
                name.trim(), 
                phone.trim() || undefined, 
                location.trim() || undefined,
                finalImage || undefined
            );
            router.replace(`/cliente/${newId}`);
        } catch (error) {
            console.error('Error adding client:', error);
            Alert.alert('Error', 'No se pudo guardar el cliente');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <StitchPressable onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color={colors.text} size={28} />
                    </StitchPressable>
                    <Text style={styles.title}>Nuevo Cliente</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.imagePickerWrapper}>
                        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.pickedImg} />
                            ) : (
                                <LinearGradient
                                    colors={[colors.primary + '20', colors.secondary + '10'] as any}
                                    style={styles.imagePlaceholder}
                                >
                                    <Camera color={colors.primary} size={40} />
                                    <Text style={styles.imageText}>Añadir Foto</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                        <View style={styles.addBadge}>
                            <Plus color="#fff" size={16} />
                        </View>
                    </View>

                    <View style={styles.form}>
                        <StitchInput
                            label="NOMBRE COMPLETO"
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej. Juan Pérez"
                            autoFocus
                        />

                        <StitchPhoneInput
                            label="TELÉFONO (WHATSAPP)"
                            value={phone}
                            onChangeText={setPhone}
                        />

                        <StitchInput
                            label="UBICACIÓN / REFERENCIA"
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Ej. Sindicato, Local 5"
                        />

                        <StitchButton
                            title={uploading ? "CREANDO..." : "Crear Cliente"}
                            onPress={handleSave}
                            variant="primary"
                            loading={uploading}
                            style={{ marginTop: 20 }}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 52 : 12,
        paddingBottom: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        marginRight: 12,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
    },
    scrollContent: {
        padding: 24,
    },
    imagePickerWrapper: {
        alignSelf: 'center',
        position: 'relative',
        marginBottom: 40,
        marginTop: 10,
    },
    imagePicker: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.glass,
        borderWidth: 1.5,
        borderColor: colors.glassBorder,
        borderStyle: 'dashed',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    imageText: {
        fontSize: 10,
        fontFamily: 'Manrope_700Bold',
        color: colors.primary,
    },
    pickedImg: {
        width: '100%',
        height: '100%',
    },
    addBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10,
    },
    form: {
        gap: 20,
    },
});
