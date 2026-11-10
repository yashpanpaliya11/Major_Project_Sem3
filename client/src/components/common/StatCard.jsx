import React from "react";
import { motion } from "framer-motion";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "brand",
  trend,
  action,
}) {
  const colorMap = {
    brand: {
      iconBg: "bg-sky-50",
      iconBorder: "border-sky-200",
      iconColor: "text-sky-500",
      accent: "border-sky-100",
    },
    success: {
      iconBg: "bg-emerald-50",
      iconBorder: "border-emerald-200",
      iconColor: "text-emerald-500",
      accent: "border-emerald-100",
    },
    warning: {
      iconBg: "bg-amber-50",
      iconBorder: "border-amber-200",
      iconColor: "text-amber-500",
      accent: "border-amber-100",
    },
    danger: {
      iconBg: "bg-rose-50",
      iconBorder: "border-rose-200",
      iconColor: "text-rose-500",
      accent: "border-rose-100",
    },
    info: {
      iconBg: "bg-blue-50",
      iconBorder: "border-blue-200",
      iconColor: "text-blue-500",
      accent: "border-blue-100",
    },
  };

  const scheme = colorMap[color] || colorMap.brand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-start justify-between p-5 rounded-2xl bg-white border border-sky-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl border ${scheme.iconBg} ${scheme.iconBorder}`}>
          {Icon && <Icon className={`w-5 h-5 ${scheme.iconColor}`} />}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600">{title}</p>
          <h3 className="text-2xl font-black text-sky-950 tracking-tight mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-sky-500/90 font-medium mt-1.5">{subtitle}</p>}
        </div>
      </div>

      {action && <div className="ml-4">{action}</div>}

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-600 border border-emerald-100">
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 10l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {trend}
        </div>
      )}
    </motion.div>
  );
}
