"use client"

import { motion } from "framer-motion"
import { Loader2, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormField, TextInput, fadeUp } from "@/components/FormPrimitives"

export interface AddressData {
    shippingFirstName: string
    shippingLastName: string
    shippingStreet: string
    shippingCity: string
    shippingZipCode: string
    shippingCountry: string
    shippingPhone?: string
}

export interface AddressFields {
    firstName: string
    lastName: string
    street: string
    city: string
    zipCode: string
    country: string
    phone: string
}

interface Props {
    values: AddressFields
    onChange: (field: keyof AddressFields, value: string) => void
    saved: boolean
    saving: boolean
    error: string | null
    onSavedChange: (saved: boolean) => void
    onSubmit: (e: React.FormEvent) => void
}

export function AddressForm({ values, onChange, saved, saving, error, onSavedChange, onSubmit }: Props) {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                    {saved && (
                        <Badge variant="secondary" className="ml-auto">Saved</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {saved ? (
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">{values.firstName} {values.lastName}</p>
                        <p>{values.street}</p>
                        <p>{values.zipCode} {values.city}</p>
                        <p>{values.country}</p>
                        {values.phone && <p>{values.phone}</p>}
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => onSavedChange(false)}
                        >
                            Edit address
                        </Button>
                    </div>
                ) : (
                    <motion.form
                        onSubmit={onSubmit}
                        className="space-y-4"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="First name" id="firstName" required>
                                <TextInput
                                    id="firstName"
                                    type="text"
                                    value={values.firstName}
                                    onChange={(v) => onChange("firstName", v)}
                                    placeholder="John"
                                />
                            </FormField>
                            <FormField label="Last name" id="lastName" required>
                                <TextInput
                                    id="lastName"
                                    type="text"
                                    value={values.lastName}
                                    onChange={(v) => onChange("lastName", v)}
                                    placeholder="Doe"
                                />
                            </FormField>
                        </div>

                        <FormField label="Street" id="street" required>
                            <TextInput
                                id="street"
                                type="text"
                                value={values.street}
                                onChange={(v) => onChange("street", v)}
                                placeholder="123 Main St"
                                maxLength={200}
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Zip code" id="zipCode" required>
                                <TextInput
                                    id="zipCode"
                                    type="text"
                                    value={values.zipCode}
                                    onChange={(v) => onChange("zipCode", v)}
                                    placeholder="75001"
                                />
                            </FormField>
                            <FormField label="City" id="city" required>
                                <TextInput
                                    id="city"
                                    type="text"
                                    value={values.city}
                                    onChange={(v) => onChange("city", v)}
                                    placeholder="Paris"
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Country" id="country" required>
                                <TextInput
                                    id="country"
                                    type="text"
                                    value={values.country}
                                    onChange={(v) => onChange("country", v)}
                                    placeholder="France"
                                />
                            </FormField>
                            <FormField label="Phone" id="phone">
                                <TextInput
                                    id="phone"
                                    type="tel"
                                    value={values.phone}
                                    onChange={(v) => onChange("phone", v)}
                                    placeholder="+33 6 12 34 56 78"
                                />
                            </FormField>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <motion.div variants={fadeUp}>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    "Continue to payment"
                                )}
                            </Button>
                        </motion.div>
                    </motion.form>
                )}
            </CardContent>
        </Card>
    )
}
