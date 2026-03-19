export const statusVariant = (status: string) => {
    switch (status) {
        case "pending": return "outline"
        case "confirmed": return "default"
        case "shipped": return "secondary"
        case "delivered": return "default"
        case "canceled": return "destructive"
        default: return "outline"
    }
}

export const paymentVariant = (status: string) => {
    switch (status) {
        case "succeeded": return "default"
        case "processing": return "outline"
        case "canceled": return "destructive"
        case "refunded": return "destructive"
        case "requires_payment_method": return "outline"
        case "requires_capture": return "outline"
        case "requires_action": return "outline"
        case "requires_confirmation": return "outline"
        default: return "outline"
    }
}

export const paymentLabels: Record<string, string> = {
    succeeded: "Paid",
    processing: "Processing",
    canceled: "Canceled",
    refunded: "Refunded",
    requires_payment_method: "Payment Required",
}

export const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "canceled", label: "Canceled" },
]