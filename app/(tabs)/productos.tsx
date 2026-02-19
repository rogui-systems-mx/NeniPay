import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, Package, Plus, Search, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StitchButton } from '../../components/StitchButton';
import { StitchCard } from '../../components/StitchCard';
import { StitchInput } from '../../components/StitchInput';
import { useTheme } from '../../context/ThemeContext';
import { useProductStore } from '../../hooks/useProductStore';
import { Product } from '../../hooks/useProductStore.types';
import { uploadImage } from '../../utils/firebase';

export default function ProductosScreen() {
    const { products, loading, addProduct, updateProduct, deleteProduct } = useProductStore();
    const { colors, isDark } = useTheme();
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
        return products.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
    }, [products, searchQuery]);

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
            let remoteUrl = undefined;
            if (productImage) {
                remoteUrl = await uploadImage(productImage, 'products') || undefined;
            }

            addProduct(productName.trim(), price, stock, productDescription.trim(), undefined, remoteUrl);
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
                let remoteUrl = productImage;
                if (productImage && !productImage.startsWith('http')) {
                    remoteUrl = await uploadImage(productImage, 'products') || null;
                }

                updateProduct(selectedProduct.id, productName.trim(), price, stock, productDescription.trim(), undefined, remoteUrl || undefined);
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

    const handleDeleteProduct = (product: Product) => {
        setSelectedProduct(product);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = () => {
        if (selectedProduct) {
            deleteProduct(selectedProduct.id);
            setDeleteDialogVisible(false);
            setSelectedProduct(null);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Search color={colors.textSecondary} size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar en catálogo..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X color={colors.textSecondary} size={20} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Nuevo Producto</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X color={colors.text} size={24} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.imagePickerContainer}>
                                    <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                                        {productImage ? (
                                            <Image source={{ uri: productImage }} style={styles.pickedImage} />
                                        ) : (
                                            <View style={styles.imagePlaceholder}>
                                                <Package color={colors.textSecondary} size={40} />
                                                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Añadir Foto</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    {productImage && (
                                        <TouchableOpacity style={styles.removeImage} onPress={() => setProductImage(null)}>
                                            <X color="#fff" size={16} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <StitchInput label="Nombre" value={productName} onChangeText={setProductName} placeholder="Ej. Labial Rojo" isDark={isDark} />
                                <StitchInput label="Precio ($)" value={productPrice} onChangeText={setProductPrice} placeholder="0.00" keyboardType="numeric" isDark={isDark} />
                                <StitchInput label="Existencia (Stock)" value={productStock} onChangeText={setProductStock} placeholder="0" keyboardType="numeric" isDark={isDark} />
                                <StitchInput label="Descripción (Opcional)" value={productDescription} onChangeText={setProductDescription} placeholder="Ej. Catálogo Mayo" isDark={isDark} />
                                <StitchButton title={uploading ? "Certificando..." : "Guardar Producto"} onPress={handleAddProduct} style={{ marginTop: 10 }} loading={uploading} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Editar Producto</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}><X color={colors.text} size={24} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.imagePickerContainer}>
                                    <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                                        {productImage ? (
                                            <Image source={{ uri: productImage }} style={styles.pickedImage} />
                                        ) : (
                                            <View style={styles.imagePlaceholder}>
                                                <Package color={colors.textSecondary} size={40} />
                                                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Añadir Foto</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    {productImage && (
                                        <TouchableOpacity style={styles.removeImage} onPress={() => setProductImage(null)}>
                                            <X color="#fff" size={16} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <StitchInput label="Nombre" value={productName} onChangeText={setProductName} isDark={isDark} />
                                <StitchInput label="Precio ($)" value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" isDark={isDark} />
                                <StitchInput label="Existencia (Stock)" value={productStock} onChangeText={setProductStock} keyboardType="numeric" isDark={isDark} />
                                <StitchInput label="Descripción" value={productDescription} onChangeText={setProductDescription} isDark={isDark} />
                                <StitchButton title={uploading ? "Guardando..." : "Guardar Cambios"} onPress={handleSaveEdit} style={{ marginTop: 10 }} loading={uploading} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <ConfirmDialog
                visible={deleteDialogVisible}
                title="Eliminar Producto"
                message={`¿Estás seguro de eliminar ${selectedProduct?.name}?`}
                confirmText="Eliminar"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogVisible(false)}
            />

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No hay productos en tu catálogo</Text>
                        {!searchQuery && (
                            <TouchableOpacity style={styles.addButton} onPress={() => { setModalVisible(true); resetFields(); }}>
                                <Plus color="#fff" size={24} />
                                <Text style={styles.addButtonText}>Agregar Primer Producto</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                renderItem={({ item }) => (
                    <StitchCard style={styles.card}>
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            style={styles.avatarGradient}
                        >
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.productImage} />
                            ) : (
                                <View style={styles.avatarInner}>
                                    <Package color="#fff" size={24} />
                                </View>
                            )}
                        </LinearGradient>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            {item.description ? <Text style={styles.descriptionText}>{item.description}</Text> : null}
                            <View style={styles.priceRow}>
                                {Platform.OS === 'web' ? (
                                    <Text style={styles.price}>${item.price.toLocaleString()}</Text>
                                ) : (
                                    <View style={styles.priceContainer}>
                                        <Text style={styles.price}>${item.price.toLocaleString()}</Text>
                                    </View>
                                )}
                                <View style={[
                                    styles.stockBadge,
                                    item.stock === 0 ? styles.outOfStock : (item.stock || 0) < 5 ? styles.lowStock : null
                                ]}>
                                    <Text style={[
                                        styles.stockText,
                                        item.stock === 0 ? styles.outOfStockText : (item.stock || 0) < 5 ? styles.lowStockText : null
                                    ]}>
                                        {item.stock === 0 ? 'Sin stock' : `${item.stock} disp.`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => handleEditProduct(item)} style={styles.iconButton}>
                                <Edit2 color={colors.textSecondary} size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteProduct(item)} style={styles.iconButton}>
                                <Trash2 color={colors.danger} size={18} />
                            </TouchableOpacity>
                        </View>
                    </StitchCard>
                )}
            />

            <TouchableOpacity style={styles.fabContainer} onPress={() => { setModalVisible(true); resetFields(); }}>
                <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.fab}>
                    <Plus color="#fff" size={32} />
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 20, paddingBottom: 10 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, color: colors.text, marginLeft: 12, fontSize: 16 },
    list: { padding: 20, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16 },
    avatarGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarInner: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    info: { flex: 1 },
    name: { color: colors.text, fontSize: 16, fontWeight: '700' },
    descriptionText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    price: { color: colors.gold, fontSize: 18, fontWeight: '900' },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
    stockBadge: {
        backgroundColor: colors.card,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border
    },
    stockText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    lowStock: { backgroundColor: 'rgba(244, 123, 37, 0.1)', borderColor: '#F47B25' },
    lowStockText: { color: '#F47B25' },
    outOfStock: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
    outOfStockText: { color: '#ef4444' },
    actions: { flexDirection: 'row', gap: 12 },
    iconButton: { padding: 8 },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 16, marginBottom: 20 },
    addButton: { backgroundColor: colors.primary, flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center' },
    addButtonText: { color: '#fff', marginLeft: 10, fontWeight: '700' },
    fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', width: 72, height: 72, borderRadius: 36, elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
    fab: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    imagePicker: {
        width: 120,
        height: 120,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    pickedImage: {
        width: '100%',
        height: '100%',
    },
    removeImage: {
        position: 'absolute',
        top: -10,
        right: '25%',
        backgroundColor: colors.danger,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
});
