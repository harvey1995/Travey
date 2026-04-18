import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, Download, Plus, Search, CheckCircle, Clock, DollarSign, 
  SunMedium, Smartphone, Monitor, Trash2, Pencil, Map, X, Sparkles,
  MapPin, Footprints, Car, Train, ChevronRight, RefreshCw, 
  ChevronDown, ChevronUp, Edit2, AlertTriangle, CloudRain, ZoomIn,
  Undo2, Redo2, Moon, Star, ExternalLink, Locate, SquarePen, NotebookPen,
  MapPinCheckInside, MapPinXInside, MapPinMinus, MapPinPlus
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
  car: { label: '打车', icon: Car, lightClass: 'text-orange-600 bg-orange-100 hover:bg-orange-200', darkClass: 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20', alert: '可能拥堵' },
  train: { label: '公交', icon: Train, lightClass: 'text-red-600 bg-red-100 hover:bg-red-200', darkClass: 'text-red-400 bg-red-500/10 hover:bg-red-500/20', alert: null },
  walk: { label: '步行', icon: Footprints, lightClass: 'text-blue-600 bg-blue-100 hover:bg-blue-200', darkClass: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20', alert: null }
};

const TOKYO_TRIP = [
  { date: "2025-12-31", id: "tokyo-1", city: "Tokyo", name: "涩谷十字路口", duration: 60, note: "感受世界最繁忙的交叉路口，看跨年倒计时准备", cost: 0, currency: "JPY", done: true, order: 1, transportMode: 'train', transitRoute: '山手线' },
  { date: "2025-12-31", id: "tokyo-2", city: "Tokyo", name: "SHIBUYA SKY", duration: 90, note: "https://www.shibuya-scramble-square.com/sky/", cost: 2500, currency: "JPY", done: false, order: 2, transportMode: 'walk', transitRoute: '' },
  { date: "2025-12-31", id: "tokyo-3", city: "Tokyo", name: "明治神宫", duration: 120, note: "参加「初诣」，体验日本传统跨年参拜", cost: 0, currency: "JPY", done: false, order: 3, transportMode: 'train', transitRoute: '半藏门线' },
  { date: "2026-01-01", id: "tokyo-4", city: "Tokyo", name: "浅草寺", duration: 120, note: "求御守，吃人形烧，看元旦仲见世商店街", cost: 1000, currency: "JPY", done: false, order: 1, transportMode: 'train', transitRoute: '银座线' },
  { date: "2026-01-01", id: "tokyo-5", city: "Tokyo", name: "上野恩赐公园", duration: 180, note: "漫步博物馆群，呼吸新年第一份新鲜空气", cost: 0, currency: "JPY", done: false, order: 2, transportMode: 'walk', transitRoute: '' },
  { date: "2026-01-02", id: "tokyo-6", city: "Tokyo", name: "丰洲市场", duration: 120, note: "吃最正宗的寿司早餐，看金枪鱼拍卖展示", cost: 5000, currency: "JPY", done: false, order: 1, transportMode: 'train', transitRoute: '百合鸥号' },
  { date: "2026-01-02", id: "tokyo-7", city: "Tokyo", name: "银座", duration: 240, note: "新年大特卖「福袋」抢购，买伴手礼", cost: 20000, currency: "JPY", done: false, order: 2, transportMode: 'train', transitRoute: '' },
];

const INITIAL_TRIPS = { "东京跨年三日游": TOKYO_TRIP };

const App = () => {
  // 1. 数据与缓存
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
      return savedActive && trips[savedActive] ? savedActive : Object.keys(trips)[0] || "东京跨年三日游";
    }
    return "东京跨年三日游";
  });

  // 2. 撤销/重做引擎
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const updateTrips = (newTrips, newActiveTrip = activeTrip) => {
    setPast(p => [...p, { trips, activeTrip }].slice(-20));
    setFuture([]);
    setTrips(newTrips);
    if (newActiveTrip !== activeTrip) {
      setActiveTrip(newActiveTrip);
    }
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setFuture(f => [{ trips, activeTrip }, ...f]);
    setTrips(previous.trips);
    setActiveTrip(previous.activeTrip);
    showMessage("已撤销", "undo");
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, { trips, activeTrip }]);
    setTrips(next.trips);
    setActiveTrip(next.activeTrip);
    showMessage("已重做", "redo");
  };

  const restoreZoom = () => {
    if (typeof document !== 'undefined') {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      const originalContent = meta.content;
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      setTimeout(() => {
        meta.content = originalContent || 'width=device-width, initial-scale=1.0';
      }, 300);
    }
  };

  useEffect(() => {
    localStorage.setItem('travey_data_v1', JSON.stringify(trips));
    localStorage.setItem('travey_active_v1', activeTrip);
  }, [trips, activeTrip]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [activeTab, setActiveTab] = useState("Total"); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSwitchingTheme, setIsSwitchingTheme] = useState(false);
  const [viewMode, setViewMode] = useState('web'); 
  const [isNarrow, setIsNarrow] = useState(false);
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
    name: '', date: getTodayDate(), duration: '60', city: '', note: '', cost: '', currency: '', order: '1', transportMode: 'walk', transitRoute: '' 
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [weatherData, setWeatherData] = useState({});

  const [dailyStartTimes, setDailyStartTimes] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travey_start_times_v1');
      if (saved) return JSON.parse(saved);
    }
    return {};
  });

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEditData, setTimeEditData] = useState({ date: '', time: '08:00' });

  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportEditId, setTransportEditId] = useState(null);
  const [transportEditDuration, setTransportEditDuration] = useState('');

  useEffect(() => {
    localStorage.setItem('travey_start_times_v1', JSON.stringify(dailyStartTimes));
  }, [dailyStartTimes]);

  const showMessage = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleRefresh = () => {
    showMessage("已刷新", "refresh");
  };

  const handleLocate = () => {
    const getAllGroupedData = (tabName) => {
      const sorted = [...(trips[activeTrip] || [])].map(item => ({ ...item, date: sanitizeDate(item.date) })).sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        return (a.order || 0) - (b.order || 0);
      });
      const groups = {};
      sorted.forEach(item => {
        if (!groups[item.date]) groups[item.date] = { date: item.date, items: [] };
        groups[item.date].items.push(item);
      });
      let result = Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (tabName !== "Total") result = result.filter(g => g.date === tabName);
      return result;
    };

    const currentTabGroups = getAllGroupedData(activeTab);
    for (const group of currentTabGroups) {
      for (const [idx, item] of group.items.entries()) {
        if (!item.done) {
          scrollToElement(`card-${item.id}`);
          return;
        }
        if (idx < group.items.length - 1 && !item.transportDone) {
          scrollToElement(`transport-${item.id}`);
          return;
        }
      }
    }

    const allGroups = getAllGroupedData("Total");
    for (const group of allGroups) {
      for (const [idx, item] of group.items.entries()) {
        if (!item.done) {
          setActiveTab(group.date);
          setTimeout(() => scrollToElement(`card-${item.id}`), 100);
          return;
        }
        if (idx < group.items.length - 1 && !item.transportDone) {
          setActiveTab(group.date);
          setTimeout(() => scrollToElement(`transport-${item.id}`), 100);
          return;
        }
      }
    }

    showMessage("已全部打卡", "allDone");
  };

  const scrollToElement = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - (window.innerHeight * 0.3);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const handleThemeToggle = () => {
    setIsSwitchingTheme(true);
    setIsDarkMode(!isDarkMode);
    setTimeout(() => {
      setIsSwitchingTheme(false);
    }, 500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => setIsNarrow(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      
      const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setViewMode(isMobile ? 'mobile' : 'web');
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (showModal && modalMode === 'add') {
      const currentTripData = trips[activeTrip] || [];
      const sameDayItems = currentTripData.filter(item => sanitizeDate(item.date) === formData.date);
      const maxOrder = sameDayItems.reduce((max, item) => Math.max(max, parseInt(item.order) || 0), 0);
      setFormData(prev => ({ ...prev, order: String(maxOrder + 1) }));
    }
  }, [formData.date, showModal, modalMode, activeTrip, trips]);

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
      if (!groups[cleanDate]) groups[cleanDate] = { date: cleanDate, items: [], startTime: dailyStartTimes[activeTrip]?.[cleanDate] || "08:00" };
      
      const dayItems = groups[cleanDate].items;
      let arrivalTime = groups[cleanDate].startTime;

      if (dayItems.length > 0) {
        const prevItem = dayItems[dayItems.length - 1];
        const travelTime = prevItem.transportDuration || 0; 
        const [h, m] = prevItem.endTimeStr.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m + travelTime);
        arrivalTime = isNaN(date.getTime()) ? '--:--' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        prevItem.nextTravelTime = "?";
      }

      const [hours, minutes] = arrivalTime.split(':').map(Number);
      const startDate = new Date(2000, 0, 1, hours, minutes);
      const endDate = new Date(startDate.getTime() + (item.duration || 0) * 60000);
      const endTimeStr = isNaN(endDate.getTime()) ? '--:--' : `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
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
  }, [sanitizedTripData, activeTab, searchQuery, dailyStartTimes, activeTrip]);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      const updates = {};
      let hasNew = false;
      for (const g of groupedDataWithTime) {
        if (weatherData[g.date] === undefined && g.items[0]?.city) {
          hasNew = true;
          try {
            const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=9421165d458f483f88d15158261504&q=${g.items[0].city}&dt=${g.date}&lang=zh`);
            const data = await res.json();
            if (data?.forecast?.forecastday?.[0]) {
              const day = data.forecast.forecastday[0].day;
              updates[g.date] = `${day.condition.text} ${day.maxtemp_c}℃~${day.mintemp_c}℃`;
            } else {
              updates[g.date] = "暂无当日天气预报";
            }
          } catch {
            updates[g.date] = "暂无当日天气预报";
          }
        }
      }
      if (hasNew && isMounted) {
        setWeatherData(prev => ({ ...prev, ...updates }));
      }
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, [activeTab]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const isModalOpen = previewIframeUrl || showModal || showTimeModal || showTransportModal || showImportModal;
    
    if (isModalOpen) {
      const currentScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${currentScrollY}px`;
      document.body.style.overflow = 'hidden';
      
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      };
    }
  }, [previewIframeUrl, showModal, showTimeModal, showTransportModal, showImportModal]);

  useEffect(() => {
    setPreviewIframeUrl(prev => {
      if (prev && prev.includes('google.com/search')) {
        try {
          const urlObj = new URL(prev);
          urlObj.searchParams.set('cs', isDarkMode ? '1' : '0');
          return urlObj.toString();
        } catch (e) {
          return prev;
        }
      }
      return prev;
    });
  }, [isDarkMode]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(event.target.result));
        const rows = text.split(/\r?\n/).filter(row => row.trim());
        const headerRow = rows[0].split(',').map(h => h.trim());
        
        const colMap = {
          date: headerRow.indexOf("日期"),
          order: headerRow.indexOf("序号"),
          city: headerRow.indexOf("城市/交通"),
          name: headerRow.indexOf("地点名称/出行方式"),
          duration: headerRow.indexOf("时间（分）"),
          note: headerRow.indexOf("备注"),
          cost: headerRow.indexOf("费用"),
          currency: headerRow.indexOf("币种"),
          status: headerRow.indexOf("打卡状态")
        };

        const missing = [];
        if (colMap.date === -1) missing.push("日期");
        if (colMap.name === -1) missing.push("地点名称");
        if (missing.length > 0) {
          showMessage(`缺少${missing.join('、')}`, "error");
          return;
        }

        const rawImported = [];
        rows.slice(1).forEach((row, index) => {
          const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
          const getVal = (col) => col !== -1 ? (values[col] || "") : "";
          
          rawImported.push({
            date: sanitizeDate(getVal(colMap.date)),
            order: parseInt(getVal(colMap.order)),
            city: getVal(colMap.city),
            name: getVal(colMap.name),
            duration: getVal(colMap.duration) === "" ? null : (parseInt(getVal(colMap.duration)) || 0),
            note: getVal(colMap.note) || null,
            cost: getVal(colMap.cost) === "" ? null : (parseFloat(getVal(colMap.cost)) || 0),
            currency: getVal(colMap.currency) || null,
            done: getVal(colMap.status) === "是"
          });
        });

        const finalData = [];
        const dataByDate = {};
        rawImported.forEach(item => {
          if (!dataByDate[item.date]) dataByDate[item.date] = [];
          dataByDate[item.date].push(item);
        });

        Object.keys(dataByDate).forEach(date => {
          const dayItems = dataByDate[date];
          let locationCounter = 1;
          dayItems.forEach((row, idx) => {
            const isTransport = row.city === "交通" || (row.name && (row.name.includes("步行") || row.name.includes("公交") || row.name.includes("打车")));
            
            if (isTransport) {
              if (finalData.length > 0) {
                const last = finalData[finalData.length - 1];
                if (row.name.includes("打车")) last.transportMode = 'car';
                else if (row.name.includes("公交")) last.transportMode = 'train';
                else last.transportMode = 'walk';
                last.transportDuration = row.duration || 0;
              }
            } else {
              if (finalData.length > 0) {
                const last = finalData[finalData.length - 1];
                if (last.date === row.date && last.transportDuration === undefined) {
                  last.transportMode = 'walk';
                  last.transportDuration = 0;
                }
              }
              finalData.push({
                ...row,
                id: `imported-${Date.now()}-${idx}`,
                order: locationCounter++,
                duration: row.duration === null ? 0 : row.duration,
                transportMode: 'walk',
                transportDuration: 0,
                transitRoute: '',
                done: row.done || false
              });
            }
          });
        });
        
        if (finalData.length > 0) {
          setPendingImportData(finalData);
          setShowImportModal(true); 
        } else {
          showMessage("无有效地点", "emptyImport");
        }
      } catch (err) {
        showMessage(`格式解析失败`, "importError");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const confirmImport = (mode) => {
    if (mode === 'overwrite') {
      updateTrips({ ...trips, [activeTrip]: pendingImportData });
    } else {
      updateTrips({ ...trips, [activeTrip]: [...(currentTripData || []), ...pendingImportData] });
    }
    setShowImportModal(false);
    setPendingImportData([]);
    showMessage("导入成功", "import");
  };

  const handleExport = () => {
    const headers = ["日期", "序号", "城市/交通", "地点名称/出行方式", "时间（分）", "备注", "费用", "币种", "打卡状态"];
    
    const exportGroups = {};
    sanitizedTripData.sort((a,b) => new Date(a.date) - new Date(b.date) || a.order - b.order).forEach(item => {
       if (!exportGroups[item.date]) exportGroups[item.date] = [];
       exportGroups[item.date].push(item);
    });
    
    const exportRows = [];
    Object.values(exportGroups).forEach(groupItems => {
       groupItems.forEach((item, idx) => {
          exportRows.push([
            item.date, item.order, item.city || "", `"${(item.name || "").replace(/"/g, '""')}"`, item.duration || 0, `"${(item.note || "").replace(/"/g, '""')}"`, item.cost || "", item.cost ? (item.currency || "") : "", item.done ? "是" : "否"
          ].join(','));
          if (idx < groupItems.length - 1) {
            const modeLabel = TRANSPORT_ESTIMATES[item.transportMode || 'walk'].label;
            exportRows.push([
              item.date, 0, "交通", modeLabel, item.transportDuration || 0, '""', "", "", item.transportDone ? "是" : "否"
            ].join(','));
          }
       });
    });

    const csvContent = [
      headers.join(','),
      ...exportRows
    ].join('\n');
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTrip}_${getTodayDate()}.csv`;
    link.click();
    showMessage("导出成功", "export");
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
    const idx = currentTripData.findIndex(item => item.id === id);
    if (idx === -1) return;
    const newDone = !currentTripData[idx].done;
    let updated = currentTripData.map(item => item.id === id ? { ...item, done: newDone } : item);
    if (newDone) {
      const item = updated[idx];
      const sameDay = updated.filter(i => i.date === item.date).sort((a,b) => (a.order||0) - (b.order||0));
      const subIdx = sameDay.findIndex(i => i.id === id);
      const prev = sameDay[subIdx - 1];
      const next = sameDay[subIdx + 1];
      if (prev && prev.done) updated = updated.map(i => i.id === prev.id ? { ...i, transportDone: true } : i);
      if (next && next.done) updated = updated.map(i => i.id === item.id ? { ...i, transportDone: true } : i);
    } else {
      const item = updated[idx];
      const sameDay = updated.filter(i => i.date === item.date).sort((a,b) => (a.order||0) - (b.order||0));
      const subIdx = sameDay.findIndex(i => i.id === id);
      const prev = sameDay[subIdx - 1];
      if (prev) updated = updated.map(i => i.id === prev.id ? { ...i, transportDone: false } : i);
      updated = updated.map(i => i.id === item.id ? { ...i, transportDone: false } : i);
    }
    updateTrips({ ...trips, [activeTrip]: updated });
  };

  const toggleTransportCheck = (id) => {
    const updated = currentTripData.map(item => item.id === id ? { ...item, transportDone: !item.transportDone } : item);
    updateTrips({ ...trips, [activeTrip]: updated });
  };

  const handleDelete = (id) => {
    const remainingItems = currentTripData.filter(item => item.id !== id).map(item => ({...item}));
    
    const groupedByDate = {};
    remainingItems.forEach(item => {
      if (!groupedByDate[item.date]) groupedByDate[item.date] = [];
      groupedByDate[item.date].push(item);
    });
    
    Object.keys(groupedByDate).forEach(date => {
      groupedByDate[date].sort((a, b) => parseInt(a.order || 0) - parseInt(b.order || 0));
      let counter = 1;
      groupedByDate[date].forEach(item => {
        if (parseInt(item.order) !== 0) {
          item.order = counter++;
        }
      });
    });
    
    updateTrips({ ...trips, [activeTrip]: remainingItems });
    showMessage("已删除", "delete");
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      duration: formData.duration === "" ? 0 : (parseInt(formData.duration) || 0),
      cost: parseFloat(formData.cost) || 0,
      order: parseInt(formData.order) || 1,
    };
    setLastSelectedCurrency(formData.currency);

    const targetDate = sanitizeDate(formData.date);
    const m = payload.order;
    let updatedData = [...currentTripData];

    let dayItems = currentTripData.filter(item => sanitizeDate(item.date) === targetDate && item.id !== (modalMode === 'edit' ? editingId : null));
    
    let lessItems = dayItems.filter(item => item.order < m).sort((a,b) => a.order - b.order);
    let greaterItems = dayItems.filter(item => item.order >= m).sort((a,b) => a.order - b.order);
    
    let n1 = lessItems.length;
    let newOrders = {};
    
    let currentOrderCounter = 1;
    lessItems.forEach(item => { newOrders[item.id] = currentOrderCounter++; });
    
    payload.order = n1 + 1;
    
    currentOrderCounter = n1 + 2;
    greaterItems.forEach(item => { newOrders[item.id] = currentOrderCounter++; });

    if (modalMode === 'add') {
      const newItem = { ...payload, id: `manual-${Date.now()}`, done: false };
      updatedData = updatedData.map(item => newOrders[item.id] !== undefined ? { ...item, order: newOrders[item.id] } : item);
      updatedData.push(newItem);
      showMessage("已添加", "add");
    } else {
      updatedData = updatedData.map(item => {
        if (item.id === editingId) return { ...item, ...payload };
        if (newOrders[item.id] !== undefined) return { ...item, order: newOrders[item.id] };
        return item;
      });
      showMessage("已保存", "edit");
    }
    
    updateTrips({ ...trips, [activeTrip]: updatedData });
    setShowModal(false);
    restoreZoom();
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFormData({ 
      ...item, 
      duration: String(item.duration), 
      cost: item.cost ? String(item.cost) : '', 
      currency: item.cost ? item.currency : '',
      order: String(item.order),
      transitRoute: item.transitRoute || ''
    });
    setShowModal(true);
  };

  const openTransportModal = (item) => {
    setTransportEditId(item.id);
    setTransportEditDuration(String(item.transportDuration || 0));
    setShowTransportModal(true);
  };

  const handleSaveTransportDuration = (e) => {
    e.preventDefault();
    const updatedData = currentTripData.map(item => {
      if (item.id === transportEditId) {
        return { ...item, transportDuration: parseInt(transportEditDuration) || 0 };
      }
      return item;
    });
    updateTrips({ ...trips, [activeTrip]: updatedData });
    setShowTransportModal(false);
    restoreZoom();
    showMessage("已保存", "edit");
  };

  const renameTrip = () => {
    if (newTitle.trim() && newTitle !== activeTrip) {
      const newTrips = { ...trips };
      newTrips[newTitle] = newTrips[activeTrip];
      delete newTrips[activeTrip];
      updateTrips(newTrips, newTitle);
      showMessage("已保存", "rename");
    }
    setIsEditingTitle(false);
    restoreZoom();
  };

  const openInGoogleMaps = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    window.open(`https://maps.google.com/?q=$${query}`, '_blank');
  };

  const openMapPreview = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    setPreviewIframeUrl(`https://maps.google.com/maps?q=$${query}&output=embed`);
  };

  const toggleOverview = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleOpenAddModal = () => {
    setModalMode('add'); 
    const dateToUse = activeTab !== 'Total' ? activeTab : getTodayDate();
    setFormData({ name: '', date: dateToUse, duration: '60', city: '', note: '', cost: '', currency: '', order: '1', transportMode: 'walk', transitRoute: '' }); 
    setShowModal(true); 
  };

  const isMobileView = viewMode === 'mobile' || isNarrow;
  
  const bodyColor = isDarkMode ? 'bg-[#000000] text-white' : 'bg-[#e8e4d9] text-[#2c241b]';
  const containerColor = isDarkMode ? 'bg-[#0f1115]' : 'bg-[#fdfbf7]';
  
  const containerClasses = isMobileView 
    ? `max-w-[430px] w-full mx-auto min-h-[100vh] relative shadow-2xl transition-colors duration-500 overflow-hidden ${containerColor}` 
    : `w-full min-h-[100vh] relative transition-colors duration-500 overflow-hidden ${containerColor}`;

  return (
    <div className={`font-sans transition-colors duration-500 flex justify-center ${bodyColor}`}>
      <div className={containerClasses}>
        
        {isSwitchingTheme && (
          <div className="fixed inset-0 flex items-center justify-center z-[999]">
            <RefreshCw className={`w-10 h-10 animate-spin ${isDarkMode ? 'text-white' : 'text-gray-800'}`} />
          </div>
        )}

        <div className={isSwitchingTheme ? 'opacity-0 pointer-events-none' : ''}>
          {toast.show && (
            <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full bg-black/80 backdrop-blur text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
              {(() => {
                const IconMap = {
                  export: { icon: Upload, color: 'text-blue-500' },
                  import: { icon: Download, color: 'text-blue-500' },
                  undo: { icon: Undo2, color: 'text-green-500' },
                  redo: { icon: Redo2, color: 'text-green-500' },
                  allDone: { icon: MapPinCheckInside, color: 'text-yellow-500' },
                  importError: { icon: MapPinXInside, color: 'text-red-500' },
                  emptyImport: { icon: MapPinXInside, color: 'text-red-500' },
                  delete: { icon: MapPinMinus, color: 'text-red-500' },
                  add: { icon: MapPinPlus, color: 'text-green-500' },
                  edit: { icon: SquarePen, color: 'text-green-500' },
                  rename: { icon: NotebookPen, color: 'text-green-500' },
                  refresh: { icon: RefreshCw, color: 'text-yellow-500' },
                  error: { icon: MapPinXInside, color: 'text-red-500' }
                };
                const config = IconMap[toast.type] || { icon: CheckCircle, color: 'text-green-500' };
                const Icon = config.icon;
                return <Icon className={`w-4 h-4 ${config.color}`} />;
              })()}
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          )}

          {previewIframeUrl && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 fade-in duration-300">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewIframeUrl(null)}></div>
               <div className={`relative w-[95vw] h-[75vh] rounded-[2rem] overflow-hidden border-4 transition-colors duration-500 ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                  <button onClick={() => setPreviewIframeUrl(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <iframe 
                    key={previewIframeUrl}
                    title="Preview"
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{ 
                      border: 0
                    }} 
                    src={previewIframeUrl} 
                    allowFullScreen>
                  </iframe>
               </div>
            </div>
          )}

          <div className="pb-32 min-h-[100vh] flex flex-col relative">
            
            <header className={`${isMobileView ? 'px-3' : 'px-6'} py-4 space-y-4`}>
              <div className="flex justify-between items-center gap-2">
                {isEditingTitle ? (
                  <input 
                    autoFocus
                    className={`w-1/2 min-w-0 flex-1 bg-transparent border-b border-blue-500 outline-none text-2xl font-black truncate transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={renameTrip}
                    onKeyDown={(e) => e.key === 'Enter' && renameTrip()}
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0 group cursor-pointer" onClick={() => { setNewTitle(activeTrip); setIsEditingTitle(true); }}>
                    <h1 className="text-2xl font-black tracking-tighter truncate">{activeTrip}</h1>
                    <NotebookPen className={`w-4 h-4 opacity-0 group-hover:opacity-70 transition-opacity shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                )}

                <div className={`flex backdrop-blur-xl rounded-2xl p-1 shrink-0 border transition-colors duration-500 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-200/50 border-gray-300'}`}>
                  <button onClick={handleThemeToggle} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}>
                    {isDarkMode ? <Moon className="w-4 h-4 text-yellow-400" /> : <SunMedium className="w-4 h-4 text-orange-500" />}
                  </button>
                  <button onClick={() => setViewMode(viewMode === 'mobile' ? 'web' : 'mobile')} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}>
                    {viewMode === 'mobile' ? <Monitor className="w-4 h-4 text-gray-400" /> : <Smartphone className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-black cursor-pointer hover:bg-blue-500/20 transition-all">
                  <Download className="w-4 h-4" /> 导入
                  <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                </label>
                <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20 text-xs font-black hover:bg-green-500/20 transition-all">
                  <Upload className="w-4 h-4" /> 导出
                </button>
                <button onClick={handleUndo} disabled={past.length === 0} className={`w-10 flex items-center justify-center rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-transparent text-white disabled:opacity-20' : 'bg-white border-gray-200 text-gray-800 disabled:opacity-30 shadow-sm'}`}>
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={handleRedo} disabled={future.length === 0} className={`w-10 flex items-center justify-center rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-transparent text-white disabled:opacity-20' : 'bg-white border-gray-200 text-gray-800 disabled:opacity-30 shadow-sm'}`}>
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </header>

            <nav className={`${isMobileView ? 'px-3' : 'px-6'} flex gap-2 overflow-x-auto no-scrollbar min-h-[60px] items-center shrink-0`}>
              <button onClick={() => setActiveTab('Total')} className={`relative flex items-center justify-center whitespace-nowrap shrink-0 h-[40px] px-5 rounded-xl text-xs font-black transition-all ${activeTab === 'Total' ? (isDarkMode ? 'bg-white text-black shadow-lg border border-transparent' : 'bg-gray-800 text-white shadow-lg border border-transparent') : 'bg-transparent border border-gray-300 dark:border-white/10 opacity-70 hover:opacity-100'}`}>全部</button>
              {dates.map(date => (
                <button key={date} onClick={() => setActiveTab(date)} className={`relative flex items-center justify-center whitespace-nowrap shrink-0 h-[40px] px-4 rounded-xl text-xs font-black transition-all ${activeTab === date ? (isDarkMode ? 'bg-white text-black shadow-lg border border-transparent' : 'bg-gray-800 text-white shadow-lg border border-transparent') : 'bg-transparent border border-gray-300 dark:border-white/10 opacity-70 hover:opacity-100'}`}>
                  {date.split('-').slice(1).join('/')}
                </button>
              ))}
            </nav>

            <div className={`${isMobileView ? 'px-3' : 'px-6'} mt-2 flex gap-2`}>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索" 
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-bold transition-all outline-none border ${isDarkMode ? 'bg-white/5 focus:bg-white/10 text-white border-transparent' : 'bg-white focus:bg-white shadow-sm text-gray-900 border-gray-200'}`}
                />
              </div>
              <button onClick={handleRefresh} className={`p-3 rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 text-white border-transparent' : 'bg-white shadow-sm text-gray-700 border-gray-200'}`}>
                <RefreshCw className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
              <button onClick={handleLocate} className={`p-3 rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 text-white border-transparent' : 'bg-white shadow-sm text-gray-700 border-gray-200'}`}>
                <Locate className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>

            <main className={`${isMobileView ? 'px-3' : 'px-6'} py-6`}>
              {groupedDataWithTime.length === 0 ? (
                <div className="py-20 text-center opacity-60 flex flex-col items-center gap-4">
                   <Sparkles className="w-12 h-12" />
                   <p className="text-xs font-bold uppercase tracking-widest">暂无行程计划，开始添加吧</p>
                </div>
              ) : groupedDataWithTime.map((group) => {
                const isOverviewExpanded = expandedDates[group.date]; 
                
                return (
                  <div key={group.date} className="mb-10">
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <span className="text-[10px] font-black px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-500 dark:text-blue-400 rounded uppercase tracking-widest">{group.date}</span>
                        <div className={`h-px flex-1 mx-3 transition-colors duration-500 ${isDarkMode ? 'bg-white/5' : 'bg-gray-300'}`} />
                        {weatherData[group.date] && (
                          <div 
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all hover:opacity-80 ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-black/5 text-gray-800'}`}
                            onClick={() => {
                              if (group.items[0]?.city) {
                                setPreviewIframeUrl(`https://www.google.com/search?q=${encodeURIComponent(group.items[0].city + '天气')}&igu=1&cs=${isDarkMode ? '1' : '0'}`);
                              }
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-xs font-black whitespace-nowrap">{weatherData[group.date]}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={() => toggleOverview(group.date)} className={`flex-1 flex justify-between items-center px-4 py-3 rounded-2xl border border-dashed transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-white bg-white/50'}`}>
                           <span className="text-xs font-black opacity-80">当日线路总览（{group.items.length}个地点）</span>
                           {isOverviewExpanded ? <ChevronUp className="w-4 h-4 opacity-60"/> : <ChevronDown className="w-4 h-4 opacity-60"/>}
                        </button>
                        <button onClick={() => { setTimeEditData({ date: group.date, time: dailyStartTimes[activeTrip]?.[group.date] || "08:00" }); setShowTimeModal(true); }} className={`px-3 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed transition-all shrink-0 ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-white bg-white/50'}`}>
                           <Clock className="w-4 h-4 opacity-60"/>
                           <span className="text-xs font-black opacity-80">{dailyStartTimes[activeTrip]?.[group.date] || "08:00"}</span>
                        </button>
                      </div>
                      
                      {isOverviewExpanded && (
                        <div className={`mt-2 p-4 rounded-2xl text-[11px] font-bold leading-loose flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                          {group.items.length >= 2 && (
                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 border border-white/10">
                              <iframe 
                                title="Daily Route"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                src={`https://maps.google.com/maps?saddr=$${encodeURIComponent(group.items[0].name + ' ' + (group.items[0].city || ''))}&daddr=${encodeURIComponent(group.items.slice(1).map(i => i.name + ' ' + (i.city || '')).join(' to:'))}&output=embed`} 
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}
                          {group.items.map((i, idx) => (
                             <span key={idx} className={`block ${i.done ? 'line-through opacity-40' : ''}`}>
                               {i.order}. {i.name}（{i.startTimeStr} - {i.endTimeStr}）
                             </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative space-y-0">
                      {group.items.map((item, idx) => (
                        <div key={item.id} id={`card-${item.id}`} className="relative mb-0">
                          
                          {idx < group.items.length - 1 && (
                            <div className={`absolute left-[27px] top-[36px] -bottom-[40px] w-[2px] z-0 transition-colors duration-500 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                          )}

                          <div className={`relative flex ${isMobileView ? 'gap-2' : 'gap-4'} group z-10 pt-2`}>
                            <div className="flex flex-col items-center w-14 shrink-0 bg-transparent">
                              <button onClick={() => toggleCheck(item.id)} className={`z-10 w-9 h-9 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all shadow-lg hover:scale-110 ${item.done ? 'bg-gray-500 border-gray-500/20 text-white' : (isDarkMode ? 'bg-[#0f1115] text-blue-500 border-blue-500' : 'bg-[#fdfbf7] text-blue-600 border-blue-500')}`}>
                                {item.done ? <CheckCircle className="w-5 h-5"/> : item.order}
                              </button>
                              <div className="mt-2 text-[10px] font-black opacity-80 tabular-nums bg-transparent">{item.startTimeStr}</div>
                            </div>

                            <div className={`flex-1 mb-2 p-4 rounded-[1.5rem] border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'} ${item.done ? 'opacity-50' : ''}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className={`font-bold text-sm leading-snug ${item.done ? 'line-through opacity-70' : ''}`}>{item.name}</h3>
                                  {item.city && (
                                    <div className="flex items-center gap-1 mt-1 opacity-80">
                                      <MapPin className="w-3 h-3" />
                                      <span className="text-[9px] font-normal uppercase translate-y-[1px]">{item.city}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => openMapPreview(item.name, item.city)} className={`p-2 rounded-xl hover:scale-105 transition-all flex items-center ${isDarkMode ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}>
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => openInGoogleMaps(item.name, item.city)} className={`p-2 rounded-xl hover:scale-105 transition-all flex items-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                    <Map className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {item.note && (() => {
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const urls = item.note.match(urlRegex);
                                if (!urls) {
                                  return (
                                    <div className={`mt-3 mb-3 text-[11px] p-3 rounded-xl whitespace-pre-wrap break-words leading-relaxed border-l-2 ${isDarkMode ? 'text-gray-300 bg-black/20 border-white/10' : 'text-gray-700 bg-gray-50 border-gray-300'}`}>
                                      {item.note}
                                    </div>
                                  );
                                }
                                
                                const textPart = item.note.replace(urlRegex, '\n').split('\n').map(s => s.trim()).filter(Boolean).join('\n');
                                
                                return (
                                  <div className="mt-3 mb-3 flex flex-col gap-2 items-start w-full min-w-0">
                                    {textPart && (
                                      <div className={`w-full text-[11px] p-3 rounded-xl whitespace-pre-wrap break-words leading-relaxed border-l-2 ${isDarkMode ? 'text-gray-300 bg-black/20 border-white/10' : 'text-gray-700 bg-gray-50 border-gray-300'}`}>
                                        {textPart}
                                      </div>
                                    )}
                                    {urls.map((url, i) => (
                                      <div key={i} onClick={() => setPreviewIframeUrl(url)} className={`text-[12px] font-bold px-3 py-2 rounded-xl cursor-pointer transition-all border-l-2 truncate w-full block ${isDarkMode ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-300'}`}>
                                        {url.length > 28 ? url.substring(0, 20) + '...' + url.slice(-8) : url}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              
                              <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex gap-3 text-[10px] font-bold">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-500 ${isDarkMode ? 'text-green-500 bg-green-500/10' : 'text-green-700 bg-green-100'} text-[10px] font-bold`}><Clock className="w-3 h-3" /> {item.duration >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999m+' : '999999m+') : item.duration + 'm'}</div>
                                  {item.cost > 0 && <div className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-500 ${isDarkMode ? 'text-orange-400 bg-orange-400/10' : 'text-orange-600 bg-orange-100'}`}><DollarSign className="w-3 h-3" /> {item.cost >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999+' : '999999+') : item.cost} {item.currency}</div>}
                                </div>
                                
                                <div className="flex gap-1.5">
                                  <button onClick={() => openEditModal(item)} className={`p-1.5 rounded-lg hover:scale-105 transition-all ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}>
                                    <SquarePen className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} className={`p-1.5 rounded-lg hover:scale-105 transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {idx < group.items.length - 1 && (
                            <div key={`transport-${item.id}`} id={`transport-${item.id}`} className={`flex ${isMobileView ? 'gap-2' : 'gap-4'} py-3 items-center relative z-10`}>
                              <div className="w-14 shrink-0 bg-transparent flex flex-col items-center justify-center relative z-20 -translate-y-5">
                                <button onClick={() => toggleTransportCheck(item.id)} className={`w-6 h-6 rounded-full z-20 border-[3px] flex items-center justify-center transition shadow-lg hover:scale-110 ${item.transportDone ? 'bg-gray-500 border-gray-500/20 text-white' : (isDarkMode ? 'bg-[#0f1115] text-yellow-500 border-yellow-500' : 'bg-[#fdfbf7] text-yellow-600 border-yellow-500')}`}>
                                  {item.transportDone && <CheckCircle className="w-4 h-4"/>}
                                </button>
                                <div className="mt-2 text-[10px] font-black opacity-80 tabular-nums bg-transparent">
                                  {item.endTimeStr}
                                </div>
                              </div>
                              <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-dashed transition ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white/60 shadow-sm border-gray-200'} ${item.transportDone ? 'opacity-50' : ''}`}>
                                <div className="flex items-center min-w-0">
                                  <div className={`ml-1 flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-500 ${isDarkMode ? 'text-green-500 bg-green-500/10' : 'text-green-700 bg-green-100'} text-[10px] font-bold`}>
                                    <Clock className="w-3 h-3" /> {(item.transportDuration || 0) >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999m+' : '999999m+') : (item.transportDuration || 0) + 'm'}
                                  </div>
                                </div>
                                <div className={`flex items-center shrink-0 ${isMobileView ? 'gap-2' : 'gap-3'}`}>
                                  <button onClick={() => openTransportModal(item)} className={`p-1.5 rounded-lg hover:scale-105 transition ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}>
                                    <SquarePen className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="flex gap-1 shrink-0">
                                    {Object.entries(TRANSPORT_ESTIMATES).map(([mode, config]) => {
                                      const isActive = item.transportMode === mode;
                                      const Icon = config.icon;
                                      return (
                                        <button key={mode} onClick={() => handleUpdateTransport(item.id, mode)} className={`p-1.5 rounded-lg transition transform-gpu ${isActive ? `${isDarkMode ? config.darkClass : config.lightClass} scale-110 shadow-sm` : 'text-gray-500 opacity-70 hover:opacity-100'}`}>
                                          <Icon className="w-3.5 h-3.5" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <button 
                                    onClick={() => {
                                      const endItem = group.items[idx+1];
                                      const origin = encodeURIComponent(`${item.name} ${item.city || ''}`);
                                      const dest = encodeURIComponent(`${endItem.name} ${endItem.city || ''}`);
                                      const dirflgMap = { walk: 'w', car: 'd', train: 'r' };
                                      const dirflg = dirflgMap[item.transportMode || 'train'];
                                      setPreviewIframeUrl(`https://maps.google.com/maps?saddr=$${origin}&daddr=${dest}&dirflg=${dirflg}&output=embed`);
                                    }}
                                    className={`${isMobileView ? 'px-2.5' : 'px-4'} py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1 shrink-0 ${
                                      isDarkMode ? TRANSPORT_ESTIMATES[item.transportMode || 'walk'].darkClass : TRANSPORT_ESTIMATES[item.transportMode || 'walk'].lightClass
                                    }`}
                                  >
                                    <Map className="w-3.5 h-3.5" />
                                    路线
                                  </button>
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

            <div className={`fixed bottom-[20px] sm:bottom-0 flex justify-end ${isMobileView ? 'px-3' : 'px-6'} pointer-events-none z-[60] left-1/2 -translate-x-1/2 ${isMobileView ? 'max-w-[430px] w-full' : 'w-full'}`}>
              <button 
                onClick={handleOpenAddModal} 
                className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-[0_8px_30px_rgb(37,99,235,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <form onSubmit={handleSubmitForm} className={`w-full max-w-md max-h-[90%] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-inherit py-2 z-10">
                  <h2 className={`text-xl font-black transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{modalMode === 'add' ? '添加地点' : '编辑地点'}</h2>
                  <button type="button" onClick={() => { setShowModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-500 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_80px] gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>地点名称</label>
                      <input required 
                        onInvalid={e => e.target.setCustomValidity('请填写')}
                        onInput={e => e.target.setCustomValidity('')}
                        className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>序号</label>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" 
                        className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.order} onChange={e => setFormData({...formData, order: e.target.value.replace(/[^0-9]/g, '')})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>日期</label>
                      <input 
                        type="date" 
                        required 
                        onInvalid={e => e.target.setCustomValidity('请填写')}
                        onInput={e => e.target.setCustomValidity('')}
                        className={`w-full min-w-0 h-12 pl-4 pr-3 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border appearance-none transition-colors duration-500 [&::-webkit-calendar-picker-indicator]:invert-[0.6] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.date} onChange={e => setFormData({...formData, date: sanitizeDate(e.target.value)})} />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>城市</label>
                      <input className={`w-full min-w-0 h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                       <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>时间（分）</label>
                       <input type="text" inputMode="numeric" pattern="[0-9]*" 
                        className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value.replace(/[^0-9]/g, '')})} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>花销</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value.replace(/[^0-9.]/g, '')})} />
                    </div>
                    <div className="flex flex-col gap-1.5 relative">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>币种</label>
                      <div className="relative h-12">
                        <select className={`w-full h-full px-4 pr-8 rounded-2xl text-base font-medium outline-none appearance-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                          <option value=""></option>
                          <option value="USD">USD</option>
                          <option value="GBP">GBP</option>
                          <option value="EUR">EUR</option>
                          <option value="JPY">JPY</option>
                          <option value="CNY">CNY</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-black uppercase ml-1 flex justify-between transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>
                      <span>备注</span>
                      <span className="text-blue-500 font-normal opacity-100">（支持文本/链接）</span>
                    </label>
                    <textarea className={`w-full p-4 rounded-2xl text-base font-medium min-h-[100px] outline-none resize-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      placeholder="例如：住宿、交通、门票、营业时间等信息"
                      value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="w-full mt-6 h-14 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all box-border">
                  保存
                </button>
              </form>
            </div>
          )}

          {showTimeModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <form onSubmit={(e) => {
                e.preventDefault();
                setDailyStartTimes(prev => ({
                  ...prev,
                  [activeTrip]: { ...(prev[activeTrip] || {}), [timeEditData.date]: timeEditData.time }
                }));
                setShowTimeModal(false);
                restoreZoom();
              }} className={`w-full max-w-md max-h-[90%] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-inherit py-2 z-10">
                  <h2 className={`text-xl font-black transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>编辑时间</h2>
                  <button type="button" onClick={() => { setShowTimeModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-500 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>当日出发时间</label>
                    <input 
                      type="time" 
                      required 
                      onInvalid={e => e.target.setCustomValidity('请填写')}
                      onInput={e => e.target.setCustomValidity('')}
                      className={`w-full min-w-0 h-12 pl-4 pr-3 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border appearance-none transition-colors duration-500 [&::-webkit-calendar-picker-indicator]:invert-[0.6] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      value={timeEditData.time} onChange={e => setTimeEditData({...timeEditData, time: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="w-full mt-6 h-14 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all box-border">
                  保存
                </button>
              </form>
            </div>
          )}

          {showTransportModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <form onSubmit={handleSaveTransportDuration} className={`w-full max-w-md max-h-[90%] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-inherit py-2 z-10">
                  <h2 className={`text-xl font-black transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>编辑交通</h2>
                  <button type="button" onClick={() => { setShowTransportModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-500 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-500 ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>时间（分）</label>
                     <input type="text" inputMode="numeric" pattern="[0-9]*" 
                      className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-500 ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      value={transportEditDuration} onChange={e => setTransportEditDuration(e.target.value.replace(/[^0-9]/g, ''))} />
                  </div>
                </div>

                <button type="submit" className="w-full mt-6 h-14 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all box-border">
                  保存
                </button>
              </form>
            </div>
          )}

          {showImportModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <div className={`w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23] border border-white/5' : 'bg-white text-black'}`}>
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className={`text-xl font-black mb-1 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-black'}`}>识别到 {pendingImportData.length} 个地点</h2>
                <p className="text-[11px] opacity-80 mb-8">请选择如何将这些地点应用到当前行程：<br/><span className="text-blue-500 font-bold">{activeTrip}</span></p>
                
                <div className="grid gap-3">
                  <button onClick={() => confirmImport('append')} className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all">追加到当前行程末尾</button>
                  <button onClick={() => confirmImport('overwrite')} className="w-full h-12 rounded-2xl border border-red-500/30 text-red-500 font-black hover:bg-red-500/10 transition-all">覆盖现有行程</button>
                  <button onClick={() => setShowImportModal(false)} className="mt-2 text-xs font-black opacity-70 uppercase tracking-widest hover:opacity-100 p-2">取消</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          body {
            background-color: ${isDarkMode ? '#000000' : '#e8e4d9'};
            transition: background-color 0.5s;
          }
          .transition-colors {
            transition-property: background-color, border-color, text-decoration-color, fill, stroke !important;
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          * { -webkit-tap-highlight-color: transparent; }
          input:invalid { box-shadow: none; }
          input[type="date"], input[type="time"] {
            display: flex;
            align-items: center;
          }
        `}</style>
      </div>
    </div>
  );
};

export default App;