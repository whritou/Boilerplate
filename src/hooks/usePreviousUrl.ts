"use client";

import { useEffect, useState } from "react";

export function useCallbackUrl(defaultUrl = "/") {
    const [url, setUrl] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setUrl(window.location.pathname + window.location.search);
        }
    }, []);

    return url || defaultUrl;
}
