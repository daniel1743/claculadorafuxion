
import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownRight, Calendar, Package, DollarSign, Target, Clock } from 'lucide-react';
import { formatCLP } from '@/lib/utils';

const KPIModal = ({ isOpen, onClose, type, transactions, title, color }) => {
  
  const modalData = useMemo(() => {
    if (!transactions) return { rows: [], summary: {} };

    let rows = [];
    let summary = {};

    if (type === 'inventory') {
        const map = {};
        transactions.forEach(t => {
            const name = t.productName;
            if (!map[name]) map[name] = { name, quantity: 0, lastDate: t.date, totalCost: 0, unitsBought: 0 };
            
            if (new Date(t.date) > new Date(map[name].lastDate)) map[name].lastDate = t.date;

            if (t.type === 'compra') {
                const free = t.freeUnits || 0;
                const totalUnits = t.quantity + free;
                map[name].quantity += totalUnits;
                map[name].unitsBought += totalUnits;
                map[name].totalCost += t.total;
            } else if (t.type === 'venta') {
                map[name].quantity -= t.quantity;
            }
        });
        rows = Object.values(map).filter(i => i.quantity !== 0);
        summary = { totalItems: rows.length, totalUnits: rows.reduce((a,b) => a + b.quantity, 0) };
    } 
    else if (type === 'ads') {
        const campMap = {};
        transactions.forEach(t => {
            if (t.type === 'publicidad' || t.campaignName) {
                const cName = t.campaignName || 'Orgánico';
                if (!campMap[cName]) campMap[cName] = { name: cName, investment: 0, sales: 0, revenue: 0, startDate: t.date };
                
                if (new Date(t.date) < new Date(campMap[cName].startDate)) campMap[cName].startDate = t.date;

                if (t.type === 'publicidad') {
                    campMap[cName].investment += t.total;
                } else if (t.type === 'venta' && t.campaignName === cName) {
                    campMap[cName].sales += 1;
                    campMap[cName].revenue += t.total;
                }
            }
        });
        rows = Object.values(campMap).filter(c => c.name !== 'Orgánico');
        summary = { totalCampaigns: rows.length, totalInv: rows.reduce((a,b)=>a+b.investment,0) };
    }
    else if (type === 'profit') {
        // Monthly breakdown
        const monthMap = {};
        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            
            if (!monthMap[key]) monthMap[key] = { label, key, income: 0, expense: 0, profit: 0 };

            if (t.type === 'venta') {
                monthMap[key].income += t.total;
            } else {
                monthMap[key].expense += t.total;
            }
            monthMap[key].profit = monthMap[key].income - monthMap[key].expense;
        });
        rows = Object.values(monthMap).sort((a,b) => a.key.localeCompare(b.key));
        summary = { net: rows.reduce((a,b)=>a+b.profit, 0) };
    }
    else if (type === 'purchases' || type === 'sales') {
        const filterType = type === 'purchases' ? 'compra' : 'venta';
        rows = transactions.filter(t => t.type === filterType).sort((a,b) => new Date(b.date) - new Date(a.date));
        summary = { count: rows.length, total: rows.reduce((a,b)=>a+b.total, 0) };
    }

    return { rows, summary };
  }, [type, transactions]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col bg-gray-900/95 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
             <span className={`w-3 h-8 rounded-full bg-${color}-500`}></span>
             {title}
          </DialogTitle>
          <DialogDescription>
            Vista detallada y análisis completo de datos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4 pr-2">
            {/* Summary Cards inside Modal */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {type === 'inventory' && (
                    <>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Total Productos</div>
                            <div className="text-2xl font-bold text-white">{modalData.summary.totalItems}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Unidades en Stock</div>
                            <div className="text-2xl font-bold text-blue-400">{modalData.summary.totalUnits}</div>
                        </div>
                    </>
                )}
                {type === 'ads' && (
                     <>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Campañas Activas</div>
                            <div className="text-2xl font-bold text-white">{modalData.summary.totalCampaigns}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Inversión Total</div>
                            <div className="text-2xl font-bold text-red-400">{formatCLP(modalData.summary.totalInv)}</div>
                        </div>
                    </>
                )}
                {type === 'profit' && (
                     <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-400 uppercase">Ganancia Neta Total</div>
                        <div className={`text-2xl font-bold ${modalData.summary.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCLP(modalData.summary.net)}
                        </div>
                    </div>
                )}
            </div>

            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md">
                    <tr>
                        {type === 'inventory' && (
                            <>
                                <th className="px-4 py-3 rounded-tl-lg">Producto</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3 text-right">Costo Prom.</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Última Actualización</th>
                            </>
                        )}
                        {type === 'ads' && (
                             <>
                                <th className="px-4 py-3 rounded-tl-lg">Campaña</th>
                                <th className="px-4 py-3 text-right">Inversión</th>
                                <th className="px-4 py-3 text-right">Ingresos Gen.</th>
                                <th className="px-4 py-3 text-right">ROI</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Inicio</th>
                            </>
                        )}
                        {type === 'profit' && (
                            <>
                                <th className="px-4 py-3 rounded-tl-lg">Periodo</th>
                                <th className="px-4 py-3 text-right">Ingresos</th>
                                <th className="px-4 py-3 text-right">Gastos</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Neto</th>
                            </>
                        )}
                        {(type === 'purchases' || type === 'sales') && (
                             <>
                                <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                                <th className="px-4 py-3">Producto / Descripción</th>
                                <th className="px-4 py-3 text-right">Cantidad</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Total</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {modalData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                             {type === 'inventory' && (
                                <>
                                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                                    <td className="px-4 py-3 text-right text-blue-300 font-mono">{row.quantity}</td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono">
                                        {formatCLP(row.unitsBought > 0 ? row.totalCost/row.unitsBought : 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500">{new Date(row.lastDate).toLocaleDateString()}</td>
                                </>
                            )}
                            {type === 'ads' && (
                                <>
                                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                                    <td className="px-4 py-3 text-right text-red-300 font-mono">{formatCLP(row.investment)}</td>
                                    <td className="px-4 py-3 text-right text-green-300 font-mono">{formatCLP(row.revenue)}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">
                                        {row.investment > 0 
                                            ? <span className={((row.revenue - row.investment) > 0) ? 'text-green-400' : 'text-red-400'}>
                                                {(((row.revenue - row.investment) / row.investment) * 100).toFixed(1)}%
                                              </span>
                                            : '-'
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500">{new Date(row.startDate).toLocaleDateString()}</td>
                                </>
                            )}
                            {type === 'profit' && (
                                <>
                                    <td className="px-4 py-3 font-medium text-white capitalize">{row.label}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-mono">{formatCLP(row.income)}</td>
                                    <td className="px-4 py-3 text-right text-red-400 font-mono">{formatCLP(row.expense)}</td>
                                    <td className={`px-4 py-3 text-right font-bold font-mono ${row.profit >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                                        {formatCLP(row.profit)}
                                    </td>
                                </>
                            )}
                            {(type === 'purchases' || type === 'sales') && (
                                <>
                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                        {new Date(row.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                        <div className="font-medium">{row.productName || row.campaignName}</div>
                                        <div className="text-xs text-gray-500">{row.description}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{row.quantity || 1}</td>
                                    <td className={`px-4 py-3 text-right font-bold font-mono ${type === 'sales' ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCLP(row.total)}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KPIModal;
