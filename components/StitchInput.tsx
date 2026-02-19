import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props extends TextInputProps {
    label: string;
    isDark?: boolean; // Keep for now if passed, but useTheme is main source
}

export const StitchInput: React.FC<Props> = ({
    label,
    style,
    isDark: propIsDark,
    ...props
}) => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, style]}
                placeholderTextColor={colors.textSecondary}
                {...props}
            />
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
    input: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
