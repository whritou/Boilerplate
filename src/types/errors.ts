export type Code =
    | "Required"
    | "Invalid"
    | "TooShort"
    | "TooLong"
    | "TooSmall"
    | "TooLarge"
    | "AlreadyExist"
    | "Mismatch"
    | "Conflict"
    | "Unauthorized"
    | "Forbidden"
    | "NotFound";

export const KNOWN_CODES: readonly Code[] = [
    "Required",
    "Invalid",
    "TooShort",
    "TooLong",
    "TooSmall",
    "TooLarge",
    "AlreadyExist",
    "Mismatch",
    "Conflict",
    "Unauthorized",
    "Forbidden",
    "NotFound",
];
