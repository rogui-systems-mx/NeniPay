import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StitchPressable } from './StitchPressable';
import { useTheme } from '../context/ThemeContext';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    color?: string;
}

export const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onPress, color }) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <StitchPressable
                onPress={onPress}
                style={[
                    styles.button,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: color ? color + '40' : colors.glassBorder
                    }
                ]}
            >
                {icon}
            </StitchPressable>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 8,
    },
    button: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Manrope_700Bold',
        textAlign: 'center',
    }
});
