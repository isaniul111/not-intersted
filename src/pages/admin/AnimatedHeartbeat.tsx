import { motion } from 'framer-motion';

export const AnimatedHeartbeat = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="relative w-20 h-12 flex items-center justify-center">
      {/* Background Glow */}
      <div className={`absolute inset-0 blur-xl rounded-full opacity-50 ${isDark ? 'bg-emerald-500/30' : 'bg-emerald-400/40'} animate-pulse`} />
      
      {/* ECG SVG Line */}
      <svg viewBox="0 0 100 50" className={`w-full h-full relative z-10 ${isDark ? 'stroke-emerald-400' : 'stroke-emerald-500'}`}>
        <motion.path
          d="M 5,25 L 25,25 L 35,10 L 50,45 L 60,5 L 70,30 L 80,25 L 95,25"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ 
            pathLength: [0, 1, 1], 
            opacity: [0, 1, 1, 0] 
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.8, 1]
          }}
        />
      </svg>
    </div>
  );
};