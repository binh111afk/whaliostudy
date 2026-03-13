import React from "react";
import { useAvatarFrame } from "../context/AvatarFrameContext";

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-10 h-10",
  xl: "w-28 h-28",
};

const getInitial = (name) => {
  if (!name) return "U";
  return String(name).trim().charAt(0).toUpperCase() || "U";
};

const AvatarWithFrame = ({
  src,
  name,
  frameId,
  size = "md",
  sizeClass,
  avatarClassName = "",
  fallbackClassName = "",
}) => {
  const { selectedFrameId } = useAvatarFrame();
  const resolvedFrameId = frameId ?? selectedFrameId;
  const resolvedSize = sizeClass || SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`relative inline-flex ${resolvedSize}`}>
      <div
        className={`relative z-10 h-full w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 ${avatarClassName}`}
      >
        {src ? (
          <img src={src} alt={name || "Avatar"} className="h-full w-full object-cover" />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-300 ${fallbackClassName}`}
          >
            {getInitial(name)}
          </span>
        )}
      </div>
      {resolvedFrameId && (
        <>
          <span
            aria-hidden="true"
            className={`avatar-frame frame-${resolvedFrameId}`}
          />
          <span
            aria-hidden="true"
            className={`avatar-ornament ornament-${resolvedFrameId}`}
          />
        </>
      )}
    </div>
  );
};

export default AvatarWithFrame;
