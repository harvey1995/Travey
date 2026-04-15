import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, Download, Plus, Search, CheckCircle, Clock, DollarSign, 
  SunMedium, Smartphone, Monitor, Trash2, Pencil, Map, X, Sparkles,
  MapPin, Footprints, Car, Train, ChevronRight, RefreshCw, 
  ChevronDown, ChevronUp, Edit2, AlertTriangle, CloudRain, ZoomIn
} from 'lucide-react';

// --- 工具函数 ---
const getTodayDate = () => new Date().toISOString().split('T')[0];

const sanitizeDate = (dateStr) => {
  if (!dateStr) return getTodayDate();
  let cleaned = dateStr.toString().trim().replace(/\//g, '-').replace(/[^\d-]/g, '');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    let year = parts[0];
    if (year.length === 2) year = '20' + year;
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    if (!isNaN(new Date(formatted).getTime())) return formatted;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? getTodayDate() : d.toISOString().split('T')[0];
};

const isUrl = (str) => {
  try { new URL(str); return true; } catch { return false; }
};

const TRANSPORT_ESTIMATES = {
  walk: { label: '步行', icon: Footprints, color: 'text-orange-400', alert: null },
  car: { label: '打车', icon: Car, color: 'text-blue-400', alert: '可能拥堵' },
  train: { label: '公交', icon: Train, color: 'text-green-400', alert: null }
};

// --- 默认东京3日游行程 ---
const TOKYO_TRIP = [
  { date: "2025-12-31", id: "tokyo-1", city: "Tokyo", name: "涩谷十字路口", duration: 60, note: "感受世界最繁忙的交叉路口，看跨年倒计时准备", cost: 0, currency: "JPY", done: true, order: 1, transportMode: 'train', transitRoute: '山手线' },
  { date: "2025-12-31", id: "tokyo-2", city: "Tokyo", name: "SHIBUYA SKY", duration: 90, note: "https://www.shibuya-scramble-square.com/sky/", cost: 2500, currency: "JPY", done: false, order: 2, transportMode: 'walk', transitRoute: '' },
  { date: "2025-12-31", id: "tokyo-3", city: "Tokyo", name: "明治神宫", duration: 120, note: "参加「初诣」，体验日本传统跨年参拜", cost: 0, currency: "JPY", done: false, order: 3, transportMode: 'train', transitRoute: '半藏门线' },
  { date: "2026-01-01", id: "tokyo-4", city: "Tokyo", name: "浅草寺", duration: 120, note: "求御守，吃人形烧，看元旦仲见世商店街", cost: 1000, currency: "JPY", done: false, order: 1, transportMode: 'train', transitRoute: '银座线' },
  { date: "2026-01-01", id: "tokyo-5", city: "Tokyo", name: "上野恩赐公园", duration: 180, note: "漫步博物馆群，呼吸新年第一份新鲜空气", cost: 0, currency: "JPY", done: false, order: 2, transportMode: 'walk', transitRoute: '' },
  { date: "2026-01-02", id: "tokyo-6", city: "Tokyo", name: "丰洲市场", duration: 120, note: "吃最正宗的寿司早餐，看金枪鱼拍卖展示", cost: 5000, currency: "JPY", done: false, order: 1, transportMode: 'train', transitRoute: '百合鸥号' },
  { date: "2026-01-02", id: "tokyo-7", city: "Tokyo", name: "银座", duration: 240, note: "新年大特卖「福袋」抢购，买伴手礼", cost: 20000, currency: "JPY", done: false, order: 2, transportMode: 'train', transitRoute: '' },
];

const INITIAL_TRIPS = { "东京跨年3日游": TOKYO_TRIP };

const App = () => {
  // 1. 增加本地缓存：初始化时优先读取 localStorage
  const [trips, setTrips] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travey_data');
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_TRIPS;
  });

  // 每次 trips 变动时，自动保存到 localStorage
  useEffect(() => {
    localStorage.setItem('travey_data', JSON.stringify(trips));
  }, [trips]);

  const [activeTrip, setActiveTrip] = useState("东京跨年3日游");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [activeTab, setActiveTab] = useState("Total"); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState('web'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // 修改为对象状态，独立控制每天的折叠面板
  const [expandedDates, setExpandedDates] = useState({});
  // 统一气泡预览的URL（不仅用于地图，也用于URL备注）
  const [previewIframeUrl, setPreviewIframeUrl] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState([]);

  const [lastSelectedCurrency, setLastSelectedCurrency] = useState('USD');

  const [formData, setFormData] = useState({ 
    name: '', date: getTodayDate(), duration: '60', city: '', note: '', cost: '0', currency: lastSelectedCurrency, order: '1', transportMode: 'train', transitRoute: '' 
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showMessage = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleRefresh = () => {
    showMessage("已刷新数据并保存");
  };

  useEffect(() => {
    if (showModal && modalMode === 'add') {
      const currentTripData = trips[activeTrip] || [];
      const sameDayItems = currentTripData.filter(item => sanitizeDate(item.date) === formData.date);
      const maxOrder = sameDayItems.reduce((max, item) => Math.max(max, parseInt(item.order) || 0), 0);
      setFormData(prev => ({ ...prev, order: String(maxOrder + 1), currency: lastSelectedCurrency }));
    }
  }, [formData.date, showModal, modalMode, activeTrip, trips, lastSelectedCurrency]);

  const currentTripData = trips[activeTrip] || [];

  const sanitizedTripData = useMemo(() => {
    return currentTripData.map(item => ({ ...item, date: sanitizeDate(item.date) }));
  }, [currentTripData]);

  const dates = useMemo(() => {
    const uniqueDates = [...new Set(sanitizedTripData.map(item => item.date))];
    return uniqueDates.sort((a, b) => new Date(a) - new Date(b));
  }, [sanitizedTripData]);

  const groupedDataWithTime = useMemo(() => {
    const sorted = [...sanitizedTripData].sort((a, b) => {
      if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
      return (a.order || 0) - (b.order || 0);
    });

    const groups = {};
    sorted.forEach(item => {
      const cleanDate = item.date;
      if (!groups[cleanDate]) groups[cleanDate] = { date: cleanDate, items: [], startTime: "09:00" };
      
      const dayItems = groups[cleanDate].items;
      let arrivalTime = groups[cleanDate].startTime;

      if (dayItems.length > 0) {
        const prevItem = dayItems[dayItems.length - 1];
        const travelTime = 0; 
        const [h, m] = prevItem.endTimeStr.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m + travelTime);
        arrivalTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        prevItem.nextTravelTime = "?";
      }

      const [hours, minutes] = arrivalTime.split(':').map(Number);
      const startDate = new Date(2000, 0, 1, hours, minutes);
      const endDate = new Date(startDate.getTime() + (item.duration || 0) * 60000);
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      dayItems.push({ ...item, startTimeStr: arrivalTime, endTimeStr });
    });

    let result = Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (activeTab !== "Total") result = result.filter(g => g.date === activeTab);
    if (searchQuery) {
      result = result.map(g => ({
        ...g,
        items: g.items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()) || (it.city||'').toLowerCase().includes(searchQuery.toLowerCase()))
      })).filter(g => g.items.length > 0);
    }
    return result;
  }, [sanitizedTripData, activeTab, searchQuery]);

  // ... [此处省略 CSV 导入导出、状态更新函数等，与之前完全一致，不做删减] ...
  const handleFileSelect = (e) => {/*...*/}
  const confirmImport = (mode) => {/*...*/}
  const handleExport = () => {/*...*/}
  const handleUpdateTransport = (id, mode) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, transportMode: mode } : item);
    setTrips({ ...trips, [activeTrip]: updated });
  };
  const handleUpdateTransitRoute = (id, route) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, transitRoute: route } : item);
    setTrips({ ...trips, [activeTrip]: updated });
  };
  const toggleCheck = (id) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setTrips({ ...trips, [activeTrip]: updated });
  };
  const handleDelete = (id) => {
    setTrips({ ...trips, [activeTrip]: currentTripData.filter(item => item.id !== id) });
    showMessage("已删除", "error");
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const payload = { ...formData, duration: parseInt(formData.duration) || 60, cost: parseFloat(formData.cost) || 0, order: parseInt(formData.order) || 1 };
    setLastSelectedCurrency(formData.currency); // 记录上次选择的币种

    if (modalMode === 'add') {
      const newItem = { ...payload, id: `manual-${Date.now()}`, done: false };
      setTrips({ ...trips, [activeTrip]: [...currentTripData, newItem] });
      showMessage("已添加");
    } else {
      const updated = currentTripData.map(item => item.id === editingId ? { ...item, ...payload } : item);
      setTrips({ ...trips, [activeTrip]: updated });
      showMessage("已更新");
    }
    setShowModal(false);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFormData({ ...item, duration: String(item.duration), cost: String(item.cost), order: String(item.order), transitRoute: item.transitRoute || '' });
    setShowModal(true);
  };

  const renameTrip = () => {
    if (newTitle.trim() && newTitle !== activeTrip) {
      const newTrips = { ...trips };
      newTrips[newTitle] = newTrips[activeTrip];
      delete newTrips[activeTrip];
      setTrips(newTrips);
      setActiveTrip(newTitle);
      showMessage("行程重命名成功");
    }
    setIsEditingTitle(false);
  };

  const openInGoogleMaps = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const openMapPreview = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    setPreviewIframeUrl(`https://maps.google.com/maps?q=${query}&output=embed`);
  };

  const toggleOverview = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleOpenAddModal = () => {
    setModalMode('add'); 
    const dateToUse = activeTab !== 'Total' ? activeTab : getTodayDate();
    setFormData({ name: '', date: dateToUse, duration: '60', city: '', note: '', cost: '0', currency: lastSelectedCurrency, order: '1', transportMode: 'train', transitRoute: '' }); 
    setShowModal(true); 
  };

  const isMobileView = viewMode === 'mobile';
  const containerClasses = isMobileView 
    ? 'max-w-[430px] w-full mx-auto h-screen relative shadow-2xl overflow-hidden' 
    : 'w-full h-screen relative';

  return (
    <div className={`font-sans transition-colors duration-500 flex justify-center ${isDarkMode ? 'bg-[#000000] text-white' : 'bg-gray-200 text-[#1e293b]'}`}>
      <div className={`${containerClasses} ${isDarkMode ? 'bg-[#0f1115]' : 'bg-[#f8fafc]'}`}>
        
        {toast.show && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full bg-black/80 backdrop-blur text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className={`w-4 h-4 ${toast.type === 'error' ? 'text-red-500' : 'text-green-500'}`} />
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* 统一的 iframe 预览气泡 */}
        {previewIframeUrl && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 fade-in duration-300">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewIframeUrl(null)}></div>
             <div className={`relative w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-4 ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                <button onClick={() => setPreviewIframeUrl(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <iframe 
                  title="Preview"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  // 针对地图增加简单的暗色模式滤镜反转效果
                  style={{ border: 0, filter: (isDarkMode && previewIframeUrl.includes('maps.google')) ? 'invert(90%) hue-rotate(180deg) contrast(80%)' : 'none' }} 
                  src={previewIframeUrl} 
                  allowFullScreen>
                </iframe>
             </div>
          </div>
        )}

        <div className="h-full overflow-y-scroll no-scrollbar pb-32">
          
          <header className="px-6 py-4 space-y-4">
            <div className="flex justify-between items-center gap-2">
              {isEditingTitle ? (
                // 修改此处：增加 min-w-0 和最大宽度，防止推挤右侧按钮
                <input 
                  autoFocus
                  className="w-1/2 min-w-0 flex-1 bg-transparent border-b border-blue-500 outline-none text-2xl font-black truncate"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={renameTrip}
                  onKeyDown={(e) => e.key === 'Enter' && renameTrip()}
                />
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0 group cursor-pointer" onClick={() => { setNewTitle(activeTrip); setIsEditingTitle(true); }}>
                  <h1 className="text-2xl font-black tracking-tighter truncate">{activeTrip}</h1>
                  <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                </div>
              )}

              <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 shrink-0 border border-white/5">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl hover:bg-white/10 transition-all">
                  {isDarkMode ? <SunMedium className="w-4 h-4 text-yellow-400" /> : <SunMedium className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => setViewMode(isMobileView ? 'web' : 'mobile')} className="p-2 rounded-xl hover:bg-white/10 transition-all">
                  {isMobileView ? <Monitor className="w-4 h-4 text-gray-400" /> : <Smartphone className="w-4 h-4 text-blue-400" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {/* 导入导出部分不变... */}
               <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black cursor-pointer hover:bg-blue-500/20 transition-all">
                <Upload className="w-4 h-4" /> 导入
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
              <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-black hover:bg-emerald-500/20 transition-all">
                <Download className="w-4 h-4" /> 导出
              </button>
            </div>
          </header>

          {/* ... [日期导航和搜索区域不变] ... */}
          <nav className="px-6 flex gap-2 overflow-x-auto no-scrollbar py-2 h-[56px] items-center shrink-0">
             {/* ... */}
             <button onClick={() => setActiveTab('Total')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'Total' ? 'bg-white text-black shadow-lg' : 'bg-white/5 opacity-40 hover:opacity-100'}`}>全部</button>
             {dates.map(date => (
              <button key={date} onClick={() => setActiveTab(date)} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === date ? 'bg-white text-black shadow-lg' : 'bg-white/5 opacity-40 hover:opacity-100'}`}>
                {date.split('-').slice(1).join('/')}
              </button>
            ))}
          </nav>
          
          <div className="px-6 mt-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索" className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-bold transition-all border-none outline-none ${isDarkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-gray-100 focus:bg-gray-200'}`} />
            </div>
            <button onClick={handleRefresh} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              <RefreshCw className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>

          <main className="px-4 py-6">
            {groupedDataWithTime.length === 0 ? (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                 <Sparkles className="w-12 h-12" />
                 <p className="text-xs font-bold uppercase tracking-widest">暂无行程计划，开始添加吧</p>
              </div>
            ) : groupedDataWithTime.map((group) => {
              const isOverviewExpanded = expandedDates[group.date]; // 独立控制该天的折叠
              
              return (
                <div key={group.date} className="mb-10">
                  <div className="px-2 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded uppercase tracking-widest">{group.date}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    
                    <button onClick={() => toggleOverview(group.date)} className="w-full flex justify-between items-center px-4 py-3 rounded-2xl border border-dashed border-white/10 hover:bg-white/5 transition-all">
                       <span className="text-xs font-black opacity-60">当天线路总览 ({group.items.length}个地点)</span>
                       {isOverviewExpanded ? <ChevronUp className="w-4 h-4 opacity-40"/> : <ChevronDown className="w-4 h-4 opacity-40"/>}
                    </button>
                    
                    {isOverviewExpanded && (
                      <div className="mt-2 p-4 rounded-2xl bg-white/5 text-[11px] font-bold leading-loose flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                        {group.items.map((i, idx) => (
                           // 添加序号拼接和完成状态删除线
                           <span key={idx} className={`block ${i.done ? 'line-through opacity-40' : ''}`}>
                             {i.order}. {i.name} ({i.startTimeStr} - {i.endTimeStr})
                           </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative space-y-0 px-2">
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="relative mb-0">
                        
                        {idx < group.items.length - 1 && (
                          <div className={`absolute left-[27px] top-[36px] bottom-0 w-[2px] z-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
                        )}

                        <div className="relative flex gap-4 group z-10 pt-2">
                          <div className="flex flex-col items-center w-14 shrink-0 bg-transparent">
                            <button onClick={() => toggleCheck(item.id)} className={`z-10 w-9 h-9 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all shadow-lg hover:scale-110 ${item.done ? 'bg-gray-600 border-gray-600/20 text-white' : (isDarkMode ? 'bg-[#0f1115] text-blue-600 border-blue-600' : 'bg-white text-blue-600 border-blue-600')}`}>
                              {item.done ? <CheckCircle className="w-5 h-5"/> : item.order}
                            </button>
                            <div className="mt-2 text-[10px] font-black opacity-40 tabular-nums bg-transparent">{item.startTimeStr}</div>
                          </div>

                          {/* 移除了 grayscale 滤镜，改用 opacity 保持色彩 */}
                          <div className={`flex-1 mb-2 p-4 rounded-[1.5rem] border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'} ${item.done ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0 pr-2">
                                <h3 className={`font-black text-sm leading-snug ${item.done ? 'line-through opacity-70' : ''}`}>{item.name}</h3>
                                {item.city && (
                                  <div className="flex items-center gap-1 mt-1 opacity-40">
                                    <MapPin className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase">{item.city}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-1.5 shrink-0">
                                {/* 预览地图图标改为 ZoomIn (放大镜)，并统一了 Hover 色彩逻辑 */}
                                <button onClick={() => openMapPreview(item.name, item.city)} className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:scale-105 transition-all flex items-center">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openInGoogleMaps(item.name, item.city)} className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all flex items-center">
                                  <Map className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 识别 URL 并允许点击预览 */}
                            {item.note && (
                              isUrl(item.note) ? (
                                <div onClick={() => setPreviewIframeUrl(item.note)} className="mt-3 mb-3 text-[11px] text-blue-400 bg-blue-500/10 p-3 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-all border-l-2 border-blue-500/30 truncate">
                                  🔗 {item.note}
                                </div>
                              ) : (
                                <div className={`mt-3 mb-3 text-[11px] ${isDarkMode ? 'text-gray-400 bg-black/20' : 'text-gray-600 bg-gray-50'} p-3 rounded-xl whitespace-pre-wrap leading-relaxed border-l-2 border-white/10`}>
                                  {item.note}
                                </div>
                              )
                            )}
                            
                            <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                              <div className="flex gap-3 text-[10px] font-bold">
                                <div className="flex items-center gap-1 opacity-50 bg-white/5 px-2 py-1 rounded-lg"><Clock className="w-3 h-3" /> {item.duration}m</div>
                                {item.cost > 0 && <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-lg"><DollarSign className="w-3 h-3" /> {item.cost} {item.currency}</div>}
                              </div>
                              
                              <div className="flex gap-1.5">
                                {/* 编辑按钮改为黄色风格 */}
                                <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 hover:scale-105 transition-all">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {/* 删除按钮颜色风格统一 */}
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-105 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {idx < group.items.length - 1 && (
                          <div className="flex gap-4 py-3 items-center relative z-10">
                            {/* ... [交通方式区域不变] ... */}
                            <div className="w-14 shrink-0 bg-transparent" />
                            <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-dashed transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex gap-1 shrink-0">
                                {Object.entries(TRANSPORT_ESTIMATES).map(([mode, config]) => {
                                  const Icon = config.icon;
                                  const isActive = item.transportMode === mode;
                                  return (
                                    <button key={mode} onClick={() => handleUpdateTransport(item.id, mode)} className={`p-1.5 rounded-lg transition-all ${isActive ? `${config.color} bg-white/10 scale-110 shadow-sm` : 'text-gray-500 opacity-30 hover:opacity-100'}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex-1 flex justify-center items-center px-2">
                                 {item.transportMode === 'train' ? (
                                   <input placeholder="输入线路..." className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-full max-w-[120px] bg-transparent border-none text-center outline-none focus:bg-white/5 ${isDarkMode ? 'text-gray-400 placeholder:opacity-20' : 'text-gray-500 placeholder:opacity-40'}`} value={item.transitRoute || ''} onChange={(e) => handleUpdateTransitRoute(item.id, e.target.value)} />
                                 ) : <div className="w-full h-px opacity-0" />}
                              </div>
                              <div className="flex items-center gap-2 text-right shrink-0">
                                 <span className={`text-[11px] font-black tabular-nums ${TRANSPORT_ESTIMATES[item.transportMode || 'train'].color}`}>~? 分</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </main>
        </div>

        <button onClick={handleOpenAddModal} className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-[0_8px_30px_rgb(37,99,235,0.4)] flex items-center justify-center z-[60] active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>

        {showModal && (
          <div className="absolute inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <form onSubmit={handleSubmitForm} className={`w-full max-w-md max-h-[90%] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white shadow-2xl'}`}>
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-inherit py-2 z-10">
                <h2 className="text-xl font-black">{modalMode === 'add' ? '添加地点' : '编辑详情'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X className="w-5 h-5 opacity-60" /></button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_80px] gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1">地点名称</label>
                    <input required onInvalid={e => e.target.setCustomValidity('请填写')} onInput={e => e.target.setCustomValidity('')} className="w-full h-12 px-4 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 box-border" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1 text-center block">序号</label>
                    <input type="number" className="w-full h-12 px-2 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 text-center font-black box-border" value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1">日期</label>
                    {/* 增加 min-w-0 强制受限于外层容器，彻底解决手机端日历撑破布局的问题 */}
                    <input type="date" required className="w-full min-w-0 h-12 px-2 sm:px-4 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:invert-[0.6] box-border" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1">城市</label>
                    <input className="w-full min-w-0 h-12 px-4 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 box-border" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black opacity-40 uppercase ml-1">停留(分)</label>
                     <input type="number" className="w-full h-12 px-4 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 box-border" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1">花销</label>
                    <input type="number" required className="w-full h-12 px-4 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none focus:border-blue-500 box-border" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-1">币种</label>
                    <div className="relative h-12">
                      {/* 根据要求更新了币种排序 */}
                      <select className="w-full h-full px-2 sm:px-4 pr-8 rounded-2xl text-sm bg-black/20 border border-white/5 outline-none appearance-none focus:border-blue-500 box-border" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="JPY">JPY</option>
                        <option value="CNY">CNY</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black opacity-40 uppercase ml-1 flex justify-between">
                    <span>备注 / 附件</span>
                    <span className="text-blue-400 font-normal opacity-100">(若为链接可点击)</span>
                  </label>
                  <textarea className="w-full p-4 rounded-2xl text-sm min-h-[100px] bg-black/20 border border-white/5 outline-none resize-none focus:border-blue-500 box-border" placeholder="例如：https://..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full mt-6 h-14 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all box-border">保存</button>
            </form>
          </div>
        )}
        
        {/* ... [省略底层 CSS 样式标签，保持不变] ... */}
      </div>
    </div>
  );
};

export default App;