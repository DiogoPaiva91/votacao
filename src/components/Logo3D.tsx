"use client";

import { Vote } from "lucide-react";

interface Logo3DProps {
  size?: number;
}

export default function Logo3D({ size = 80 }: Logo3DProps) {
  const scale = size / 80;
  const iconSize = Math.round(38 * scale);
  const borderRadius = Math.round(20 * scale);
  const edgeHeight = Math.round(8 * scale);
  const edgeBottom = Math.round(4 * scale);
  const shadowWidth = Math.round(60 * scale);

  return (
    <div
      style={{
        position: "relative",
        perspective: "600px",
        width: size,
        height: size,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          background: "linear-gradient(145deg, #f6921e 0%, #e07310 60%, #c46010 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotateX(8deg) rotateY(-5deg)",
          transformStyle: "preserve-3d",
          boxShadow:
            `0 ${Math.round(20 * scale)}px ${Math.round(40 * scale)}px ${Math.round(-10 * scale)}px rgba(246, 146, 30, 0.5), ` +
            `0 ${Math.round(8 * scale)}px ${Math.round(16 * scale)}px ${Math.round(-4 * scale)}px rgba(0, 0, 0, 0.3), ` +
            "inset 0 2px 0 rgba(255, 255, 255, 0.3), " +
            "inset 0 -2px 4px rgba(0, 0, 0, 0.15), " +
            "inset 2px 0 0 rgba(255, 255, 255, 0.15), " +
            "inset -2px 0 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(255, 200, 100, 0.25)",
        }}
      >
        {/* Inner highlight for 3D depth */}
        <div
          style={{
            position: "absolute",
            top: Math.round(3 * scale),
            left: Math.round(3 * scale),
            right: Math.round(6 * scale),
            bottom: "50%",
            borderRadius: `${Math.round(17 * scale)}px ${Math.round(17 * scale)}px 50% 50%`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        <Vote
          size={iconSize}
          color="#fff"
          style={{
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>
      {/* 3D bottom edge / depth */}
      <div
        style={{
          position: "absolute",
          bottom: -edgeBottom,
          left: Math.round(4 * scale),
          right: Math.round(4 * scale),
          height: edgeHeight,
          borderRadius: `0 0 ${Math.round(16 * scale)}px ${Math.round(16 * scale)}px`,
          background: "linear-gradient(180deg, #b85a0a 0%, #9a4a08 100%)",
          zIndex: -1,
          filter: "blur(0.5px)",
        }}
      />
      {/* Shadow on the ground */}
      <div
        style={{
          position: "absolute",
          bottom: Math.round(-12 * scale),
          left: "50%",
          transform: "translateX(-50%)",
          width: shadowWidth,
          height: Math.round(10 * scale),
          borderRadius: "50%",
          background: "rgba(0,0,0,0.25)",
          filter: `blur(${Math.round(6 * scale)}px)`,
        }}
      />
    </div>
  );
}
