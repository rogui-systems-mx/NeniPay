import * as Contacts from 'expo-contacts';
import { ChevronDown, Contact, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CountryCode {
    code: string;
    dial_code: string;
    flag: string;
    name: string;
}

const COMMON_CODES: CountryCode[] = [
    { code: 'MX', dial_code: '+52', flag: '🇲🇽', name: 'México' },
    { code: 'US', dial_code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: 'CO', dial_code: '+57', flag: '🇨🇴', name: 'Colombia' },
    { code: 'ES', dial_code: '+34', flag: '🇪🇸', name: 'España' },
    { code: 'AR', dial_code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: 'PE', dial_code: '+51', flag: '🇵🇪', name: 'Perú' },
    { code: 'CL', dial_code: '+56', flag: '🇨🇱', name: 'Chile' },
    { code: 'EC', dial_code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: 'GT', dial_code: '+502', flag: '🇬🇹', name: 'Guatemala' },
    { code: 'CU', dial_code: '+53', flag: '🇨🇺', name: 'Cuba' },
    { code: 'BO', dial_code: '+591', flag: '🇧🇴', name: 'Bolivia' },
    { code: 'DO', dial_code: '+1', flag: '🇩🇴', name: 'República Dominicana' },
    { code: 'HN', dial_code: '+504', flag: '🇭🇳', name: 'Honduras' },
    { code: 'PY', dial_code: '+595', flag: '🇵🇾', name: 'Paraguay' },
    { code: 'SV', dial_code: '+503', flag: '🇸🇻', name: 'El Salvador' },
    { code: 'NI', dial_code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
    { code: 'CR', dial_code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
    { code: 'PA', dial_code: '+507', flag: '🇵🇦', name: 'Panamá' },
    { code: 'UY', dial_code: '+598', flag: '🇺🇾', name: 'Uruguay' },
    { code: 'VE', dial_code: '+58', flag: '🇻🇪', name: 'Venezuela' },
];

interface Props {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    isDark?: boolean;
}

export const StitchPhoneInput: React.FC<Props> = ({
    label,
    value,
    onChangeText,
    placeholder = '1234567890',
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    // Split initial value if it contains a known dial code
    const [selectedCode, setSelectedCode] = useState(COMMON_CODES[0]); // Default to MX
    const [localNumber, setLocalNumber] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Try to parse existing value
        if (value) {
            const foundCode = COMMON_CODES.find(c => value.startsWith(c.dial_code));
            if (foundCode) {
                setSelectedCode(foundCode);
                // Only update local number if it's different to avoid loops, remove code from start
                const numberPart = value.substring(foundCode.dial_code.length);
                if (numberPart !== localNumber) {
                    setLocalNumber(numberPart);
                }
            } else {
                // If no code found but value exists, assume it's just the number and keep default code (or previous)
                // But if the value is empty, clear local.
                if (value !== (selectedCode.dial_code + localNumber)) {
                    setLocalNumber(value); // Fallback
                }
            }
        } else {
            setLocalNumber('');
        }
    }, []); // Run once on mount to parse initial value

    // Handle internal text change
    const handleNumberChange = (text: string) => {
        setLocalNumber(text);
        onChangeText(`${selectedCode.dial_code}${text}`);
    };

    const handleCodeSelect = (country: CountryCode) => {
        setSelectedCode(country);
        setModalVisible(false);
        onChangeText(`${country.dial_code}${localNumber}`);
    };

    const handlePickContact = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            try {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                });

                if (data.length > 0) {
                    // Use presentContactPickerAsync for native contact picking
                    const contact = await Contacts.presentContactPickerAsync();
                    if (contact && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                        let phone = contact.phoneNumbers[0].number || '';
                        // Clean phone logic
                        phone = phone.replace(/[^\d+]/g, ''); // keep + for parsing

                        // Determine code
                        const foundCode = COMMON_CODES.find(c => phone.startsWith(c.dial_code));
                        if (foundCode) {
                            setSelectedCode(foundCode);
                            const numberPart = phone.substring(foundCode.dial_code.length);
                            setLocalNumber(numberPart);
                            onChangeText(`${foundCode.dial_code}${numberPart}`);
                        } else {
                            // Assume local number if no code found (e.g. 555...)
                            // Strip any leading 0s or formatting?
                            setLocalNumber(phone);
                            onChangeText(`${selectedCode.dial_code}${phone}`);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
                Alert.alert('Error', 'No se pudo acceder a los contactos');
            }
        } else {
            Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a los contactos');
        }
    };

    const filteredCodes = COMMON_CODES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dial_code.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity onPress={handlePickContact} style={styles.contactButton}>
                    <Contact size={16} color={colors.primary} />
                    <Text style={styles.contactButtonText}>Buscar Contacto</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={styles.codeSelector}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.flag}>{selectedCode.flag}</Text>
                    <Text style={styles.dialCode}>{selectedCode.dial_code}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={localNumber}
                    onChangeText={handleNumberChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                />
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar País</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Search color={colors.textSecondary} size={20} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar país..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <FlatList
                            data={filteredCodes}
                            keyExtractor={item => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryItem}
                                    onPress={() => handleCodeSelect(item)}
                                >
                                    <Text style={styles.itemFlag}>{item.flag}</Text>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemCode}>{item.dial_code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    label: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    contactButtonText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    codeSelector: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 100,
        justifyContent: 'space-between',
    },
    flag: {
        fontSize: 20,
        marginRight: 4,
    },
    dialCode: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginRight: 4,
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        height: '70%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        marginLeft: 10,
        fontSize: 16,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemFlag: {
        fontSize: 24,
        marginRight: 16,
    },
    itemName: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
    },
    itemCode: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
});
