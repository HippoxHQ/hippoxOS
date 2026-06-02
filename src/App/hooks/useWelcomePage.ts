import { useState, useEffect } from "react";

export function useWelcomePage() {
    const [showWelcomePage, setShowWelcomePage] = useState(true);
    useEffect(() => {
    }, []);
    return {
        showWelcomePage,
        setShowWelcomePage,
    };
}