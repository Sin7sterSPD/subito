import { Chip } from "heroui-native"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: "Awaiting payment",
    className: "bg-gray-02 text-gray-12",
  },
  PENDING_MATCH: {
    label: "Finding partner",
    className: "bg-gray-02 text-gray-12",
  },
  MATCHED: {
    label: "Assigned",
    className: "bg-blue-01 text-blue-09",
  },
  ARRIVING: {
    label: "On the way",
    className: "bg-orange-01 text-orange-09",
  },
  STARTED: {
    label: "In progress",
    className: "bg-green-01 text-green-09",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-01 text-green-09",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-01 text-red-09",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-gray-02 text-gray-12",
  },
}

export function BookingStatusChip({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status] ?? {
      label: status
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      className: "bg-gray-02 text-gray-12",
    }

  return (
    <Chip size="sm" className={config.className}>
      {config.label}
    </Chip>
  )
}
