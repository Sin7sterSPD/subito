import React, { useEffect, useState } from "react"
import { View, StyleSheet, FlatList, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Typography, Card, Chip, Spinner } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { paymentsApi } from "../../src/services/api"
import { Ionicons } from "@expo/vector-icons"

interface Payment {
  id: string
  amount: string
  status: string
  type: string
  createdAt: string
}

function PaymentCard({ payment }: { payment: Payment }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (): "success" | "warning" | "danger" | "default" => {
    switch (payment.status.toLowerCase()) {
      case "success":
        return "success"
      case "pending":
        return "warning"
      case "failed":
        return "danger"
      default:
        return "default"
    }
  }

  const getIcon = () => {
    if (payment.type === "refund") return "arrow-undo"
    return payment.status.toLowerCase() === "success"
      ? "checkmark-circle"
      : "close-circle"
  }

  const getIconColor = () => {
    if (payment.type === "refund") return semantic.warning
    return payment.status.toLowerCase() === "success"
      ? semantic.success
      : semantic.error
  }

  return (
    <Card style={styles.paymentCard} variant="default">
      <View style={styles.cardContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${getIconColor()}15` },
          ]}
        >
          <Ionicons name={getIcon()} size={20} color={getIconColor()} />
        </View>
        <View style={styles.paymentInfo}>
          <View style={styles.row}>
            <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
              {payment.type === "refund" ? "Refund" : "Payment"}
            </Typography>
            <Chip size="sm" variant="soft" color={getStatusColor()}>
              {payment.status}
            </Chip>
          </View>
          <Typography type="body-sm" color="muted" style={styles.date}>
            {formatDate(payment.createdAt)}
          </Typography>
        </View>
        <Typography
          type="body"
          weight="bold"
          style={{ color: payment.type === "refund" ? semantic.success : semantic.textPrimary }}
        >
          {payment.type === "refund" ? "+" : ""}₹{payment.amount}
        </Typography>
      </View>
    </Card>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="card-outline" size={48} color={semantic.textMuted} />
      </View>
      <Typography type="h6" weight="semibold" style={[styles.emptyTitle, { color: semantic.textSecondary }]}>
        No payment history
      </Typography>
      <Typography type="body-sm" color="muted" align="center">
        Your payment transactions will appear here
      </Typography>
    </View>
  )
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      setError(null)
      const response = await paymentsApi.getPaymentHistory()
      if (response.success && response.data) {
        const allPayments = [
          ...response.data.payments.map((p) => ({ ...p, type: "payment" })),
          ...response.data.refunds.map((r) => ({ ...r, type: "refund" })),
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setPayments(allPayments)
      }
    } catch {
      setError("Could not load payment history. Pull to refresh and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchPayments()
    setRefreshing(false)
  }

  if (isLoading) {
    return <Spinner size="lg" style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.backgroundSecondary }} edges={["bottom"]}>
      <FlatList
        data={payments}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[semantic.primary]}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    flexGrow: 1,
  },
  paymentCard: {
    marginBottom: spacing[3],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  date: {
    marginTop: spacing[1],
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
})
