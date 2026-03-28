import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    style,
    textStyle,
}) => {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    const containerStyle = [
        styles.base,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
    ];

    const labelStyle = [
        styles.textBase,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        textStyle,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={containerStyle as any}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.tint : '#fff'} />
            ) : (
                <Text style={labelStyle as any}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: '#7beded', // We could use Colors.dark.tint
    },
    secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    },
    // Sizes
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 24 },
    lg: { paddingVertical: 16, paddingHorizontal: 32 },
    // Text
    textBase: {
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryText: { color: '#000' },
    secondaryText: { color: '#fff' },
    outlineText: { color: '#fff' },
    ghostText: { color: '#fff' },
    smText: { fontSize: 14 },
    mdText: { fontSize: 16 },
    lgText: { fontSize: 18 },
});
