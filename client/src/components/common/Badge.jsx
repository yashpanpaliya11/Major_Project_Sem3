import React from "react";

const variants = {
  brand: {
    bg: "bg-sky-50",
    color: "text-sky-700",
    border: "border-sky-200",
  },
  sky: {
    bg: "bg-sky-50",
    color: "text-sky-700",
    border: "border-sky-200",
  },
  blue: {
    bg: "bg-blue-50",
    color: "text-blue-700",
    border: "border-blue-200",
  },
  indigo: {
    bg: "bg-sky-50",
    color: "text-sky-800",
    border: "border-sky-200",
  },
  success: {
    bg: "bg-emerald-50",
    color: "text-emerald-700",
    border: "border-emerald-200",
  },
  emerald: {
    bg: "bg-emerald-50",
    color: "text-emerald-700",
    border: "border-emerald-200",
  },
  warning: {
    bg: "bg-amber-50",
    color: "text-amber-800",
    border: "border-amber-200",
  },
  amber: {
    bg: "bg-amber-50",
    color: "text-amber-800",
    border: "border-amber-200",
  },
  orange: {
    bg: "bg-orange-50",
    color: "text-orange-800",
    border: "border-orange-200",
  },
  danger: {
    bg: "bg-rose-50",
    color: "text-rose-700",
    border: "border-rose-200",
  },
  rose: {
    bg: "bg-rose-50",
    color: "text-rose-700",
    border: "border-rose-200",
  },
  info: {
    bg: "bg-sky-50",
    color: "text-sky-700",
    border: "border-sky-200",
  },
  slate: {
    bg: "bg-slate-50",
    color: "text-slate-700",
    border: "border-slate-200",
  },
};

const sizes = {
  sm: "text-xs px-2.5 py-1 font-semibold",
  md: "text-xs px-3 py-1.5 font-semibold",
  lg: "text-sm px-4 py-2 font-bold",
};

export default function Badge({ children, variant = "brand", size = "md", className = "" }) {
  const style = variants[variant] || variants.brand;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs ${style.bg} ${style.color} ${style.border} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
}
