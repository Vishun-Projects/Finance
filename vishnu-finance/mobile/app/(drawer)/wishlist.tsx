import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    Sparkles,
    ShoppingCart,
    Heart,
    Plus,
    TrendingUp,
    Tag
} from 'lucide-react-native';

export default function WishlistScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Typography variant="h2">My Wishlist</Typography>
                    <Typography variant="caption">Saving for things that matter</Typography>
                </View>

                <View style={styles.summaryCard}>
                    <Card style={styles.innerSummary} variant="glass">
                        <Typography variant="label" color="rgba(255,255,255,0.6)">Total Wishlist Value</Typography>
                        <Typography variant="h2">$4,250.00</Typography>
                    </Card>
                    <Card style={styles.innerSummary} variant="glass">
                        <Typography variant="label" color="rgba(255,255,255,0.6)">Monthly Savings</Typography>
                        <Typography variant="h2">$400.00</Typography>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>PRIORITY ITEMS</Typography>
                    <WishlistItem
                        title="MacBook Pro M3"
                        price="$2,499"
                        progress={65}
                        image="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200"
                    />
                    <WishlistItem
                        title="Sony WH-1000XM5"
                        price="$399"
                        progress={100}
                        image="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200"
                    />
                    <WishlistItem
                        title="Herman Miller Chair"
                        price="$1,299"
                        progress={20}
                        image="https://images.unsplash.com/photo-1592078615290-033ee584e277?auto=format&fit=crop&q=80&w=200"
                    />
                </View>

                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]}>
                    <Plus size={24} color="#000" />
                    <Typography variant="label" color="#000" style={{ marginLeft: 8 }}>Add Item</Typography>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function WishlistItem({ title, price, progress, image }: any) {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <Card style={styles.itemCard} variant="glass">
            <View style={styles.row}>
                <View style={styles.imagePlaceholder}>
                    <ShoppingCart size={24} color={colors.icon} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={styles.rowBetween}>
                        <Typography variant="label">{title}</Typography>
                        <Heart size={18} color={progress === 100 ? '#ff4757' : colors.icon} fill={progress === 100 ? '#ff4757' : 'none'} />
                    </View>
                    <Typography variant="h3" style={{ marginTop: 4 }}>{price}</Typography>

                    <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: progress === 100 ? '#2ecc71' : colors.tint }]} />
                        </View>
                        <Typography variant="caption" style={{ marginTop: 4 }}>{progress === 100 ? 'Goal Reached!' : `${progress}% saved`}</Typography>
                    </View>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { marginBottom: 32 },
    summaryCard: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    innerSummary: { flex: 1, padding: 16 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16, opacity: 0.5, letterSpacing: 1 },
    itemCard: { padding: 16, marginBottom: 16 },
    row: { flexDirection: 'row' },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressSection: { marginTop: 12 },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 },
    progressBarFill: { height: '100%', borderRadius: 3 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        marginTop: 8
    }
});
