import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'glass';
    loading?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    style?: ViewStyle | ViewStyle[];
    icon?: React.ReactNode;
}

export const StitchButton: React.FC<Props> = ({ title, variant = 'primary', style, loading, disabled, onPress, icon }) => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    const buttonStyle: ViewStyle[] = [styles.button];
    const textStyle: TextStyle[] = [styles.text];

    if (variant === 'outline') {
        buttonStyle.push(styles.outline);
        textStyle.push(styles.outlineText);
    }
    if (variant === 'glass') {
        buttonStyle.push(styles.glass);
        textStyle.push(styles.glassText);
    }
    if (disabled || loading) buttonStyle.push(styles.disabled);

    const renderContent = () => (
        <>
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'glass' ? colors.primary : '#fff'} />
            ) : (
                <>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[...textStyle]}>{title}</Text>
                </>
            )}
        </>
    );

    if (variant === 'primary' || variant === 'secondary') {
        const gradient = variant === 'primary' ? colors.gradientPrimary : colors.gradientSecondary;
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[...buttonStyle, ...(Array.isArray(style) ? style : style ? [style] : [])]}
            >
                <LinearGradient
                    colors={gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {renderContent()}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[...buttonStyle, ...(Array.isArray(style) ? style : style ? [style] : [])]}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    button: {
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    iconContainer: {
        marginRight: 4,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary + '30',
        shadowOpacity: 0,
        elevation: 0,
    },
    glass: {
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    outlineText: {
        color: colors.primary,
    },
    glassText: {
        color: colors.text,
    },
    disabled: {
        opacity: 0.5,
    },
});
