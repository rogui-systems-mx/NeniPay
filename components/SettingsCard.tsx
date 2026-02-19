import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { StitchCard } from './StitchCard';

interface SettingsCardProps {
    title: string;
    description?: string;
    icon: LucideIcon;
    onPress?: () => void;
    variant?: 'default' | 'danger';
    danger?: boolean;
    rightText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SettingsCard({ title, description, icon: Icon, onPress, variant = 'default', danger, rightText }: SettingsCardProps) {
    const { colors, isDark } = useTheme();
    const isDanger = variant === 'danger' || danger;
    const styles = getStyles(colors);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        if (!onPress) return;
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        if (!onPress) return;
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!onPress}
            style={animatedStyle}
        >
            <StitchCard style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: isDanger ? 'rgba(239, 44, 44, 0.1)' : (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') }]}>
                    <Icon color={isDanger ? colors.danger : colors.primary} size={20} />
                </View>
                <View style={styles.content}>
                    <Text style={[styles.title, isDanger && { color: colors.danger }]}>{title}</Text>
                    {description && <Text style={styles.description}>{description}</Text>}
                </View>
                {rightText && <Text style={styles.rightText}>{rightText}</Text>}
            </StitchCard>
        </AnimatedPressable>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    title: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    description: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    rightText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});
