import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nenipay_data';

export const saveToStorage = async (data: any) => {
    try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving data', e);
    }
};

export const getFromStorage = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.error('Error reading data', e);
        return null;
    }
};
