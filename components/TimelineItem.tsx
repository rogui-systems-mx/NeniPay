import { CircleDollarSign, MoreVertical, Package, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Transaction } from '../hooks/useNeniStore.types';

interface Props {
    transaction: Transaction;
    onMorePress?: (transaction: Transaction) => void;
}

export const TimelineItem: React.FC<Props> = ({ transaction, onMorePress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const isSale = transaction.type === 'sale';
    const Icon = isSale ? ShoppingCart : CircleDollarSign;
    const color = (isSale ? colors.danger : colors.success) || '#000000';

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.content}>
                <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.date}>{new Date(transaction.date).toLocaleDateString()} • {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    {transaction.items && transaction.items.length > 0 && (
                        <View style={styles.itemBadge}>
                            <Package size={10} color={colors.textSecondary} />
                            <Text style={styles.itemBadgeText}>{transaction.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.rightContent}>
                <Text style={[styles.amount, { color }]}>
                    {isSale ? '-' : '+'}${typeof transaction.amount === 'number' ? transaction.amount.toLocaleString() : '0.00'}
                </Text>
                {onMorePress && (
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => onMorePress(transaction)}
                    >
                        <MoreVertical size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    description: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    date: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    rightContent: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    moreButton: {
        padding: 4,
        marginTop: 4,
    },
    itemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: colors.border + '50',
        borderRadius: 4,
    },
    itemBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
});
