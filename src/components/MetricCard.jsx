
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, trend, color = 'gold', isText = false, delay = 0, hoverData = [], onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses = {
    gold: {
      bg: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5',
      border: 'border-yellow-500/20',
      iconBg: 'bg-yellow-500/20 text-yellow-400',
      value: 'text-yellow-400',
      trend: 'text-yellow-500/70'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
      border: 'border-red-500/20',
      iconBg: 'bg-red-500/20 text-red-400',
      value: 'text-white',
      trend: 'text-red-400/70'
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      value: 'text-emerald-400',
      trend: 'text-emerald-500/70'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-400',
      value: 'text-white',
      trend: 'text-blue-400/70'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
      value: 'text-white',
      trend: 'text-purple-400/70'
    },
    gray: {
      bg: 'bg-gradient-to-br from-gray-800/30 to-gray-900/30',
      border: 'border-gray-700/30',
      iconBg: 'bg-gray-700/30 text-gray-400',
      value: 'text-white',
      trend: 'text-gray-500'
    }
  };

  const styles = colorClasses[color] || colorClasses.gold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative p-6 rounded-2xl border backdrop-blur-sm shadow-xl ${styles.bg} ${styles.border} group overflow-visible cursor-pointer transition-all hover:shadow-2xl hover:shadow-${color}-500/10 z-0 hover:z-20`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity group-hover:opacity-20" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${styles.iconBg} shadow-lg`}>
            <Icon className="w-5 h-5" />
          </div>
           {trend && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-black/20 backdrop-blur-md ${styles.trend} border border-white/5`}>
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            {title} <Info className="w-3 h-3 opacity-50" />
          </h3>
          <div className={`text-2xl font-black tracking-tight truncate ${styles.value} ${isText ? 'text-lg whitespace-normal leading-tight' : ''}`}>
            {value}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && hoverData && hoverData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute left-0 right-0 top-full mt-4 z-50 pointer-events-none"
          >
            <div className="bg-gray-900/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl text-sm w-[120%] -ml-[10%] relative">
               <div className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Vista Previa</div>
               <ul className="space-y-1.5">
                 {hoverData.map((item, idx) => (
                   <li key={idx} className="flex justify-between items-center text-gray-300 text-xs">
                      <span className="truncate max-w-[70%]">{item.label}</span>
                      <span className="font-mono font-bold text-white">{item.value}</span>
                   </li>
                 ))}
               </ul>
               <div className="mt-3 text-[10px] text-center text-gray-500 font-medium border-t border-white/5 pt-2">
                 Click para ver detalles completos
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MetricCard;
