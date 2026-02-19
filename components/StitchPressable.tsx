import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface Props extends PressableProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[] | ((state: any) => ViewStyle | ViewStyle[]);
    scaleTo?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const StitchPressable: React.FC<Props> = ({ children, style, scaleTo = 0.96, onPress, ...props }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = (e: any) => {
        scale.value = withSpring(scaleTo, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(0.95, { duration: 100 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (props.onPressIn) props.onPressIn(e);
    };

    const handlePressOut = (e: any) => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 100 });
        if (props.onPressOut) props.onPressOut(e);
    };

    return (
        <AnimatedPressable
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={(state) => {
                const baseStyle = typeof style === 'function' ? style(state) : style;
                const flattenedStyle = StyleSheet.flatten(baseStyle);
                return [flattenedStyle, animatedStyle] as any;
            }}
        >
            {children}
        </AnimatedPressable>
    );
};
