import { motion } from "framer-motion";

export default function LoadingSpinner({ size = "md", text = "Loading..." }) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-14 h-14 border-4",
  }[size] || "w-10 h-10 border-3";

  return (
    <div className="flex flex-col items-center justify-center p-10 gap-4">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <div className={`${sizeClasses} border-sky-100 border-t-sky-500 rounded-full`} />
        <div className={`absolute inset-0 ${sizeClasses} border-sky-100 border-t-sky-500 rounded-full`} />
      </motion.div>
      {text && (
        <span className="text-sm font-semibold text-sky-700 tracking-wide">{text}</span>
      )}
    </div>
  );
}
