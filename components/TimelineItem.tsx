import { CircleDollarSign, MoreVertical, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Transaction } from '../hooks/useNeniStore.types';

import { StitchCard } from './StitchCard';

interface Props {
    transaction: Transaction;
    onMorePress?: (transaction: Transaction) => void;
    onPress?: () => void;
    clientName?: string;
}

export const TimelineItem: React.FC<Props> = ({ transaction, onMorePress, onPress, clientName }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const isSale = transaction.type === 'sale';
    const Icon = isSale ? ShoppingCart : CircleDollarSign;
    const color = (isSale ? colors.danger : colors.success) || '#000000';

    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container onPress={onPress} activeOpacity={0.7}>
            <StitchCard intensity={isSale ? 20 : 15} style={styles.container}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Icon size={20} color={color} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.description} numberOfLines={1}>
                        {clientName ? `${clientName}: ` : ''}{isSale && transaction.items && transaction.items.length > 0
                            ? transaction.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')
                            : transaction.description}
                    </Text>
                    {isSale && transaction.items && transaction.items.length > 0 && (
                        <Text style={styles.subDescription} numberOfLines={1}>
                            {transaction.description}
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={styles.date}>{new Date(transaction.date).toLocaleDateString()} • {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
            </StitchCard>
        </Container>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 12,
        borderRadius: 24,
        marginBottom: 8,
        backgroundColor: colors.card + '85',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
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
        fontFamily: 'Manrope_700Bold',
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    subDescription: {
        color: colors.textSecondary,
        fontSize: 13,
        fontFamily: 'Manrope_500Medium',
        opacity: 0.7,
        marginBottom: 2,
    },
    date: {
        color: colors.textSecondary,
        fontSize: 12,
        fontFamily: 'Manrope_500Medium',
        opacity: 0.6,
    },
    amount: {
        fontSize: 18,
        fontFamily: 'Manrope_800ExtraBold',
        letterSpacing: -0.5,
    },
    rightContent: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
        marginLeft: 12,
        minWidth: 80,
    },
    moreButton: {
        padding: 8,
        backgroundColor: colors.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    }
});
