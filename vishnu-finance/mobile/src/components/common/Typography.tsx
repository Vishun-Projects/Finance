import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';

interface TypographyProps {
    children: React.ReactNode;
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
    color?: string;
    style?: TextStyle;
    numberOfLines?: number;
}

export const Typography: React.FC<TypographyProps> = ({
    children,
    variant = 'body',
    color,
    style,
    numberOfLines,
}) => {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    const textStyle = [
        styles[variant],
        { color: color || colors.text },
        style,
    ];

    return <Text style={textStyle as any} numberOfLines={numberOfLines}>{children}</Text>;
};

const styles = StyleSheet.create({
    h1: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, opacity: 0.6 },
    label: { fontSize: 14, fontWeight: '500', opacity: 0.8 },
});
