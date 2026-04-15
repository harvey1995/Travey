import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, Download, Plus, Search, CheckCircle, Clock, DollarSign, 
  SunMedium, Smartphone, Monitor, Trash2, Pencil, Map, X, Sparkles,
  MapPin, Footprints, Car, Train, ChevronRight, RefreshCw, 
  ChevronDown, ChevronUp, Edit2, AlertTriangle, CloudRain, ZoomIn,
  Undo2, Redo2, Cloud // 引入 Cloud 图标
} from 'lucide-react';

// --- 配置 API KEYS ---
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFmMWMxM2NlYTUwOTQxZDJiYzIzYWVhMzY1YzFmN2ZkIiwiaCI6Im11cm11cjY0In0=';
const WEATHER_API_KEY = '9421165d458f483f88d15158261504';

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
  walk: { label: '步行', icon: Footprints, color: 'text-orange-400', alert: null, orsProfile: 'foot-walking' },
  car: { label: '打车', icon: Car, color: 'text-blue-400', alert: '可能拥堵', orsProfile: 'driving-car' },
  train: { label: '公交', icon: Train, color: 'text-green-400', alert: null, orsProfile: 'driving-car' } // ORS没有公交，降级使用驾车时间供参考
};

const TOKYO_TRIP = [
  { date: "2025-12-31", id: "tokyo-1", city: "Tokyo", name: "涩谷十字路口", duration: 60, note: "感受世界最繁忙的交叉路口", cost: 0, currency: "JPY", done: true, order: 1, transportMode: 'train', transitRoute: '山手线' },
  { date: "2025-12-31", id: "tokyo-2", city: "Tokyo", name: "SHIBUYA SKY", duration: 90, note: "https://www.shibuya-scramble-square.com/sky/", cost: 2500, currency: "JPY", done: false, order: 2, transportMode: 'walk', transitRoute: '' },
  { date: "2025-12-31", id: "tokyo-3", city: "Tokyo", name: "明治神宫", duration: 120, note: "体验日本传统跨年参拜", cost: 0, currency: "JPY", done: false, order: 3, transportMode: 'train', transitRoute: '半藏门线' }
];

const INITIAL_TRIPS = { "东京跨年3日游": TOKYO_TRIP };

const App = () => {
  // 基础状态
  const [trips, setTrips] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travey_data_v1');
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_TRIPS;
  });

  const [activeTrip, setActiveTrip] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem('travey_active_v1');
      return savedActive && trips[savedActive] ? savedActive : Object.keys(trips)[0] || "东京跨年3日游";
    }
    return "东京跨年3日游";
  });

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // 新增 API 缓存状态
  const [weatherData, setWeatherData] = useState({});
  const [routeEstimates, setRouteEstimates] = useState({});

  const updateTrips = (newTrips) => {
    setPast(p => [...p, trips].slice(-20)); 
    setFuture([]);
    setTrips(newTrips);
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setFuture(f => [trips, ...f]);
    setTrips(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, trips]);
    setTrips(next);
  };

  useEffect(() => {
    localStorage.setItem('travey_data_v1', JSON.stringify(trips));
    localStorage.setItem('travey_active_v1', activeTrip);
  }, [trips, activeTrip]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [activeTab, setActiveTab] = useState("Total"); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState('web'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
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
        // 尝试从 API 缓存中获取真实的交通耗时，如果没有则默认为 0
        const routeKey = `${prevItem.id}_${item.id}`;
        const travelTime = routeEstimates[routeKey] || 0; 
        
        const [h, m] = prevItem.endTimeStr.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m + travelTime);
        arrivalTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
  }, [sanitizedTripData, activeTab, searchQuery, routeEstimates]);

  // --- API 获取功能：天气 ---
  useEffect(() => {
    groupedDataWithTime.forEach(group => {
      if (group.items.length > 0) {
        const firstCity = group.items[0].city;
        const targetDate = group.date;
        if (firstCity && !weatherData[targetDate]) {
          fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${firstCity}&dt=${targetDate}`)
            .then(res => res.json())
            .then(data => {
              if (data.forecast && data.forecast.forecastday[0]) {
                const dayWeather = data.forecast.forecastday[0].day;
                setWeatherData(prev => ({
                  ...prev,
                  [targetDate]: { temp: Math.round(dayWeather.avgtemp_c), condition: dayWeather.condition.text }
                }));
              }
            }).catch(err => console.log("Weather API limit or error:", err));
        }
      }
    });
  }, [groupedDataWithTime]); // 仅在分组数据更新时触发

  // --- API 获取功能：交通时间 (点击触发以免超出配额) ---
  const fetchRouteEstimate = async (prevItem, nextItem) => {
    const routeKey = `${prevItem.id}_${nextItem.id}`;
    if (routeEstimates[routeKey]) return; // 已缓存

    try {
      showMessage("正在计算路线...");
      // 1. Geocode 起点和终点
      const getCoords = async (name, city) => {
        const res = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(name + ' ' + city)}`);
        const data = await res.json();
        return data.features[0].geometry.coordinates; // [lon, lat]
      };

      const startCoords = await getCoords(prevItem.name, prevItem.city || '');
      const endCoords = await getCoords(nextItem.name, nextItem.city || '');

      // 2. 获取路程时间
      const profile = TRANSPORT_ESTIMATES[prevItem.transportMode || 'train'].orsProfile;
      const routeRes = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_API_KEY}&start=${startCoords.join(',')}&end=${endCoords.join(',')}`);
      const routeData = await routeRes.json();
      
      const durationMins = Math.round(routeData.features[0].properties.summary.duration / 60);
      setRouteEstimates(prev => ({ ...prev, [routeKey]: durationMins }));
      showMessage("路线耗时已更新");
    } catch (error) {
      console.error(error);
      showMessage("路线计算失败(请检查地点名)", "error");
    }
  };

  // 生成天数总览地图 URL
  const generateOverviewMapUrl = (items) => {
    if (items.length === 0) return null;
    const origin = `${items[0].name} ${items[0].city || ''}`;
    if (items.length === 1) return `https://maps.google.com/maps?q=${encodeURIComponent(origin)}&output=embed`;
    
    const dest = `${items[items.length - 1].name} ${items[items.length - 1].city || ''}`;
    let waypoints = '';
    if (items.length > 2) {
      waypoints = items.slice(1, -1).map(i => `+to:${encodeURIComponent(i.name + ' ' + (i.city||''))}`).join('');
    }
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}${waypoints}&output=embed`;
  };

  const handleUpdateTransport = (id, mode) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, transportMode: mode } : item);
    updateTrips({ ...trips, [activeTrip]: updated });
  };

  const handleUpdateTransitRoute = (id, route) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, transitRoute: route } : item);
    updateTrips({ ...trips, [activeTrip]: updated });
  };

  const toggleCheck = (id) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, done: !item.done } : item);
    updateTrips({ ...trips, [activeTrip]: updated });
  };

  const handleDelete = (id) => {
    updateTrips({ ...trips, [activeTrip]: currentTripData.filter(item => item.id !== id) });
    showMessage("已保存", "error");
  };

  const openMapPreview = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    setPreviewIframeUrl(`https://maps.google.com/maps?q=${query}&output=embed`);
  };

  const toggleOverview = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const isMobileView = viewMode === 'mobile';
  const bodyColor = isDarkMode ? 'bg-[#000000] text-white' : 'bg-[#e8e4d9] text-[#2c241b]';
  const containerColor = isDarkMode ? 'bg-[#0f1115]' : 'bg-[#fdfbf7]';
  
  const containerClasses = isMobileView 
    ? `max-w-[430px] w-full mx-auto h-screen relative shadow-2xl overflow-hidden ${containerColor}` 
    : `w-full h-screen relative ${containerColor}`;

  // 优化后的深色地图滤镜方案
  const darkMapFilter = 'invert(85%) hue-rotate(180deg) brightness(0.85) contrast(1.1) sepia(10%)';

  return (
    <div className={`font-sans transition-colors duration-500 flex justify-center ${bodyColor}`}>
      <div className={containerClasses}>
        
        {toast.show && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full bg-black/80 backdrop-blur text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className={`w-4 h-4 ${toast.type === 'error' ? 'text-red-500' : 'text-green-500'}`} />
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* 全局 Iframe 气泡预览 (单地点) */}
        {previewIframeUrl && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 fade-in duration-300">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewIframeUrl(null)}></div>
             <div className={`relative w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-4 ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                <button onClick={() => setPreviewIframeUrl(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <iframe 
                  title="Preview" width="100%" height="100%" frameBorder="0" 
                  style={{ border: 0, filter: isDarkMode ? darkMapFilter : 'none' }} 
                  src={previewIframeUrl} allowFullScreen>
                </iframe>
             </div>
          </div>
        )}

        <div className="h-full overflow-y-scroll no-scrollbar pb-32">
          {/* Header & Nav 省略了大部分无需改动的代码，主要增加天气展示 */}
          <nav className="px-6 flex gap-2 overflow-x-auto no-scrollbar min-h-[60px] items-center shrink-0 mt-4">
            <button onClick={() => setActiveTab('Total')} className={`relative flex items-center justify-center h-[40px] px-5 rounded-xl text-xs font-black transition-all ${activeTab === 'Total' ? (isDarkMode ? 'bg-white text-black shadow-lg' : 'bg-gray-800 text-white shadow-lg') : 'bg-transparent border border-gray-300 dark:border-white/10 opacity-50 hover:opacity-100'}`}>全部</button>
            {dates.map(date => {
              const dayWeather = weatherData[date];
              return (
                <button key={date} onClick={() => setActiveTab(date)} className={`relative flex items-center justify-center h-[40px] px-4 rounded-xl text-xs font-black transition-all ${activeTab === date ? (isDarkMode ? 'bg-white text-black shadow-lg' : 'bg-gray-800 text-white shadow-lg') : 'bg-transparent border border-gray-300 dark:border-white/10 opacity-50 hover:opacity-100'}`}>
                  {date.split('-').slice(1).join('/')}
                  {/* 天气 API 展示 */}
                  {dayWeather && (
                     <span className="flex items-center text-blue-500 bg-blue-100/20 px-1 py-0.5 rounded text-[10px] ml-1">
                       <Cloud className="w-3 h-3 mr-0.5"/> {dayWeather.temp}°
                     </span>
                  )}
                </button>
              )
            })}
          </nav>

          <main className="px-4 py-6">
            {groupedDataWithTime.length === 0 ? (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                 <Sparkles className="w-12 h-12" />
                 <p className="text-xs font-bold uppercase tracking-widest">暂无行程计划，开始添加吧</p>
              </div>
            ) : groupedDataWithTime.map((group) => {
              const isOverviewExpanded = expandedDates[group.date]; 
              
              return (
                <div key={group.date} className="mb-10">
                  <div className="px-2 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-500 dark:text-blue-400 rounded uppercase tracking-widest">{group.date}</span>
                      <div className={`h-px flex-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-300'}`} />
                    </div>
                    
                    <button onClick={() => toggleOverview(group.date)} className={`w-full flex justify-between items-center px-4 py-3 rounded-2xl border border-dashed transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-white bg-white/50'}`}>
                       <span className="text-xs font-black opacity-60">当天线路总览 ({group.items.length}个地点)</span>
                       {isOverviewExpanded ? <ChevronUp className="w-4 h-4 opacity-40"/> : <ChevronDown className="w-4 h-4 opacity-40"/>}
                    </button>
                    
                    {/* 新增功能：当天线路下拉中的地图总览 */}
                    {isOverviewExpanded && (
                      <div className={`mt-2 p-4 rounded-2xl text-[11px] font-bold leading-loose flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                        {/* 地图 Iframe */}
                        <div className="w-full h-48 rounded-xl overflow-hidden mb-2 border border-black/10 dark:border-white/10 relative bg-gray-100 dark:bg-gray-800">
                           <iframe 
                             title="Day Overview Route" width="100%" height="100%" frameBorder="0" 
                             style={{ border: 0, filter: isDarkMode ? darkMapFilter : 'none' }} 
                             src={generateOverviewMapUrl(group.items)} allowFullScreen>
                           </iframe>
                        </div>

                        {group.items.map((i, idx) => (
                           <span key={idx} className={`block ${i.done ? 'line-through opacity-40' : ''}`}>
                             {i.order}. {i.name} ({i.startTimeStr} - {i.endTimeStr})
                           </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative space-y-0 px-2">
                    {group.items.map((item, idx) => {
                      const nextItem = group.items[idx + 1];
                      const routeKey = nextItem ? `${item.id}_${nextItem.id}` : null;
                      const calculatedTime = routeKey && routeEstimates[routeKey];

                      return (
                        <div key={item.id} className="relative mb-0">
                          {idx < group.items.length - 1 && (
                            <div className={`absolute left-[27px] top-[36px] bottom-0 w-[2px] z-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                          )}

                          <div className="relative flex gap-4 group z-10 pt-2">
                             {/* 原地点展示 UI，略 */}
                             <div className="flex flex-col items-center w-14 shrink-0 bg-transparent">
                              <button onClick={() => toggleCheck(item.id)} className={`z-10 w-9 h-9 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all shadow-lg hover:scale-110 ${item.done ? 'bg-gray-500 border-gray-500/20 text-white' : (isDarkMode ? 'bg-[#0f1115] text-blue-500 border-blue-500' : 'bg-[#fdfbf7] text-blue-600 border-blue-500')}`}>
                                {item.done ? <CheckCircle className="w-5 h-5"/> : item.order}
                              </button>
                              <div className="mt-2 text-[10px] font-black opacity-50 tabular-nums bg-transparent">{item.startTimeStr}</div>
                            </div>
                            
                            <div className={`flex-1 mb-2 p-4 rounded-[1.5rem] border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'} ${item.done ? 'opacity-50' : ''}`}>
                              <h3 className={`font-black text-sm leading-snug ${item.done ? 'line-through opacity-70' : ''}`}>{item.name}</h3>
                              {/* 省略中间同样的展示代码 */}
                            </div>
                          </div>

                          {idx < group.items.length - 1 && (
                            <div className="flex gap-4 py-3 items-center relative z-10">
                              <div className="w-14 shrink-0 bg-transparent" />
                              <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-dashed transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white shadow-sm border-gray-300'}`}>
                                <div className="flex gap-1 shrink-0">
                                  {Object.entries(TRANSPORT_ESTIMATES).map(([mode, config]) => {
                                    const isActive = item.transportMode === mode;
                                    const Icon = config.icon;
                                    return (
                                      <button key={mode} onClick={() => handleUpdateTransport(item.id, mode)} className={`p-1.5 rounded-lg transition-all ${isActive ? `${config.color} ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'} scale-110 shadow-sm` : 'text-gray-500 opacity-40 hover:opacity-100'}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex-1 flex justify-center items-center px-2">
                                   {item.transportMode === 'train' ? (
                                     <input placeholder="输入线路..." className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-full max-w-[120px] bg-transparent border-none text-center outline-none focus:bg-white/5 ${isDarkMode ? 'text-gray-400 placeholder:opacity-20' : 'text-gray-600 placeholder:opacity-40'}`} value={item.transitRoute || ''} onChange={(e) => handleUpdateTransitRoute(item.id, e.target.value)} />
                                   ) : <div className="w-full h-px opacity-0" />}
                                </div>
                                <div className="flex items-center gap-2 text-right shrink-0 cursor-pointer" onClick={() => fetchRouteEstimate(item, nextItem)}>
                                   {/* 点击这里触发 API 获取耗时 */}
                                   {TRANSPORT_ESTIMATES[item.transportMode || 'train'].alert && (
                                     <span className="text-[8px] flex items-center text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded"><AlertTriangle className="w-2 h-2 mr-0.5"/>拥堵</span>
                                   )}
                                   {calculatedTime !== undefined ? (
                                     <span className={`text-[11px] font-black tabular-nums ${TRANSPORT_ESTIMATES[item.transportMode || 'train'].color}`}>{calculatedTime} 分</span>
                                   ) : (
                                     <span className={`text-[11px] font-black tabular-nums border border-dashed border-current px-1.5 py-0.5 rounded ${TRANSPORT_ESTIMATES[item.transportMode || 'train'].color} hover:bg-current/10`}>算耗时</span>
                                   )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;