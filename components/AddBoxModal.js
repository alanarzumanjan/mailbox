/**
 * Модальное окно регистрации нового почтового ящика в системе: принимает название,
 * адрес, начальный вес и уровень заряда батареи.
 */
'use client';

import { useState } from 'react';

export default function AddBoxModal({ isOpen, onClose, onAddBox }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [weight, setWeight] = useState(120);
  const [battery, setBattery] = useState(100);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    onAddBox({
      name: name.trim(),
      address: address.trim(),
      weight: Math.max(0, Math.min(2000, Number(weight) || 0)),
      battery: Math.max(1, Math.min(100, Number(battery) || 100)),
    });

    setName('');
    setAddress('');
    setWeight(120);
    setBattery(100);
    onClose();
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-1000 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-lg">Add a postbox</h2>
            <p className="text-xs text-slate-400 mt-1">Register a new collection point</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl cursor-pointer">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Postbox name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Freedom Monument"
              className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-600">Street address</span>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, Riga"
              className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Current weight (g)</span>
              <input
                type="number"
                min="0"
                max="2000"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Battery (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                value={battery}
                onChange={(e) => setBattery(e.target.value)}
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <p className="text-[11px] text-slate-400">
            New boxes are placed near central Riga on this demo map.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-700 text-white rounded-lg py-2.5 text-sm font-bold cursor-pointer"
            >
              Create postbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
