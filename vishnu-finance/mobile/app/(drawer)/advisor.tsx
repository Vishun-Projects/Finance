import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useSendAdvisorMessage } from '@/src/api/hooks';
import { Send, Bot, User } from 'lucide-react-native';

interface Message { id: string; role: 'user' | 'ai'; content: string; }

export default function AdvisorScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'ai', content: 'Hi! I\'m your AI financial advisor. I have access to your transactions and spending data. What would you like to know?' }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const sendMutation = useSendAdvisorMessage();

    const send = () => {
        if (!input.trim() || sendMutation.isPending) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        const msgText = input.trim();
        setInput('');

        sendMutation.mutate(msgText, {
            onSuccess: (data) => {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'ai',
                    content: data?.response || data?.message || data?.reply || JSON.stringify(data),
                };
                setMessages(prev => [...prev, aiMsg]);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            },
            onError: () => {
                const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: 'Sorry, I had trouble connecting. Please try again.' };
                setMessages(prev => [...prev, errMsg]);
            },
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.messages}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                        {msg.role === 'ai' && (
                            <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}>
                                <Bot size={18} color={colors.tint} />
                            </View>
                        )}
                        <Card
                            style={[styles.bubble, msg.role === 'user' && { backgroundColor: colors.tint }]}
                            variant={msg.role === 'user' ? 'solid' : 'glass'}
                        >
                            <Typography
                                variant="body"
                                color={msg.role === 'user' ? '#000' : colors.text}
                                style={styles.bubbleText}
                            >
                                {msg.content}
                            </Typography>
                        </Card>
                        {msg.role === 'user' && (
                            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <User size={18} color={colors.icon} />
                            </View>
                        )}
                    </View>
                ))}
                {sendMutation.isPending && (
                    <View style={styles.msgRow}>
                        <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}>
                            <Bot size={18} color={colors.tint} />
                        </View>
                        <Card style={styles.bubble} variant="glass">
                            <ActivityIndicator color={colors.tint} size="small" />
                        </Card>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.inputRow, { backgroundColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 }]}>
                <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about your finances..."
                    placeholderTextColor={colors.icon}
                    style={[styles.textInput, { color: colors.text }]}
                    multiline
                    onSubmitEditing={send}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.tint : 'rgba(255,255,255,0.08)' }]}
                    onPress={send}
                    disabled={!input.trim()}
                >
                    <Send size={18} color={input.trim() ? '#000' : colors.icon} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    messages: { padding: 16, gap: 12, paddingBottom: 24 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    msgRowUser: { flexDirection: 'row-reverse' },
    avatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    bubble: { maxWidth: '75%', padding: 12 },
    bubbleText: { lineHeight: 22 },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    textInput: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 8 },
    sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
