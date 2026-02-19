import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const StitchCard: React.FC<ViewProps> = ({ children, style, ...props }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={[styles.card, style]} {...props}>
            {children}
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // Softened shadow offset
        shadowOpacity: 0.03, // Softened shadow opacity
        shadowRadius: 6, // Softened shadow radius
        elevation: 2, // Softened elevation
        borderWidth: 1,
        borderColor: colors.border,
    },
});
