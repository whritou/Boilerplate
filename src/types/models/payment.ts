import { PaymentStatus} from "@/types/models/order";

export interface PaymentEntity {
    id: string
    orderId: string
    stripePaymentIntentId: string
    amount: string
    status: PaymentStatus
    createdAt: Date
}

export interface PaymentDTO {
    id: string
    orderId: string
    stripePaymentIntentId: string
    amount: string
    status: PaymentStatus
    createdAt: string
}
