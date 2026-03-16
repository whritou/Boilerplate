import React from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import {
    Eye,
    EyeOff,
    AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const fadeUp: Variants = {
    hidden:  { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
};

export function FieldError({
                               message,
                               id,
                           }: {
    message: React.ReactNode | null
    id: string
}) {
    return (
        <AnimatePresence>
            {message && (
                <motion.p
                    id={id}
                    role="alert"
                    aria-live="assertive"
                    aria-atomic="true"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease }}
                    className="flex items-center gap-1.5 text-xs text-destructive dark:text-red-700"
                >
                    <AlertCircle
                        size={12}
                        strokeWidth={2}
                        className="shrink-0"
                        aria-hidden="true"
                    />
                    {message}
                </motion.p>
            )}
        </AnimatePresence>
    )
}

export function TextInput({
                              id,
                              type,
                              value,
                              onChange,
                              placeholder,
                              icon,
                              invalid,
                              children,
                              maxLength,
                              disabled = false,
                          }: {
    id: string
    type: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    icon?: React.ElementType
    invalid?: boolean
    children?: React.ReactNode
    maxLength?: number
    disabled?: boolean
}) {
    const Icon = icon

    return (
        <div className="relative">
            {Icon && (
                <Icon
                    size={16}
                    strokeWidth={1.8}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
            )}

            <Input
                id={id}
                type={type}
                value={value}
                maxLength={maxLength}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${id}-error` : undefined}
                disabled={disabled}
                className={cn(
                    "h-10 rounded-xl",
                    "bg-background dark:bg-blue-950",
                    "transition-all",
                    Icon ? "pl-9" : "pl-3",
                    children ? "pr-10" : "pr-3",
                    invalid && "border-destructive focus-visible:ring-destructive/20"
                )}
            />

            {children}
        </div>
    )
}

export function NumberInput({
                                id,
                                value,
                                onChange,
                                placeholder,
                                invalid,
                                disabled = false,
                            }: {
    id: string
    value: number
    onChange: (v: number) => void
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
}) {
    return (
        <Input
            id={id}
            type="number"
            value={value}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn(
                "h-10 rounded-xl bg-background dark:bg-blue-950",
                invalid && "border-destructive focus-visible:ring-destructive/20"
            )}
        />
    )
}

export function PasswordToggle({
                                   show,
                                   onToggle,
                               }: {
    show: boolean
    onToggle: () => void
}) {
    return (
        <button
            type="button"
            aria-label={show ? "hide password" : "show password"}
            onClick={onToggle}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
            {show ? (
                <EyeOff size={16} strokeWidth={1.8} />
            ) : (
                <Eye size={16} strokeWidth={1.8} />
            )}
        </button>
    )
}

export function TextAreaInput({
                                id,
                                value,
                                onChange,
                                placeholder,
                                invalid,
                                maxLength,
                                rows = 3,
                                disabled = false,
                            }: {
    id: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    invalid?: boolean
    maxLength?: number
    rows?: number
    disabled?: boolean
}) {
    return (
        <Textarea
            id={id}
            value={value}
            maxLength={maxLength}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            disabled={disabled}
            className={cn(
                "rounded-xl",
                "bg-background dark:bg-blue-950",
                "transition-all",
                invalid && "border-destructive focus-visible:ring-destructive/20"
            )}
        />
    )
}

export function SelectInput({
                                id,
                                value,
                                onChange,
                                options,
                                placeholder,
                                invalid,
                            }: {
    id: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    invalid?: boolean
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger
                id={id}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${id}-error` : undefined}
                className={cn(
                    "h-10 rounded-xl bg-background dark:bg-blue-950",
                    invalid && "border-destructive focus:ring-destructive/20"
                )}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export function FormField({
                              label,
                              id,
                              error,
                              description,
                              children,
                              className,
                              required = false,
                          }: {
    label?: string
    id: string
    error?: React.ReactNode | null
    description?: React.ReactNode
    children: React.ReactNode
    className?: string
    required?: boolean
}) {

    const descriptionId = `${id}-description`
    const errorId = `${id}-error`

    return (
        <motion.div
            variants={fadeUp}
            className={cn("flex flex-col gap-1.5", className)}
        >
            <Label
                htmlFor={id}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
                {label}

                {required && (
                    <>
                        <span className="text-destructive dark:text-red-600 ml-1">*</span>
                        <span className="sr-only">Required</span>
                    </>
                )}
            </Label>

            {children}

            {description && !error && (
                <p id={descriptionId} className="text-xs text-muted-foreground">
                    {description}
                </p>
            )}

            {error && <FieldError message={error} id={errorId} />}
        </motion.div>
    )
}
