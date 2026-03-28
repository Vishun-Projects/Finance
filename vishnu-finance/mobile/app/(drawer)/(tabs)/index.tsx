import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useDashboard, useTransactions } from '@/src/api/hooks';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

function formatCurrency(amount: number | undefined | null) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function DashboardScreen() {
  const { theme, user } = useAuthStore();
  const colors = Colors[theme || 'dark'];
  const router = useRouter();

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useDashboard();
  const { data: txData, isLoading: txLoading } = useTransactions({ pageSize: 5 });

  const recentTx = txData?.transactions ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Typography variant="caption">Good day, {user?.name?.split(' ')[0] || 'there'} 👋</Typography>
            <Typography variant="h2">Portfolio Overview</Typography>
          </View>
          <TouchableOpacity onPress={() => refetchDash()}>
            <RefreshCw size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        {dashLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.tint} />
            <Typography variant="caption" style={{ marginTop: 12 }}>Loading portfolio…</Typography>
          </View>
        ) : (
          <Card style={styles.balanceCard} variant="solid">
            <Typography variant="label" color="rgba(255,255,255,0.6)">Total Balance</Typography>
            <Typography variant="h1" style={styles.balanceAmount}>
              {formatCurrency(dashboard?.totalBalance ?? dashboard?.netWorth)}
            </Typography>
            <View style={styles.subStats}>
              <View style={styles.subStat}>
                <ArrowUpRight size={16} color="#2ecc71" />
                <Typography variant="caption" color="#2ecc71">Income</Typography>
                <Typography variant="label" color="#2ecc71">{formatCurrency(dashboard?.totalIncome)}</Typography>
              </View>
              <View style={[styles.subStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 20 }]}>
                <ArrowDownLeft size={16} color="#ff4757" />
                <Typography variant="caption" color="#ff4757">Expenses</Typography>
                <Typography variant="label" color="#ff4757">{formatCurrency(dashboard?.totalExpenses)}</Typography>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionBtn icon={Plus} label="Add" color={colors.tint} onPress={() => router.push('/modal')} />
          <ActionBtn icon={TrendingUp} label="Income" color="#2ecc71" onPress={() => router.push('/(drawer)/income')} />
          <ActionBtn icon={TrendingDown} label="Expenses" color="#ff4757" onPress={() => router.push('/(drawer)/transactions')} />
          <ActionBtn icon={Wallet} label="Wallet" color="#70a1ff" onPress={() => router.push('/(drawer)/wallet')} />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Typography variant="label" style={{ opacity: 0.5, letterSpacing: 1 }}>RECENT ACTIVITY</Typography>
            <TouchableOpacity onPress={() => router.push('/(drawer)/transactions')}>
              <Typography variant="caption" color={colors.tint}>See all</Typography>
            </TouchableOpacity>
          </View>

          {txLoading ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 20 }} />
          ) : recentTx.length === 0 ? (
            <Typography variant="caption" style={{ opacity: 0.4, textAlign: 'center', marginTop: 20 }}>
              No transactions yet. Add one!
            </Typography>
          ) : (
            recentTx.map(tx => (
              <Card key={tx.id} style={styles.txItem} variant="glass">
                <View style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: tx.creditAmount > 0 ? 'rgba(46,204,113,0.15)' : 'rgba(255,71,87,0.15)' }]}>
                    {tx.creditAmount > 0
                      ? <ArrowUpRight size={18} color="#2ecc71" />
                      : <ArrowDownLeft size={18} color="#ff4757" />
                    }
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="label" numberOfLines={1}>{tx.description}</Typography>
                    <Typography variant="caption">{tx.store || tx.personName || tx.category?.name || tx.financialCategory}</Typography>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Typography variant="label" color={tx.creditAmount > 0 ? '#2ecc71' : '#ff4757'}>
                      {tx.creditAmount > 0 ? '+' : '-'}{formatCurrency(tx.creditAmount > 0 ? tx.creditAmount : tx.debitAmount)}
                    </Typography>
                    <Typography variant="caption">{formatDate(tx.transactionDate)}</Typography>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionBtn({ icon: Icon, label, color, onPress }: any) {
  const { theme } = useAuthStore();
  const colors = Colors[theme || 'dark'];
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={22} color={color} />
      </View>
      <Typography variant="caption">{label}</Typography>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  loadingCard: { height: 160, justifyContent: 'center', alignItems: 'center' },
  balanceCard: { backgroundColor: '#1c1c1e', padding: 24, marginBottom: 24 },
  balanceAmount: { marginTop: 8, marginBottom: 20, fontSize: 36 },
  subStats: { flexDirection: 'row', gap: 20 },
  subStat: { gap: 2 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  actionBtn: { alignItems: 'center', gap: 8 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  txItem: { padding: 14, marginBottom: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
