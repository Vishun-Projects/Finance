import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useLogin } from '@/src/api/hooks';
import { Mail, Lock, Zap } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const loginMutation = useLogin();
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    const handleLogin = () => {
        if (!email || !password) return;
        loginMutation.mutate({ email, password });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Logo / Brand */}
                <View style={styles.brandSection}>
                    <View style={[styles.logoCircle, { backgroundColor: colors.tint }]}>
                        <Zap size={32} color="#000" fill="#000" />
                    </View>
                    <Typography variant="h1" style={styles.brandName}>Vishnu Finance</Typography>
                    <Typography variant="caption" style={{ opacity: 0.5 }}>
                        Your personal financial command center
                    </Typography>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={[styles.inputContainer, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                        <Mail size={18} color={colors.icon} />
                        <TextInput
                            placeholder="Email address"
                            placeholderTextColor={colors.icon}
                            value={email}
                            onChangeText={setEmail}
                            style={[styles.input, { color: colors.text }]}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={[styles.inputContainer, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                        <Lock size={18} color={colors.icon} />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor={colors.icon}
                            value={password}
                            onChangeText={setPassword}
                            style={[styles.input, { color: colors.text }]}
                            secureTextEntry
                        />
                    </View>

                    {loginMutation.isError && (
                        <Typography variant="caption" color="#ff4757" style={{ textAlign: 'center' }}>
                            {(loginMutation.error as any)?.response?.data?.error || 'Invalid credentials'}
                        </Typography>
                    )}

                    <TouchableOpacity
                        style={[styles.loginBtn, { backgroundColor: colors.tint, opacity: loginMutation.isPending ? 0.7 : 1 }]}
                        onPress={handleLogin}
                        disabled={loginMutation.isPending}
                    >
                        {loginMutation.isPending ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Typography variant="label" color="#000">Sign In</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.3, marginTop: 32 }}>
                    Secured by your Vercel backend
                </Typography>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, padding: 24, justifyContent: 'center' },
    brandSection: { alignItems: 'center', marginBottom: 48 },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    brandName: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
    form: { gap: 16 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 56,
        gap: 12,
    },
    input: { flex: 1, fontSize: 16 },
    loginBtn: {
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
});
