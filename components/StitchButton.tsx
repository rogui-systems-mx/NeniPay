import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    style?: ViewStyle | ViewStyle[];
    icon?: React.ReactNode;
}

export const StitchButton: React.FC<Props> = ({ title, variant = 'primary', style, loading, disabled, onPress, icon }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const buttonStyle: ViewStyle[] = [styles.button];
    const textStyle: TextStyle[] = [styles.text];

    if (variant === 'primary') buttonStyle.push(styles.primary);
    if (variant === 'secondary') buttonStyle.push(styles.secondary);
    if (variant === 'outline') {
        buttonStyle.push(styles.outline);
        textStyle.push(styles.outlineText);
    }
    if (disabled || loading) buttonStyle.push(styles.disabled);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[...buttonStyle, ...(Array.isArray(style) ? style : style ? [style] : [])]}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
            ) : (
                <>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={textStyle}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    button: {
        borderRadius: 100,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    iconContainer: {
        marginRight: 4,
    },
    primary: {
        backgroundColor: colors.primary || '#3B82F6',
    },
    secondary: {
        backgroundColor: colors.secondary || '#8B5CF6',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    outlineText: {
        color: colors.textSecondary,
    },
    disabled: {
        opacity: 0.5,
    },
});
