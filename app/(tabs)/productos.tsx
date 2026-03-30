import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Edit2, Package, Plus, Search, Trash2, X,
    ArrowUpRight, ShoppingBag, LayoutGrid, Info, Camera, FileText, Share2
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Alert, FlatList, Image, KeyboardAvoidingView,
    Modal, Platform, SafeAreaView, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StitchButton } from '../../components/StitchButton';
import { StitchCard } from '../../components/StitchCard';
import { StitchInput } from '../../components/StitchInput';
import { StitchPressable } from '../../components/StitchPressable';
import { useTheme } from '../../context/ThemeContext';
import { useProductStore } from '../../hooks/useProductStore';
import { Product } from '../../hooks/useProductStore.types';
import { uploadImage } from '../../utils/firebase';
import { generateCatalogPDF } from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';

export default function ProductosScreen() {
    const { products, loading, addProduct, updateProduct, deleteProduct } = useProductStore();
    const { colors, isDark } = useTheme();
    const { businessName } = useAuth();
    const styles = getStyles(colors, isDark);

    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [productName, setProductName] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productStock, setProductStock] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productImage, setProductImage] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [uploading, setUploading] = useState(false);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    const handleShareCatalog = async () => {
        if (products.length === 0) {
            return Alert.alert('Catálogo Vacío', 'Agrega productos antes de compartir el catálogo.');
        }
        
        try {
            await generateCatalogPDF(products, businessName || 'Mi Negocio');
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar el catálogo en PDF.');
        }
    };

    if (loading) return null;

    const resetFields = () => {
        setProductName('');
        setProductPrice('');
        setProductStock('');
        setProductDescription('');
        setProductImage(null);
        setSelectedProduct(null);
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
            });

            if (!result.canceled && result.assets[0].uri) {
                setProductImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const handleAddProduct = async () => {
        const price = parseFloat(productPrice.replace(',', '.'));
        const stockInput = productStock.trim();
        const stock = stockInput === '' ? 0 : parseInt(stockInput.replace(',', '.'));

        if (!productName.trim()) return Alert.alert('Error', 'Ingresa un nombre');
        if (isNaN(price) || price < 0) return Alert.alert('Error', 'Ingresa un precio válido');
        if (isNaN(stock)) return Alert.alert('Error', 'Ingresa una existencia válida');

        setUploading(true);
        try {
            let finalImage = productImage;
            if (productImage && !productImage.startsWith('http')) {
                const uploadedUrl = await uploadImage(productImage, 'products');
                if (uploadedUrl) finalImage = uploadedUrl;
            }

            addProduct(productName.trim(), price, stock, productDescription.trim(), undefined, finalImage || undefined);
            setModalVisible(false);
            resetFields();
        } catch (error) {
            console.error('Error adding product:', error);
            Alert.alert('Error', 'No se pudo agregar el producto');
        } finally {
            setUploading(false);
        }
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setProductName(product.name);
        setProductPrice(product.price.toString());
        setProductStock(product.stock?.toString() || '0');
        setProductDescription(product.description || '');
        setProductImage(product.image || null);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        const price = parseFloat(productPrice.replace(',', '.'));
        const stockInput = productStock.trim();
        const stock = stockInput === '' ? 0 : parseInt(stockInput.replace(',', '.'));

        if (!productName.trim()) return Alert.alert('Error', 'Ingresa un nombre');
        if (isNaN(price) || price < 0) return Alert.alert('Error', 'Ingresa un precio válido');
        if (isNaN(stock)) return Alert.alert('Error', 'Ingresa una existencia válida');

        if (selectedProduct) {
            setUploading(true);
            try {
                let finalImage = productImage;
                if (productImage && !productImage.startsWith('http')) {
                    const uploadedUrl = await uploadImage(productImage, 'products');
                    if (uploadedUrl) finalImage = uploadedUrl;
                }

                updateProduct(selectedProduct.id, productName.trim(), price, stock, productDescription.trim(), undefined, finalImage || undefined);
                setEditModalVisible(false);
                resetFields();
            } catch (error) {
                console.error('Error updating product:', error);
                Alert.alert('Error', 'No se pudo actualizar el producto');
            } finally {
                setUploading(false);
            }
        }
    };

    const confirmDelete = () => {
        if (selectedProduct) {
            deleteProduct(selectedProduct.id);
            setDeleteDialogVisible(false);
            setSelectedProduct(null);
        }
    };

    const renderEmpty = () => (
        <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
                <ShoppingBag color={colors.primary} size={48} />
            </View>
            <Text style={styles.emptyText}>Catálogo Vacío</Text>
            <Text style={styles.emptySubtext}>Aún no has agregado productos a tu inventario.</Text>
            <StitchButton
                title="Agregar Producto"
                onPress={() => { setModalVisible(true); resetFields(); }}
                variant="primary"
                style={{ marginTop: 24, paddingHorizontal: 40 }}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlowWrapper} pointerEvents="none">
                <View style={[styles.glowSphere, { top: '5%', right: '-25%', backgroundColor: colors.bgGlow1 }]} />
                <View style={[styles.glowSphere, { bottom: '15%', left: '-25%', backgroundColor: colors.bgGlow2 }]} />
            </View>

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Catálogo</Text>
                        <Text style={styles.subtitle}>{products.length} PRODUCTOS REGISTRADOS</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <StitchPressable
                            onPress={handleShareCatalog}
                            style={styles.headerActionBtn}
                        >
                            <Share2 color={colors.primary} size={24} />
                        </StitchPressable>
                        <StitchPressable
                            onPress={() => { setModalVisible(true); resetFields(); }}
                            style={styles.headerActionBtn}
                        >
                            <Plus color={colors.primary} size={28} />
                        </StitchPressable>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <StitchCard intensity={30} style={styles.searchWrapper}>
                        <Search color={colors.textSecondary} size={20} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por nombre o descripción..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X color={colors.textSecondary} size={20} />
                            </TouchableOpacity>
                        )}
                    </StitchCard>
                </View>
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                renderItem={({ item }) => (
                    <StitchCard style={styles.productCard} intensity={25}>
                        <View style={styles.productTop}>
                            <View style={styles.imageWrapper}>
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={styles.productImg} />
                                ) : (
                                    <View style={[styles.imagePlaceholderBase, { backgroundColor: colors.primary + '15' }]}>
                                        <Package color={colors.primary} size={24} />
                                    </View>
                                )}
                            </View>

                            <View style={styles.productMainInfo}>
                                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.productPrice}>${item.price.toLocaleString()}</Text>
                            </View>

                            <View style={styles.stockInfo}>
                                <View style={[
                                    styles.stockBadge,
                                    item.stock === 0 ? styles.stockZero : (item.stock || 0) < 5 ? styles.stockLow : null
                                ]}>
                                    <Text style={[
                                        styles.stockText,
                                        item.stock === 0 ? styles.stockZeroText : (item.stock || 0) < 5 ? styles.stockLowText : null
                                    ]}>
                                        {item.stock === 0 ? 'Sin stock' : `${item.stock}`}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.productActions}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.actionIconButton}
                                onPress={() => handleEditProduct(item)}
                            >
                                <View style={[StyleSheet.absoluteFill, styles.btnGlassBase]} />
                                <View style={[StyleSheet.absoluteFill, { 
                                    borderWidth: 1.5, 
                                    borderColor: colors.text + '40', 
                                    borderRadius: 16,
                                }]} />
                                <View style={styles.btnContentInner}>
                                    <Edit2 color={colors.text} size={18} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>EDITAR</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.actionIconButton}
                                onPress={() => { setSelectedProduct(item); setDeleteDialogVisible(true); }}
                            >
                                <View style={[StyleSheet.absoluteFill, styles.btnGlassBase]} />
                                <View style={[StyleSheet.absoluteFill, { 
                                    borderWidth: 1.5, 
                                    borderColor: colors.danger + '40', 
                                    borderRadius: 16,
                                }]} />
                                <View style={styles.btnContentInner}>
                                    <Trash2 color={colors.danger} size={18} />
                                    <Text style={[styles.actionText, { color: colors.danger }]}>ELIMINAR</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </StitchCard>
                )}
            />

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <StitchCard intensity={80} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Nuevo Producto</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X color={colors.text} size={24} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <TouchableOpacity style={styles.modalImagePicker} onPress={handlePickImage}>
                                    {productImage ? (
                                        <Image source={{ uri: productImage }} style={styles.modalPickedImg} />
                                    ) : (
                                        <View style={styles.modalImagePlaceholder}>
                                            <Camera color={colors.primary} size={32} />
                                            <Text style={styles.modalImageText}>Añadir Foto</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <StitchInput label="NOMBRE" value={productName} onChangeText={setProductName} placeholder="Ej. Labial Rojo" isDark={isDark} />
                                <View style={styles.modalRow}>
                                    <View style={{ flex: 1 }}><StitchInput label="PRECIO ($)" value={productPrice} onChangeText={setProductPrice} placeholder="0.00" keyboardType="numeric" isDark={isDark} /></View>
                                    <View style={{ width: 12 }} />
                                    <View style={{ flex: 1 }}><StitchInput label="STOCK" value={productStock} onChangeText={setProductStock} placeholder="0" keyboardType="numeric" isDark={isDark} /></View>
                                </View>
                                <StitchInput label="DESCRIPCIÓN" value={productDescription} onChangeText={setProductDescription} placeholder="Ej. Catálogo Mayo" isDark={isDark} multiline />

                                <StitchButton
                                    title={uploading ? "PROCESANDO..." : "GUARDAR PRODUCTO"}
                                    onPress={handleAddProduct}
                                    loading={uploading}
                                    style={{ marginTop: 20 }}
                                />
                            </ScrollView>
                        </StitchCard>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <StitchCard intensity={80} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Editar Producto</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}><X color={colors.text} size={24} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <TouchableOpacity style={styles.modalImagePicker} onPress={handlePickImage}>
                                    {productImage ? (
                                        <Image source={{ uri: productImage }} style={styles.modalPickedImg} />
                                    ) : (
                                        <View style={styles.modalImagePlaceholder}>
                                            <Camera color={colors.primary} size={32} />
                                            <Text style={styles.modalImageText}>Cambiar Foto</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <StitchInput label="NOMBRE" value={productName} onChangeText={setProductName} isDark={isDark} />
                                <View style={styles.modalRow}>
                                    <View style={{ flex: 1 }}><StitchInput label="PRECIO ($)" value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" isDark={isDark} /></View>
                                    <View style={{ width: 12 }} />
                                    <View style={{ flex: 1 }}><StitchInput label="STOCK" value={productStock} onChangeText={setProductStock} keyboardType="numeric" isDark={isDark} /></View>
                                </View>
                                <StitchInput label="DESCRIPCIÓN" value={productDescription} onChangeText={setProductDescription} isDark={isDark} multiline />

                                <StitchButton
                                    title={uploading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                                    onPress={handleSaveEdit}
                                    loading={uploading}
                                    style={{ marginTop: 20 }}
                                />
                            </ScrollView>
                        </StitchCard>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <ConfirmDialog
                visible={deleteDialogVisible}
                title="Eliminar Producto"
                message={`¿Estás seguro de eliminar "${selectedProduct?.name}"?`}
                confirmText="ELIMINAR"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogVisible(false)}
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
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    productCard: {
        borderRadius: 28,
        marginBottom: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    productTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    imageWrapper: {
        width: 70,
        height: 70,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    productImg: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholderBase: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productMainInfo: {
        flex: 1,
        marginLeft: 16,
    },
    productName: {
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 20,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.primary,
    },
    stockInfo: {
        alignItems: 'flex-end',
    },
    stockBadge: {
        backgroundColor: colors.glass,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        minWidth: 40,
        alignItems: 'center',
    },
    stockText: {
        fontSize: 12,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.textSecondary,
    },
    stockLow: { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' },
    stockLowText: { color: colors.warning },
    stockZero: { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' },
    stockZeroText: { color: colors.danger },
    btnGlassBase: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    productActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.glassBorder,
        paddingTop: 16,
        gap: 12,
    },
    actionIconButton: {
        flex: 1,
        height: 48,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    btnContentInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 1,
        height: 48,
        paddingHorizontal: 12,
    },
    actionText: {
        fontSize: 10,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    empty: {
        paddingVertical: 80,
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 24,
        fontFamily: 'Manrope_800ExtraBold',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        fontFamily: 'Manrope_500Medium',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.98)',
        borderRadius: 36,
        padding: 24,
        maxHeight: '90%',
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
    modalImagePicker: {
        width: '100%',
        height: 180,
        borderRadius: 24,
        backgroundColor: colors.glass,
        borderWidth: 1.5,
        borderColor: colors.glassBorder,
        borderStyle: 'dashed',
        marginBottom: 24,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalImagePlaceholder: {
        alignItems: 'center',
        gap: 10,
    },
    modalImageText: {
        fontSize: 14,
        fontFamily: 'Manrope_700Bold',
        color: colors.primary,
    },
    modalPickedImg: {
        width: '100%',
        height: '100%',
    },
    modalRow: {
        flexDirection: 'row',
    },
});
