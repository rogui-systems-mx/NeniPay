import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS_STORAGE_KEY = '@nenipay_products';

export const saveProductsToStorage = async (data: any) => {
    try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving products', e);
    }
};

export const getProductsFromStorage = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.error('Error reading products', e);
        return null;
    }
};
