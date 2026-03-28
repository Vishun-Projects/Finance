import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useTransactions } from '@/src/api/hooks';
import { Transaction } from '@/src/api/hooks';
import { Search, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react-native';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function TransactionsScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string | undefined>(undefined);

    const { data, isLoading } = useTransactions({ pageSize: 50, search: search || undefined, type: filter });
    const transactions: Transaction[] = data?.transactions ?? [];

    const filters = [
        { label: 'All', value: undefined },
        { label: 'Income', value: 'INCOME' },
        { label: 'Expense', value: 'EXPENSE' },
        { label: 'Transfer', value: 'TRANSFER' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                <Search size={18} color={colors.icon} />
                <TextInput
                    placeholder="Search transactions..."
                    placeholderTextColor={colors.icon}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { color: colors.text }]}
                />
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {filters.map(f => (
                    <TouchableOpacity
                        key={String(f.value)}
                        style={[styles.chip, { backgroundColor: filter === f.value ? colors.tint : 'rgba(255,255,255,0.06)' }]}
                        onPress={() => setFilter(f.value)}
                    >
                        <Typography variant="caption" color={filter === f.value ? '#000' : colors.text}>{f.label}</Typography>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Transaction List */}
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.tint} size="large" />
                    <Typography variant="caption" style={{ marginTop: 12 }}>Loading transactions…</Typography>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {transactions.length === 0 && (
                        <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.4, marginTop: 40 }}>No transactions found</Typography>
                    )}
                    {transactions.map(tx => (
                        <Card key={tx.id} style={styles.txItem} variant="glass">
                            <View style={styles.row}>
                                <View style={[styles.icon, { backgroundColor: tx.creditAmount > 0 ? 'rgba(46,204,113,0.15)' : 'rgba(255,71,87,0.15)' }]}>
                                    {tx.creditAmount > 0
                                        ? <ArrowUpRight size={18} color="#2ecc71" />
                                        : <ArrowDownLeft size={18} color="#ff4757" />
                                    }
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Typography variant="label" numberOfLines={1}>{tx.description}</Typography>
                                    <Typography variant="caption">{tx.category?.name || tx.store || tx.personName || tx.financialCategory}</Typography>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Typography variant="label" color={tx.creditAmount > 0 ? '#2ecc71' : '#ff4757'}>
                                        {tx.creditAmount > 0 ? '+' : '-'}{formatCurrency(tx.creditAmount > 0 ? tx.creditAmount : tx.debitAmount)}
                                    </Typography>
                                    <Typography variant="caption">{formatDate(tx.transactionDate)}</Typography>
                                </View>
                            </View>
                        </Card>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 16, height: 48, borderRadius: 12 },
    searchInput: { flex: 1, fontSize: 15 },
    filtersRow: { maxHeight: 48, marginBottom: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    list: { padding: 16, paddingBottom: 48 },
    txItem: { padding: 14, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
});
