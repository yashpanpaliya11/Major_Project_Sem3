import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DepartmentComparisonChart({ data = [] }) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e0f2fe"
            opacity={0.8}
          />
          <XAxis
            dataKey="department"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStart"
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-white border border-sky-100 rounded-xl shadow-lg px-4 py-3 pointer-events-none">
                  <p className="text-xs font-bold text-sky-950">{p.department}</p>
                  <p className="text-xs text-sky-600/80">Attendance Rate</p>
                  <p className="text-lg font-black text-sky-600">{p.attendanceRate}%</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="attendanceRate"
            fill="#0284c7"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            activeBar={<rect stroke="#0369a1" strokeWidth={2} />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
