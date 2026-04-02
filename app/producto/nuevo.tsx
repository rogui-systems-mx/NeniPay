import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Package, DollarSign, List, Camera, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { 
    KeyboardAvoidingView, Platform, SafeAreaView, 
    ScrollView, StyleSheet, Text, View, Image, 
    Alert, TouchableOpacity 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StitchButton } from '../../components/StitchButton';
import { StitchInput } from '../../components/StitchInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useProductStore } from '../../hooks/useProductStore';
import { uploadImage } from '../../utils/firebase';

export default function NuevoProductoScreen() {
    const { addProduct } = useProductStore();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const styles = getStyles(colors, isDark);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    
    const handlePriceChange = (text: string) => {
        if (/^\d*[.,]?\d{0,2}$/.test(text) || text === '') {
            setPrice(text);
        }
    };

    const handleStockChange = (text: string) => {
        // Stock is usually whole numbers, but some neni might use weight. 
        // Allowing 2 decimals to be safe as per user global request.
        if (/^\d*[.,]?\d{0,2}$/.test(text) || text === '') {
            setStock(text);
        }
    };
    const [description, setDescription] = useState('');
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
        const numPrice = parseFloat(price.replace(',', '.'));
        const numStock = stock.trim() === '' ? 0 : parseInt(stock.replace(',', '.'));

        if (!name.trim()) return Alert.alert('Error', 'Ingresa un nombre');
        if (isNaN(numPrice) || numPrice < 0) return Alert.alert('Error', 'Ingresa un precio válido');
        if (isNaN(numStock)) return Alert.alert('Error', 'Ingresa una existencia válida');

        setUploading(true);
        try {
            let remoteUrl = undefined;
            if (image) {
                remoteUrl = await uploadImage(image, 'products') || undefined;
            }

            addProduct(name.trim(), numPrice, numStock, description.trim(), undefined, remoteUrl);
            router.replace('/(tabs)/productos');
        } catch (error) {
            console.error('Error adding product:', error);
            Alert.alert('Error', 'No se pudo guardar el producto');
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
                    <Text style={styles.title}>Nuevo Producto</Text>
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
                            label="NOMBRE DEL PRODUCTO"
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej. Labial Mate"
                            isDark={isDark}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <StitchInput
                                    label="PRECIO ($)"
                                    value={price}
                                    onChangeText={handlePriceChange}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    isDark={isDark}
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <StitchInput
                                    label="STOCK INICIAL"
                                    value={stock}
                                    onChangeText={handleStockChange}
                                    placeholder="0"
                                    keyboardType="decimal-pad"
                                    isDark={isDark}
                                />
                            </View>
                        </View>

                        <StitchInput
                            label="DESCRIPCIÓN (OPCIONAL)"
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Ej. Colección Verano 2024"
                            isDark={isDark}
                            multiline
                        />

                        <StitchButton
                            title={uploading ? "CREANDO..." : "Guardar Producto"}
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
        width: '100%',
        height: 200,
        position: 'relative',
        marginBottom: 32,
    },
    imagePicker: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
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
        gap: 12,
    },
    imageText: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.primary,
    },
    pickedImg: {
        width: '100%',
        height: '100%',
    },
    addBadge: {
        position: 'absolute',
        bottom: -10,
        right: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        zIndex: 10,
    },
    form: {
        gap: 20,
    },
    row: {
        flexDirection: 'row',
    },
});
