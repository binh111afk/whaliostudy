import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AvatarFrameContext = createContext({
  selectedFrameId: null,
  setSelectedFrameId: () => {},
});

const STORAGE_KEY = "whalio_avatar_frame";

export const AvatarFrameProvider = ({ children }) => {
  const [selectedFrameId, setSelectedFrameId] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedFrameId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, selectedFrameId);
  }, [selectedFrameId]);

  const value = useMemo(
    () => ({ selectedFrameId, setSelectedFrameId }),
    [selectedFrameId]
  );

  return (
    <AvatarFrameContext.Provider value={value}>
      {children}
    </AvatarFrameContext.Provider>
  );
};

export const useAvatarFrame = () => useContext(AvatarFrameContext);
