import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { StitchPressable } from './StitchPressable';
import { useTheme } from '../context/ThemeContext';

interface Props {
    title: string;
    onPress: () => void;
    colors?: string[];
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export const EliteButton: React.FC<Props> = ({ title, onPress, colors: customColors, icon, style }) => {
    const { colors: themeColors } = useTheme();

    const defaultColors = [themeColors.primary, themeColors.secondary];
    const finalColors = customColors || defaultColors;

    return (
        <StitchPressable onPress={onPress} style={[styles.pressable, style] as any} scaleTo={0.95}>
            <LinearGradient
                colors={finalColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.gradient}
            >
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
                <Text style={styles.text}>{title}</Text>
            </LinearGradient>
        </StitchPressable>
    );
};

const styles = StyleSheet.create({
    pressable: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        minHeight: 48,
    },
    iconWrapper: {
        marginRight: 8,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
