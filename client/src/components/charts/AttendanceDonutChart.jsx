import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function AttendanceDonutChart({ data = [] }) {
  const COLORS = [
    "#0284c7",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#38bdf8",
    "#6366f1",
  ];

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-white border border-sky-100 rounded-xl shadow-lg px-4 py-3 pointer-events-none">
                  <p className="text-xs font-bold text-sky-950">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.value} students</p>
                  <p className="text-sm font-black text-sky-600 mt-0.5">{p.percentage || p.value}%</p>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconSize={10}
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs font-medium text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
