
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

const KPIModal = ({ isOpen, onClose, type, transactions, title, color, loans = [], products = [], inventoryMap = {} }) => {

  const modalData = useMemo(() => {
    if (!transactions && !products) return { rows: [], summary: {} };

    let rows = [];
    let summary = {};

    if (type === 'inventory') {
        // USAR PRODUCTOS V2 (fuente de verdad)
        if (products && products.length > 0) {
            rows = products
                .filter(p => p.currentStockBoxes > 0 || p.currentMarketingStock > 0)
                .map(p => ({
                    name: p.name,
                    quantity: p.currentStockBoxes,
                    marketingStock: p.currentMarketingStock || 0,
                    weightedAverageCost: p.weightedAverageCost || 0,
                    listPrice: p.listPrice || 0,
                    totalValue: (p.currentStockBoxes * p.weightedAverageCost) || 0
                }));

            const totalBoxes = rows.reduce((a, b) => a + b.quantity, 0);
            const totalValue = rows.reduce((a, b) => a + b.totalValue, 0);

            summary = {
                totalItems: rows.length,
                totalUnits: totalBoxes,
                totalValue: totalValue
            };
        } else {
            // Fallback: calcular desde transacciones (sistema antiguo)
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
            summary = { totalItems: rows.length, totalUnits: rows.reduce((a, b) => a + b.quantity, 0) };
        }
    } 
    else if (type === 'ads') {
        const campMap = {};
        transactions.forEach(t => {
            const isAd = t.type === 'publicidad' || t.type === 'advertising';
            if (isAd || t.campaignName) {
                const cName = t.campaignName || 'Orgánico';
                if (!campMap[cName]) campMap[cName] = { name: cName, investment: 0, sales: 0, revenue: 0, startDate: t.date };

                if (new Date(t.date) < new Date(campMap[cName].startDate)) campMap[cName].startDate = t.date;

                const amount = t.total || t.totalAmount || 0;
                const isSale = t.type === 'venta' || t.type === 'sale';

                if (isAd) {
                    campMap[cName].investment += amount;
                } else if (isSale && t.campaignName === cName) {
                    campMap[cName].sales += 1;
                    campMap[cName].revenue += amount;
                }
            }
        });
        rows = Object.values(campMap).filter(c => c.name !== 'Orgánico');
        summary = { totalCampaigns: rows.length, totalInv: rows.reduce((a, b) => a + b.investment, 0) };
    }
    else if (type === 'profit') {
        // Monthly breakdown
        const monthMap = {};
        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

            if (!monthMap[key]) monthMap[key] = { label, key, income: 0, expense: 0, profit: 0 };

            const amount = t.total || t.totalAmount || 0;
            const isSale = t.type === 'venta' || t.type === 'sale';

            if (isSale) {
                monthMap[key].income += amount;
            } else {
                monthMap[key].expense += amount;
            }
            monthMap[key].profit = monthMap[key].income - monthMap[key].expense;
        });
        rows = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
        summary = { net: rows.reduce((a, b) => a + b.profit, 0) };
    }
    else if (type === 'purchases' || type === 'sales') {
        // Manejar tipos antiguos y nuevos
        if (type === 'purchases') {
            rows = transactions.filter(t => t.type === 'compra' || t.type === 'purchase');
        } else {
            rows = transactions.filter(t => t.type === 'venta' || t.type === 'sale');
        }
        rows = rows.sort((a, b) => new Date(b.date) - new Date(a.date));
        summary = { count: rows.length, total: rows.reduce((a, b) => a + (b.total || b.totalAmount || 0), 0) };
    }
    else if (type === 'loans') {
        // Agregar préstamos por producto
        const loanMap = {};
        loans.forEach(loan => {
            const key = loan.productName;
            if (!loanMap[key]) {
                loanMap[key] = {
                    productName: loan.productName,
                    totalBoxes: 0,
                    totalSachets: 0,
                    listPrice: loan.listPrice || 0,
                    lastUpdate: loan.createdAt
                };
            }
            loanMap[key].totalBoxes += loan.quantityBoxes || 0;
            loanMap[key].totalSachets += loan.quantitySachets || 0;
            if (new Date(loan.createdAt) > new Date(loanMap[key].lastUpdate)) {
                loanMap[key].lastUpdate = loan.createdAt;
            }
        });
        rows = Object.values(loanMap);
        const totalBoxes = rows.reduce((a, b) => a + b.totalBoxes, 0);
        const totalValue = rows.reduce((a, b) => a + (b.totalBoxes * b.listPrice), 0);
        summary = { totalProducts: rows.length, totalBoxes, totalValue };
    }
    else if (type === 'personal_consumption') {
        // Agregar consumo personal y muestras por producto
        const consumptionMap = {};
        let totalMarketingSamples = 0;

        transactions.forEach(t => {
            if (t.type === 'personal_consumption') {
                const key = t.productName;
                if (!consumptionMap[key]) {
                    consumptionMap[key] = {
                        productName: key,
                        totalBoxes: 0,
                        totalSachets: 0,
                        lastDate: t.date
                    };
                }
                consumptionMap[key].totalBoxes += t.quantityBoxes || 0;
                consumptionMap[key].totalSachets += t.quantitySachets || 0;
                if (new Date(t.date) > new Date(consumptionMap[key].lastDate)) {
                    consumptionMap[key].lastDate = t.date;
                }
            } else if (t.type === 'marketing_sample') {
                totalMarketingSamples += t.quantitySachets || 0;
            }
        });

        rows = Object.values(consumptionMap);
        const totalBoxes = rows.reduce((a, b) => a + b.totalBoxes, 0);
        const totalSachets = rows.reduce((a, b) => a + b.totalSachets, 0);
        summary = { totalProducts: rows.length, totalBoxes, totalSachets, totalMarketingSamples };
    }

    return { rows, summary };
  }, [type, transactions, loans, products]);

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
                            <div className="text-2xl font-bold text-white">{modalData.summary.totalItems || 0}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Cajas en Stock</div>
                            <div className="text-2xl font-bold text-blue-400">{modalData.summary.totalUnits || 0}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Valor Total (PPP)</div>
                            <div className="text-2xl font-bold text-green-400">{formatCLP(modalData.summary.totalValue || 0)}</div>
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
                {type === 'personal_consumption' && (
                    <>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Productos Consumidos</div>
                            <div className="text-2xl font-bold text-white">{modalData.summary.totalProducts || 0}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Cajas Consumidas</div>
                            <div className="text-2xl font-bold text-violet-400">{modalData.summary.totalBoxes || 0}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Sobres Consumidos</div>
                            <div className="text-2xl font-bold text-violet-300">{modalData.summary.totalSachets || 0}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 uppercase">Muestras/Regalos</div>
                            <div className="text-2xl font-bold text-yellow-400">{modalData.summary.totalMarketingSamples || 0} sobres</div>
                        </div>
                    </>
                )}
            </div>

            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md">
                    <tr>
                        {type === 'inventory' && (
                            <>
                                <th className="px-4 py-3 rounded-tl-lg">Producto</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3 text-right">PPP (Costo)</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Valor Total</th>
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
                        {type === 'personal_consumption' && (
                             <>
                                <th className="px-4 py-3 rounded-tl-lg">Producto</th>
                                <th className="px-4 py-3 text-right">Cajas</th>
                                <th className="px-4 py-3 text-right">Sobres</th>
                                <th className="px-4 py-3 text-right rounded-tr-lg">Último Consumo</th>
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
                                    <td className="px-4 py-3 text-right text-blue-300 font-mono">
                                        {row.quantity} cajas
                                        {row.marketingStock > 0 && <span className="text-xs text-gray-500 block">+ {row.marketingStock} sobres</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono">
                                        {formatCLP(row.weightedAverageCost || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-green-400 font-mono font-bold">
                                        {formatCLP(row.totalValue || 0)}
                                    </td>
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
                            {type === 'personal_consumption' && (
                                <>
                                    <td className="px-4 py-3 font-medium text-white">{row.productName}</td>
                                    <td className="px-4 py-3 text-right text-violet-400 font-mono font-bold">
                                        {row.totalBoxes > 0 ? row.totalBoxes : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-violet-300 font-mono">
                                        {row.totalSachets > 0 ? row.totalSachets : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                        {row.lastDate ? new Date(row.lastDate).toLocaleDateString() : '-'}
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
