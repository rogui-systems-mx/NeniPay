import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const StitchCard: React.FC<ViewProps & { intensity?: number; variant?: 'glass' | 'solid' }> = ({ children, style, intensity = 20, variant = 'glass', ...props }) => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    if (variant === 'solid') {
        return (
            <View style={[styles.cardSolid, style]} {...props}>
                {children}
            </View>
        );
    }

    return (
        <BlurView
            intensity={intensity}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.card, style]}
            {...props}
        >
            <View style={StyleSheet.absoluteFill}>
                <View style={[styles.innerBorder]} />
            </View>
            {children}
        </BlurView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        overflow: 'hidden',
    },
    cardSolid: {
        backgroundColor: colors.cardSecondary,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    innerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        opacity: isDark ? 0.5 : 0.8,
    }
});


