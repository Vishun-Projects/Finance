import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useCreateTransaction } from '@/src/api/hooks';
import { useRouter } from 'expo-router';
import { X, Check } from 'lucide-react-native';

export default function AddTransactionModal() {
  const { theme, user } = useAuthStore();
  const colors = Colors[theme || 'dark'];
  const router = useRouter();
  const createMutation = useCreateTransaction();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!description || !amount) return;
    const parsedAmt = parseFloat(amount);
    createMutation.mutate({
      description,
      financialCategory: type,
      creditAmount: type === 'INCOME' ? parsedAmt : 0,
      debitAmount: type === 'EXPENSE' ? parsedAmt : 0,
      transactionDate: new Date().toISOString(),
      notes,
    }, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h3">New Transaction</Typography>
        <TouchableOpacity onPress={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending
            ? <ActivityIndicator color={colors.tint} size="small" />
            : <Check size={24} color={colors.tint} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Toggle */}
        <View style={styles.toggleRow}>
          {(['INCOME', 'EXPENSE'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, { backgroundColor: type === t ? (t === 'INCOME' ? '#2ecc71' : '#ff4757') : 'rgba(255,255,255,0.06)' }]}
              onPress={() => setType(t)}
            >
              <Typography variant="label" color={type === t ? '#fff' : colors.icon}>{t}</Typography>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Typography variant="label" color={colors.icon} style={styles.currency}>₹</Typography>
          <TextInput
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={amount}
            onChangeText={setAmount}
            style={[styles.amountInput, { color: type === 'INCOME' ? '#2ecc71' : '#ff4757' }]}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Fields */}
        <Card style={styles.fieldsCard} variant="glass">
          <Field label="Description" value={description} onChange={setDescription} placeholder="What was this for?" colors={colors} />
          <View style={styles.divider} />
          <Field label="Notes" value={notes} onChange={setNotes} placeholder="Optional notes" colors={colors} />
        </Card>

        {createMutation.isError && (
          <Typography variant="caption" color="#ff4757" style={{ textAlign: 'center' }}>
            Failed to save. Please try again.
          </Typography>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, colors }: any) {
  return (
    <View style={styles.fieldRow}>
      <Typography variant="caption" style={{ opacity: 0.5, width: 90 }}>{label}</Typography>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        style={[styles.fieldInput, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  content: { padding: 24, gap: 24 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  currency: { fontSize: 28 },
  amountInput: { fontSize: 64, fontWeight: '700', textAlign: 'center' },
  fieldsCard: { padding: 0 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  fieldInput: { flex: 1, fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});
