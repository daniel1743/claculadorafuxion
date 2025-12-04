
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, PieChart as PieIcon, BarChart3, TrendingUp, Activity } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur border border-white/10 p-4 rounded-xl shadow-2xl">
        <p className="text-gray-400 text-xs font-bold uppercase mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-mono font-bold text-white">${entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ChartCard = ({ title, icon: Icon, children, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay, duration: 0.5 }}
    className="bg-gray-900/40 border border-white/5 p-6 rounded-2xl shadow-lg backdrop-blur-sm flex flex-col h-[400px]"
  >
    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
      <Icon className="w-4 h-4 text-yellow-500" /> {title}
    </h3>
    <div className="flex-grow w-full min-h-0">
      {children}
    </div>
  </motion.div>
);

const ChartsSection = ({ transactions }) => {
  const data = useMemo(() => {
    if (transactions.length === 0) return null;

    const dailyData = {};
    transactions.forEach(t => {
      const dateObj = new Date(t.date);
      const date = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      // Ensure sortable key
      const sortKey = dateObj.getTime(); 
      
      if (!dailyData[date]) dailyData[date] = { name: date, sortKey, ganancia: 0, ventas: 0 };
      
      if (t.type === 'venta') {
        dailyData[date].ganancia += t.total;
        dailyData[date].ventas += t.total;
      } else {
        dailyData[date].ganancia -= t.total;
      }
    });
    
    // Sort by date properly
    const lineData = Object.values(dailyData)
        .sort((a, b) => a.sortKey - b.sortKey)
        .slice(-14);

    const campData = {};
    transactions.forEach(t => {
        const name = t.campaignName || 'Orgánico';
        if (!campData[name]) campData[name] = { name, inversion: 0, retorno: 0, roi: 0 };
        
        if (t.type === 'publicidad') {
            campData[name].inversion += t.total;
        } else if (t.type === 'venta' && t.campaignName) {
            campData[name].retorno += t.total;
        }
    });

    const barData = Object.values(campData)
      .filter(c => c.name !== 'Orgánico')
      .map(c => ({
        ...c,
        roi: c.inversion > 0 ? ((c.retorno - c.inversion) / c.inversion) * 100 : 0
      }));

    let adsTotal = 0;
    let purchTotal = 0;
    transactions.forEach(t => {
        if (t.type === 'publicidad') adsTotal += t.total;
        if (t.type === 'compra') purchTotal += t.total;
    });
    const pieData = [
        { name: 'Publicidad', value: adsTotal },
        { name: 'Compras', value: purchTotal }
    ];

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const heatData = daysOfWeek.map(d => ({ name: d, count: 0 }));
    
    transactions.filter(t => t.type === 'venta').forEach(t => {
        const d = new Date(t.date).getDay();
        heatData[d].count += 1;
    });

    return { lineData, barData, pieData, heatData };
  }, [transactions]);

  if (!data) {
    return (
      <div className="p-12 text-center text-gray-500 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Registra transacciones para visualizar las analíticas</p>
      </div>
    );
  }

  const COLORS = ['#EF4444', '#EAB308']; 

  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolución de Ganancia Neta" icon={TrendingUp} delay={0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line 
                type="monotone" 
                dataKey="ganancia" 
                stroke="#EAB308" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#EAB308', strokeWidth: 2, stroke: '#000' }} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
                name="Ganancia ($)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rendimiento de Campañas (ROI)" icon={BarChart3} delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.barData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis yAxisId="left" orientation="left" stroke="#EF4444" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#22C55E" fontSize={12} unit="%" tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar yAxisId="left" dataKey="inversion" fill="#EF4444" name="Inversión ($)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="roi" fill="#22C55E" name="ROI (%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1">
            <ChartCard title="Distribución de Gastos" icon={PieIcon} delay={0.2}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
         </div>

         <div className="lg:col-span-2">
            <ChartCard title="Intensidad de Ventas Semanal" icon={Calendar} delay={0.3}>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.heatData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#666" allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#ffffff05'}} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Ventas Realizadas">
                    {data.heatData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#EAB308" 
                        fillOpacity={0.3 + (entry.count / (Math.max(...data.heatData.map(d=>d.count))||1)) * 0.7} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
         </div>
      </div>
    </div>
  );
};

export default ChartsSection;
