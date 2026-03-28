import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'glass' | 'solid';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'glass' }) => {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[
            styles.base,
            variant === 'glass' ? styles.glass : styles.solid,
            { borderColor: colors.border },
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    solid: {
        backgroundColor: '#1c1c1e',
    },
});
