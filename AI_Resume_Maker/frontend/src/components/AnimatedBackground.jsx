import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-10 top-16 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ x: [0, -60, 0], y: [0, 20, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 top-1/2 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 30, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
