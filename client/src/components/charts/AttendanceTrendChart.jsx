import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function AttendanceTrendChart({ data = [] }) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e0f2fe"
            opacity={0.8}
          />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-white border border-sky-100 rounded-xl shadow-lg px-4 py-3 pointer-events-none">
                  <p className="text-xs font-bold text-sky-950">{p.date}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Present: {p.present}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Flagged: {p.flagged}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="present"
            name="Present Students"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fill="url(#presentGrad)"
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="flagged"
            name="Proxy Flags"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#flaggedGrad)"
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
