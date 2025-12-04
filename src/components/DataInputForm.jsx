
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, DollarSign, ShoppingBag, Megaphone, Gift, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const DataInputForm = ({ onAddTransaction }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    sales: '',
    purchases: '',
    advertising: '',
    promotional: '',
    unitsSold: '',
    campaign: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.sales || !formData.purchases || !formData.unitsSold || !formData.campaign) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Sales, Purchases, Units Sold, Campaign)",
        variant: "destructive"
      });
      return;
    }

    const transaction = {
      sales: parseFloat(formData.sales) || 0,
      purchases: parseFloat(formData.purchases) || 0,
      advertising: parseFloat(formData.advertising) || 0,
      promotional: parseFloat(formData.promotional) || 0,
      unitsSold: parseInt(formData.unitsSold) || 0,
      campaign: formData.campaign,
      date: new Date().toISOString()
    };

    onAddTransaction(transaction);
    
    setFormData({
      sales: '',
      purchases: '',
      advertising: '',
      promotional: '',
      unitsSold: '',
      campaign: ''
    });

    toast({
      title: "Transaction Added",
      description: "Your transaction has been successfully recorded!",
      className: "bg-gradient-to-r from-yellow-600 to-yellow-800 text-white border-yellow-500"
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const inputFields = [
    { name: 'sales', label: 'Total Sales', icon: DollarSign, placeholder: '0.00', type: 'number', step: '0.01' },
    { name: 'purchases', label: 'Total Purchases', icon: ShoppingBag, placeholder: '0.00', type: 'number', step: '0.01' },
    { name: 'advertising', label: 'Advertising Investment', icon: Megaphone, placeholder: '0.00', type: 'number', step: '0.01' },
    { name: 'promotional', label: 'Promotional Costs', icon: Gift, placeholder: '0.00', type: 'number', step: '0.01' },
    { name: 'unitsSold', label: 'Units Sold', icon: Package, placeholder: '0', type: 'number', step: '1' },
    { name: 'campaign', label: 'Campaign Name', icon: Tag, placeholder: 'e.g., Summer Sale 2025', type: 'text' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl border border-yellow-600/20 p-6 shadow-xl shadow-yellow-900/10"
    >
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
        <Plus className="w-6 h-6" />
        Add Transaction
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {inputFields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
              <field.icon className="w-4 h-4 text-yellow-500" />
              {field.label}
            </label>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              step={field.step}
              className="w-full bg-gray-950/50 border border-yellow-600/30 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300"
            />
          </div>
        ))}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold py-6 rounded-lg shadow-lg shadow-yellow-900/30 transition-all duration-300 transform hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </Button>
      </form>

      <div className="mt-6 p-4 bg-yellow-900/10 border border-yellow-600/20 rounded-lg">
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <Gift className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-yellow-400">Promotion:</span> Buy 4 Get 1 Free automatically calculated
        </p>
      </div>
    </motion.div>
  );
};

export default DataInputForm;
