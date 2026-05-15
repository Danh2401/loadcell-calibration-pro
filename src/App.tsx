/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase'
import Login from './Login'
import { 
  Calculator, 
  History, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  Settings2,
  TrendingDown,
  Scale,
  LineChart as LineChartIcon,
  LayoutList,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Types
interface LoadcellValues {
  l1: number | '';
  l2: number | '';
  l3: number | '';
  l4: number | '';
}

interface CalibEntry {
  id: string;
  timestamp: number;
  system: 'TSC1' | 'TSC2';
  cang: 'Càng 1' | 'Càng 2';
  empty: LoadcellValues;
  load: LoadcellValues;
  standard: number;
  factor: number;
}

type View = 'selector' | 'calc' | 'history';

function MainApp() {
  const [view, setView] = useState<View>('selector');
  const [selectedSystem, setSelectedSystem] = useState<'TSC1' | 'TSC2' | null>(null);
  const [selectedCang, setSelectedCang] = useState<'Càng 1' | 'Càng 2' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Input fields state
  const [emptyValues, setEmptyValues] = useState<LoadcellValues>({ l1: '', l2: '', l3: '', l4: '' });
  const [loadValues, setLoadValues] = useState<LoadcellValues>({ l1: '', l2: '', l3: '', l4: '' });
  const [standardWeight, setStandardWeight] = useState<number | ''>('');
  
  // History state
  const [history, setHistory] = useState<CalibEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calib_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('calib_history', JSON.stringify(history));
  }, [history]);

  // Calculations
  const calculation = useMemo(() => {
    const e1 = Number(emptyValues.l1) || 0;
    const e2 = Number(emptyValues.l2) || 0;
    const e3 = Number(emptyValues.l3) || 0;
    const e4 = Number(emptyValues.l4) || 0;
    
    const l1 = Number(loadValues.l1) || 0;
    const l2 = Number(loadValues.l2) || 0;
    const l3 = Number(loadValues.l3) || 0;
    const l4 = Number(loadValues.l4) || 0;
    
    const std = Number(standardWeight) || 0;
    
    const sumEmpty = e1 + e2 + e3 + e4;
    const sumLoad = l1 + l2 + l3 + l4;
    const diff = sumLoad - sumEmpty;
    
    const factor = std > 0 ? diff / std : 0;
    
    return {
      sumEmpty,
      sumLoad,
      diff,
      factor,
      isValid: std > 0 && sumLoad > 0
    };
  }, [emptyValues, loadValues, standardWeight]);

  // Average statistics
  const averages = useMemo(() => {
    if (!selectedSystem || !selectedCang) return 0;
    const filtered = history.filter(h => h.system === selectedSystem && h.cang === selectedCang);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, curr) => acc + curr.factor, 0);
    return sum / filtered.length;
  }, [history, selectedSystem, selectedCang]);

  const chartData = useMemo(() => {
    if (!selectedSystem || !selectedCang) return [];
    return history
      .filter(h => h.system === selectedSystem && h.cang === selectedCang)
      .map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        fullTime: new Date(h.timestamp).toLocaleString('vi-VN'),
        factor: Number(h.factor.toFixed(6)),
diff: Number(
  (
    (Number(h.load.l1) +
      Number(h.load.l2) +
      Number(h.load.l3) +
      Number(h.load.l4)) -
    (Number(h.empty.l1) +
      Number(h.empty.l2) +
      Number(h.empty.l3) +
      Number(h.empty.l4))
  ).toFixed(2)
)      }))
      .reverse(); // Show oldest to newest
  }, [history, selectedSystem, selectedCang]);

  const exportToExcel = () => {
    if (history.length === 0) return;
    
    const data = history.map(h => ({
      'Thời gian': new Date(h.timestamp).toLocaleString('vi-VN'),
      'Hệ thống': h.system,
      'Càng': h.cang,
      'LC1 Không tải': h.empty.l1,
      'LC2 Không tải': h.empty.l2,
      'LC3 Không tải': h.empty.l3,
      'LC4 Không tải': h.empty.l4,
      'Tổng không tải': (Number(h.empty.l1)||0) + (Number(h.empty.l2)||0) + (Number(h.empty.l3)||0) + (Number(h.empty.l4)||0),
      'LC1 Có tải': h.load.l1,
      'LC2 Có tải': h.load.l2,
      'LC3 Có tải': h.load.l3,
      'LC4 Có tải': h.load.l4,
      'Tổng có tải': (Number(h.load.l1)||0) + (Number(h.load.l2)||0) + (Number(h.load.l3)||0) + (Number(h.load.l4)||0),
      'Giá trị chuẩn (KG)': h.standard,
      'Hệ số Calib': h.factor
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch sử Calib");
    XLSX.writeFile(workbook, `Lich_su_Calib_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  const handleSave = () => {
    if (!selectedSystem || !selectedCang || !calculation.isValid) return;
    
    const entry: CalibEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      system: selectedSystem,
      cang: selectedCang,
      empty: { ...emptyValues },
      load: { ...loadValues },
      standard: Number(standardWeight),
      factor: calculation.factor
    };
    
    setHistory([entry, ...history]);
    setView('history');
  };

  const deleteEntry = (id: string) => {
    setHistory(history.filter(h => h.id !== id));
  };

  const clearInputs = () => {
    setEmptyValues({ l1: '', l2: '', l3: '', l4: '' });
    setLoadValues({ l1: '', l2: '', l3: '', l4: '' });
    setStandardWeight('');
  };

  const resetSelection = () => {
    setSelectedSystem(null);
    setSelectedCang(null);
    setView('selector');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-[#E2E8F0]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-4 backdrop-blur-md bg-white/80">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'selector' && (
              <button 
                onClick={view === 'history' ? () => setView('calc') : resetSelection}
                className="p-2 -ml-2 hover:bg-[#F1F5F9] rounded-full transition-colors"
                id="back_button"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Calib Pro</h1>
              {selectedSystem && (
                <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">
                  {selectedSystem} • {selectedCang}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setView('history')}
            className={`p-2 rounded-full transition-all ${view === 'history' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F1F5F9]'}`}
            id="history_button"
          >
            <History size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {/* Selector View */}
          {view === 'selector' && (
            <motion.div 
              key="selector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-widest">Chọn hệ thống</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(['TSC1', 'TSC2'] as const).map(sys => (
                    <button
                      key={sys}
                      onClick={() => setSelectedSystem(sys)}
                      className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-32 ${
                        selectedSystem === sys 
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-lg' 
                        : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                      id={`sys_${sys}`}
                    >
                      <Settings2 size={24} className={selectedSystem === sys ? 'text-[#94A3B8]' : 'text-[#64748B]'} />
                      <span className="font-bold text-xl">{sys}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSystem && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-widest">Chọn Càng</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Càng 1', 'Càng 2'] as const).map(cang => (
                      <button
                        key={cang}
                        onClick={() => {
                          setSelectedCang(cang);
                          setView('calc');
                        }}
                        className="p-6 rounded-2xl border-2 border-[#E2E8F0] bg-white hover:border-[#1A1A1A] transition-all text-left group"
                        id={`cang_${cang}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">{cang}</span>
                          <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Calculator View */}
          {view === 'calc' && (
            <motion.div 
              key="calc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* No Load Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <TrendingDown size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Giá trị không tải (MV)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['l1', 'l2', 'l3', 'l4'] as const).map((key, i) => (
                    <div key={key} className="relative">
                      <label className="absolute left-3 top-2 text-[10px] font-bold text-[#94A3B8] uppercase">LC {i + 1}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={emptyValues[key]}
                        onChange={e => setEmptyValues({ ...emptyValues, [key]: e.target.value })}
                        className="w-full pt-6 pb-2 px-3 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent outline-none transition-all font-mono text-lg"
                        placeholder="0.00"
                        id={`empty_${key}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Load Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Scale size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Giá trị có tải (MV)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['l1', 'l2', 'l3', 'l4'] as const).map((key, i) => (
                    <div key={key} className="relative">
                      <label className="absolute left-3 top-2 text-[10px] font-bold text-[#94A3B8] uppercase">LC {i + 1}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={loadValues[key]}
                        onChange={e => setLoadValues({ ...loadValues, [key]: e.target.value })}
                        className="w-full pt-6 pb-2 px-3 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent outline-none transition-all font-mono text-lg"
                        placeholder="0.00"
                        id={`load_${key}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Standard Weight */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest">Giá trị chuẩn (Cẩu trục)</h3>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={standardWeight}
                    onChange={e => setStandardWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent outline-none transition-all font-bold text-2xl"
                    placeholder="Nhập giá trị chuẩn..."
                    id="standard_weight"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">KG</span>
                </div>
              </section>

              {/* Results Preview */}
              {calculation.isValid && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1A1A] text-white p-6 rounded-3xl shadow-2xl space-y-4"
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[#94A3B8] text-xs font-bold uppercase tracking-widest mb-1">Hệ số Calib</p>
                      <h4 className="text-4xl font-mono font-bold">{calculation.factor.toFixed(6)}</h4>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                      <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-widest">Chênh lệch</p>
                      <p className="font-mono text-lg font-bold leading-none">{calculation.diff.toFixed(2)}</p>
                      <div className="flex gap-4 mt-2">
                        <div className="text-right">
                          <p className="text-[#94A3B8] text-[8px] font-bold uppercase tracking-widest">T. Không tải</p>
                          <p className="font-mono text-xs font-bold leading-none">{calculation.sumEmpty.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#94A3B8] text-[8px] font-bold uppercase tracking-widest">T. Có tải</p>
                          <p className="font-mono text-xs font-bold leading-none">{calculation.sumLoad.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#334155] flex justify-between gap-4">
                    <button 
                      onClick={clearInputs}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#94A3B8] hover:text-white transition-colors"
                      id="clear_button"
                    >
                      Xóa nhập liệu
                    </button>
                    <button 
                      onClick={handleSave}
                      className="bg-white text-[#1A1A1A] px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#E2E8F0] active:scale-95 transition-all"
                      id="save_button"
                    >
                      <Plus size={18} />
                      Lưu lịch sử
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* History View */}
          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Summary Header */}
              <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm relative">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-widest">Thống kê trung bình</h2>
                  <button 
                    onClick={exportToExcel}
                    disabled={history.length === 0}
                    className="p-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#1A1A1A] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    title="Xuất Excel"
                    id="export_excel_button"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-[#F1F5F9] rounded-2xl">
                    <Calculator size={24} className="text-[#1A1A1A]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Hệ số trung bình</p>
                    <p className="text-3xl font-mono font-bold">{averages.toFixed(6)}</p>
                  </div>
                </div>
                
                {chartData.length >= 2 && (
                  <div className="mt-8 h-48 w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorFactor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="time" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                        />
                        <YAxis 
                          hide 
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="factor" 
                          stroke="#1A1A1A" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorFactor)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                      <LineChartIcon size={10} /> Biểu đồ xu hướng hệ số
                    </div>
                  </div>
                )}

                {history.length > 0 && (
                  <p className="mt-4 text-[10px] text-[#94A3B8] font-bold uppercase italic border-t border-[#F1F5F9] pt-4">
                    Dựa trên {history.filter(h => h.system === selectedSystem && h.cang === selectedCang).length} bản ghi cho {selectedSystem} - {selectedCang}
                  </p>
                )}
              </div>

              {/* History List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest px-1">Lịch sử gần đây</h3>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-[#94A3B8]">
                    <History size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="font-medium">Chưa có dữ liệu lịch sử</p>
                  </div>
                ) : (
                  history.map((entry) => (
                    <motion.div 
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        expandedId === entry.id ? 'border-[#1A1A1A] ring-1 ring-[#1A1A1A] shadow-md' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold bg-[#F1F5F9] px-2 py-0.5 rounded text-[#64748B]">
                                {entry.system} • {entry.cang}
                              </span>
                              <span className="text-[10px] font-bold text-[#94A3B8] uppercase">
                                {new Date(entry.timestamp).toLocaleTimeString('vi-VN')} {new Date(entry.timestamp).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEntry(entry.id);
                            }}
                            className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
                            id={`delete_${entry.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#94A3B8] uppercase mb-0.5">Hệ số Calib</span>
                            <div className="font-mono text-xl font-bold leading-none">{entry.factor.toFixed(6)}</div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Chuẩn</p>
                            <p className="font-bold leading-none">{entry.standard} KG</p>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedId === entry.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-4"
                            >
                              <div>
                                <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1"><TrendingDown size={10} /> Không tải (MV)</div>
                                  <span className="text-[#1A1A1A]">Tổng: {(Number(entry.empty.l1)||0) + (Number(entry.empty.l2)||0) + (Number(entry.empty.l3)||0) + (Number(entry.empty.l4)||0)}</span>
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                  {(['l1', 'l2', 'l3', 'l4'] as const).map((k, i) => (
                                    <div key={k} className="bg-[#F8F9FA] p-2 rounded-lg text-center">
                                      <p className="text-[8px] font-bold text-[#94A3B8]">LC{i+1}</p>
                                      <p className="text-xs font-mono font-bold">{entry.empty[k] || 0}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1"><Scale size={10} /> Có tải (MV)</div>
                                  <span className="text-[#1A1A1A]">Tổng: {(Number(entry.load.l1)||0) + (Number(entry.load.l2)||0) + (Number(entry.load.l3)||0) + (Number(entry.load.l4)||0)}</span>
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                  {(['l1', 'l2', 'l3', 'l4'] as const).map((k, i) => (
                                    <div key={k} className="bg-[#F8F9FA] p-2 rounded-lg text-center">
                                      <p className="text-[8px] font-bold text-[#94A3B8]">LC{i+1}</p>
                                      <p className="text-xs font-mono font-bold">{entry.load[k] || 0}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button (Only in home) */}
      {view === 'history' && history.length > 0 && (
        <div className="fixed bottom-6 right-6">
          <button 
            onClick={() => setView('calc')}
            className="w-14 h-14 bg-[#1A1A1A] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            id="fab_add"
          >
            <Plus size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Login />
  }

  return <MainApp />
}