import { useState, useRef, useEffect } from "react";
export const usePopupMenu = () => {
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [activeIconId, setActiveIconId] = useState<string | null>(null);
    const iconRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const handleClosePopup = () => {
        setPopupVisible(false);
        setActiveIconId(null);
    };
    const showPopup = (itemId: string, position: { top: number; left: number }) => {
        setActiveIconId(itemId);
        setPopupPosition(position);
        setPopupVisible(true);
    };
    const hidePopup = () => {
        setPopupVisible(false);
        setActiveIconId(null);
    };
    const isPopupVisible = (itemId: string) => popupVisible && activeIconId === itemId;
    return {
        popupVisible,
        popupPosition,
        activeIconId,
        iconRefs,
        handleClosePopup,
        showPopup,
        hidePopup,
        isPopupVisible,
    };
};