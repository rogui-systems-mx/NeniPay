import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface Props {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    variant: 'sale' | 'payment';
    onPress?: () => void;
    style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ActionCard: React.FC<Props> = ({ title, subtitle, icon: Icon, variant, style, onPress, ...props }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
        opacity.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 100 });
    };

    const isSale = variant === 'sale';
    const primaryColor = colors.primary || '#3B82F6';
    const secondaryColor = colors.gold || '#FFB800';
    const gradientColors = (isSale ? [primaryColor, primaryColor + 'CC'] : [secondaryColor, secondaryColor + 'CC']) as [string, string, ...string[]];

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={[styles.container, animatedStyle, style]}
            {...props}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.iconContainer}>
                    <Icon size={24} color="#fff" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>
            </LinearGradient>
        </AnimatedPressable>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 0.48,
        height: 140,
        borderRadius: 32,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    textContainer: {},
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
    },
});
