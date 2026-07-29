"use client";

import { useState } from "react";
import { maskPhone, formatPhone } from "@/lib/phoneUtils";

interface MaskedPhoneProps {
  phone: string;
  className?: string;
  showAlways?: boolean;
}

export function MaskedPhone({ phone, className = "", showAlways = false }: MaskedPhoneProps) {
  const [showFull, setShowFull] = useState(showAlways);

  if (!phone) return <span className={className}>---</span>;

  const display = showFull ? formatPhone(phone) : maskPhone(phone);

  return (
    <span
      className={`cursor-pointer ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        setShowFull((v) => !v);
      }}
      title={showFull ? "Clique para ocultar" : "Clique para revelar"}
    >
      {display}
    </span>
  );
}
