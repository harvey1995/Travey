import React, { useState, useEffect, useMemo } from 'react';
import { 
  // 1. 视图与主题
  Sun, Moon, Monitor, Smartphone,

  // 2. 输入与输出
  Download, Upload,

  // 3. 编辑与历史
  SquarePen, NotebookPen, Trash2, Undo2, Redo2,

  // 4. 交互与操作
  Plus, X, CheckCircle, ChevronDown, ChevronUp, 
  Search, RefreshCw, Sparkles, ExternalLink,

  // 5. 地图与位置
  Map, MapPin, Locate, ZoomIn, 
  MapPinCheckInside, MapPinPlusInside, MapPinXInside, Route,

  // 6. 出行方式
  Car, Train, Footprints,

  // 7. 数据属性
  Clock, Wallet
} from 'lucide-react';

const CACHE_KEY_TRIP_DATA = 'travey_trip_data_v1';
const CACHE_KEY_TRIP_NAME = 'travey_trip_name_v1';
const CACHE_KEY_DARK_MODE = 'travey_dark_mode_v1';
const CACHE_KEY_VIEW_MODE = 'travey_view_mode_v1';
const CACHE_KEY_START_TIMES = 'travey_start_times_v1';

const TRANSPORT_MODE = {
  car: { label: '打车', icon: Car, lightClass: 'text-orange-600 bg-orange-100 hover:bg-orange-200', darkClass: 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20', alert: null },
  train: { label: '公交', icon: Train, lightClass: 'text-red-600 bg-red-100 hover:bg-red-200', darkClass: 'text-red-400 bg-red-500/10 hover:bg-red-500/20', alert: null },
  walk: { label: '步行', icon: Footprints, lightClass: 'text-blue-600 bg-blue-100 hover:bg-blue-200', darkClass: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20', alert: null }
};

const DEFAULT_TRIP_TOKYO = [
  { date: "2025-12-31", id: "tokyo-1", city: "Tokyo", name: "涩谷十字路口", locationDuration: 60, note: "感受世界最繁忙的交叉路口，看跨年倒计时准备", cost: 0, currency: "JPY", isLocationChecked: true, order: 1, transportMode: 'walk', transportRoute: '' },
  { date: "2025-12-31", id: "tokyo-2", city: "Tokyo", name: "SHIBUYA SKY", locationDuration: 90, note: "https://www.shibuya-scramble-square.com/sky/", cost: 2500, currency: "JPY", isLocationChecked: false, order: 2, transportMode: 'train', transportRoute: '山手线' },
  { date: "2025-12-31", id: "tokyo-3", city: "Tokyo", name: "明治神宫", locationDuration: 120, note: "参加「初诣」，体验日本传统跨年参拜", cost: 0, currency: "JPY", isLocationChecked: false, order: 3, transportMode: 'walk', transportRoute: '' },
  { date: "2026-01-01", id: "tokyo-4", city: "Tokyo", name: "浅草寺", locationDuration: 120, note: "求御守，吃人形烧，看元旦仲见世商店街", cost: 1000, currency: "JPY", isLocationChecked: false, order: 1, transportMode: 'train', transportRoute: '银座线' },
  { date: "2026-01-01", id: "tokyo-5", city: "Tokyo", name: "上野恩赐公园", locationDuration: 180, note: "漫步博物馆群，呼吸新年第一份新鲜空气", cost: 0, currency: "JPY", isLocationChecked: false, order: 2, transportMode: 'walk', transportRoute: '' },
  { date: "2026-01-02", id: "tokyo-6", city: "Tokyo", name: "丰洲市场", locationDuration: 120, note: "吃最正宗的寿司早餐，看金枪鱼拍卖展示", cost: 5000, currency: "JPY", isLocationChecked: false, order: 1, transportMode: 'train', transportRoute: '百合鸥号' },
  { date: "2026-01-02", id: "tokyo-7", city: "Tokyo", name: "银座", locationDuration: 240, note: "新年大特卖「福袋」抢购，买伴手礼", cost: 20000, currency: "JPY", isLocationChecked: false, order: 2, transportMode: 'walk', transportRoute: '' },
];

const DEFAULT_TRIP = { "东京跨年三日游": DEFAULT_TRIP_TOKYO };

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const sanitizeDate = (dateStr) => {
  if (!dateStr) return getCurrentDate();
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
  return isNaN(d.getTime()) ? getCurrentDate() : d.toISOString().split('T')[0];
};

const isValidUrl = (str) => {
  try { new URL(str); return true; } catch { return false; }
};

if (typeof document !== 'undefined') {
  const initialThemeCache = localStorage.getItem(CACHE_KEY_DARK_MODE);
  const isInitialDarkMode = initialThemeCache !== null ? JSON.parse(initialThemeCache) : true;
  const initialBackgroundColor = isInitialDarkMode ? '#000000' : '#e8e4d9';
  document.documentElement.style.backgroundColor = initialBackgroundColor;
  const themeStyleTag = document.createElement('style');
  themeStyleTag.id = 'travey-theme-style';
  themeStyleTag.innerHTML = `html, body { background-color: ${initialBackgroundColor} !important; }`;
  document.head.appendChild(themeStyleTag);

  let themeMetaTag = document.querySelector('meta[name="theme-color"]');
  if (!themeMetaTag) {
    themeMetaTag = document.createElement('meta');
    themeMetaTag.name = 'theme-color';
    document.head.appendChild(themeMetaTag);
  }
  themeMetaTag.content = initialBackgroundColor;
}

const App = () => {
  const [tripData, setTripData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY_TRIP_DATA);
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_TRIP;
  });
  const [tripName, setTripName] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem(CACHE_KEY_TRIP_NAME);
      return savedActive && tripData[savedActive] ? savedActive : Object.keys(tripData)[0] || "东京跨年三日游";
    }
    return "东京跨年三日游";
  });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isEditingTripName, setIsEditingTripName] = useState(false);
  const [draftTripName, setDraftTripName] = useState("");
  const [dailyStartTimeMap, setDailyStartTimeMap] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY_START_TIMES);
      if (saved) return JSON.parse(saved);
    }
    return {};
  });

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY_DARK_MODE);
      if (saved !== null) return JSON.parse(saved);
    }
    return true;
  });
  const [isWindowNarrow, setIsWindowNarrow] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [deviceViewMode, setDeviceViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY_VIEW_MODE);
      if (saved) return saved;
      return (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) ? 'mobile' : 'web';
    }
    return 'web';
  });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [lastSelectedCurrency, setLastSelectedCurrency] = useState('USD');

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success', id: 0 });
  const [activeDateTab, setActiveDateTab] = useState("Total"); 
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOverviewDateMap, setExpandedOverviewDateMap] = useState({});
  const [weatherDataMap, setWeatherDataMap] = useState({});
  const [weatherRefreshTrigger, setWeatherRefreshTrigger] = useState(0);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalMode, setLocationModalMode] = useState('add');
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [locationFormData, setLocationFormData] = useState({ 
    name: '', date: getCurrentDate(), locationDuration: '60', city: '', note: '', cost: '', currency: '', order: '1', transportMode: 'walk', transportRoute: '' 
  });

  const [showTransportModal, setShowTransportModal] = useState(false);
  const [editingTransportId, setEditingTransportId] = useState(null);
  const [transportFormData, setTransportFormData] = useState('');

  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [startTimeFormData, setStartTimeFormData] = useState({ date: '', time: '08:00' });

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState([]);

  const [iframePreviewUrl, setIframePreviewUrl] = useState(null);
  const [notePreviewText, setNotePreviewText] = useState(null);
  const [activePressId, setActivePressId] = useState(null);

  const currentTripData = tripData[tripName] || [];

  const sanitizedTripData = useMemo(() => {
    return currentTripData.map(item => ({ ...item, date: sanitizeDate(item.date) }));
  }, [currentTripData]);

  const tripDataDates = useMemo(() => {
    const uniqueDates = [...new Set(sanitizedTripData.map(item => item.date))];
    return uniqueDates.sort((a, b) => new Date(a) - new Date(b));
  }, [sanitizedTripData]);

  const tripDataTimeline = useMemo(() => {
    const sortedTripData = [...sanitizedTripData].sort((a, b) => {
      if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
      return (a.order || 0) - (b.order || 0);
    });

    const groupedTripDataWithTime = {};
    sortedTripData.forEach(item => {
      const formattedDateString = item.date;
      if (!groupedTripDataWithTime[formattedDateString]) groupedTripDataWithTime[formattedDateString] = { date: formattedDateString, items: [], startTime: dailyStartTimeMap[tripName]?.[formattedDateString] || "08:00" };
      
      const sameDayLocationsForTimeline = groupedTripDataWithTime[formattedDateString].items;
      let currentArrivalTime = groupedTripDataWithTime[formattedDateString].startTime;

      if (sameDayLocationsForTimeline.length > 0) {
        const previousLocationNode = sameDayLocationsForTimeline[sameDayLocationsForTimeline.length - 1];
        const currentTravelTime = previousLocationNode.transportDuration || 0; 
        const [hour, minute] = previousLocationNode.endTimeString.split(':').map(Number);
        const dateObj = new Date(2000, 0, 1, hour, minute + currentTravelTime);
        currentArrivalTime = isNaN(dateObj.getTime()) ? '--:--' : `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        previousLocationNode.nextTravelTime = "?";
      }

      const [hours, minutes] = currentArrivalTime.split(':').map(Number);
      const startDate = new Date(2000, 0, 1, hours, minutes);
      const endDate = new Date(startDate.getTime() + (item.locationDuration || 0) * 60000);
      const endTimeString = isNaN(endDate.getTime()) ? '--:--' : `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      sameDayLocationsForTimeline.push({ ...item, startTimeString: currentArrivalTime, endTimeString });
    });

    let filteredTimelineResult = Object.values(groupedTripDataWithTime).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (activeDateTab !== "Total") filteredTimelineResult = filteredTimelineResult.filter(g => g.date === activeDateTab);
    if (searchQuery) {
      filteredTimelineResult = filteredTimelineResult.map(g => ({
        ...g,
        items: g.items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()) || (it.city||'').toLowerCase().includes(searchQuery.toLowerCase()))
      })).filter(g => g.items.length > 0);
    }
    return filteredTimelineResult;
  }, [sanitizedTripData, activeDateTab, searchQuery, dailyStartTimeMap, tripName]);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY_TRIP_DATA, JSON.stringify(tripData));
    localStorage.setItem(CACHE_KEY_TRIP_NAME, tripName);
  }, [tripData, tripName]);

  useEffect(() => {
    const loadedTimer = setTimeout(() => setIsAppLoaded(true), 50);
    return () => clearTimeout(loadedTimer);
  }, []);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsAppLoading(false);
    }, 400); 
    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY_START_TIMES, JSON.stringify(dailyStartTimeMap));
  }, [dailyStartTimeMap]);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY_DARK_MODE, JSON.stringify(isDarkMode));
    if (typeof document !== 'undefined') {
      const themeBgColor = isDarkMode ? '#000000' : '#e8e4d9';
      
      document.documentElement.style.backgroundColor = themeBgColor;
      const globalStyle = document.getElementById('travey-theme-style');
      if (globalStyle) {
        globalStyle.innerHTML = `html, body { background-color: ${themeBgColor} !important; }`;
      }
      
      let themeMetaTag = document.querySelector('meta[name="theme-color"]');
      if (!themeMetaTag) {
        themeMetaTag = document.createElement('meta');
        themeMetaTag.name = 'theme-color';
        document.head.appendChild(themeMetaTag);
      }
      themeMetaTag.content = themeBgColor;
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY_VIEW_MODE, deviceViewMode);
  }, [deviceViewMode]);

  useEffect(() => {
    if (toastState.show) {
      const toastTimer = setTimeout(() => {
        setToastState(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(toastTimer);
    }
  }, [toastState.show, toastState.id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleWindowResize = () => setIsWindowNarrow(window.innerWidth < 768);
      handleWindowResize();
      window.addEventListener('resize', handleWindowResize);
      
      const savedView = localStorage.getItem(CACHE_KEY_VIEW_MODE);
      if (!savedView) {
        const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setDeviceViewMode(isMobile ? 'mobile' : 'web');
      }
      
      return () => window.removeEventListener('resize', handleWindowResize);
    }
  }, []);

  useEffect(() => {
    if (showLocationModal && locationModalMode === 'add') {
      const targetDataList = tripData[tripName] || [];
      const sameDayLocationsForTimeline = targetDataList.filter(item => sanitizeDate(item.date) === locationFormData.date);
      const maxOrder = sameDayLocationsForTimeline.reduce((max, item) => Math.max(max, parseInt(item.order) || 0), 0);
      setLocationFormData(prev => ({ ...prev, order: String(maxOrder + 1) }));
    }
  }, [locationFormData.date, showLocationModal, locationModalMode, tripName, tripData]);

  useEffect(() => {
    let isAppMounted = true;
    const fetchWeatherData = async () => {
      const pendingWeatherData = {};
      let isWeatherUpdated = false;
      for (const dailyTripData of tripDataTimeline) {
        if (weatherDataMap[dailyTripData.date] === undefined && dailyTripData.items[0]?.city) {
          isWeatherUpdated = true;
          try {
            const weatherApiResponse = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=9421165d458f483f88d15158261504&q=${dailyTripData.items[0].city}&dt=${dailyTripData.date}&lang=zh`);
            const weatherApiJson = await weatherApiResponse.json();
            if (weatherApiJson?.forecast?.forecastday?.[0]) {
              const dailyWeatherData = weatherApiJson.forecast.forecastday[0].day;
              pendingWeatherData[dailyTripData.date] = `${dailyWeatherData.condition.text} ${dailyWeatherData.maxtemp_c}℃~${dailyWeatherData.mintemp_c}℃`;
            } else {
              pendingWeatherData[dailyTripData.date] = "暂无当日天气预报";
            }
          } catch {
            pendingWeatherData[dailyTripData.date] = "暂无当日天气预报";
          }
        }
      }
      if (isWeatherUpdated && isAppMounted) {
        setWeatherDataMap(prev => ({ ...prev, ...pendingWeatherData }));
      }
    };
    fetchWeatherData();
    return () => { isAppMounted = false; };
  }, [activeDateTab, weatherRefreshTrigger]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const isAnyModalOpen = iframePreviewUrl || notePreviewText || showLocationModal || showStartTimeModal || showTransportModal || showImportModal;
    
    if (isAnyModalOpen) {
      const systemScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const currentScrollPosition = window.scrollY;
      
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${currentScrollPosition}px`;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.paddingRight = `${systemScrollbarWidth}px`;
      
      return () => {
        const scrollPosition = document.body.style.top;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.paddingRight = '';
        if (scrollPosition) {
          window.scrollTo(0, parseInt(scrollPosition || '0') * -1);
        }
      };
    }
  }, [iframePreviewUrl, notePreviewText, showLocationModal, showStartTimeModal, showTransportModal, showImportModal]);

  const updateTrip = (newTrips, newActiveTrip = tripName) => {
    setUndoStack(p => [...p, { tripData, tripName }].slice(-20));
    setRedoStack([]);
    setTripData(newTrips);
    if (newActiveTrip !== tripName) {
      setTripName(newActiveTrip);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setToastState({ show: true, message: msg, type, id: Date.now() });
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

  const scrollToElement = (id) => {
    const targetDomElement = document.getElementById(id);
    if (targetDomElement) {
      const targetElementRect = targetDomElement.getBoundingClientRect();
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetScrollPosition = targetElementRect.top + currentScrollTop - (window.innerHeight * 0.3);
      window.scrollTo({ top: targetScrollPosition, behavior: 'smooth' });
    }
  };

  const handleTripRename = () => {
    if (draftTripName.trim() && draftTripName !== tripName) {
      const newTrips = { ...tripData };
      newTrips[draftTripName] = newTrips[tripName];
      delete newTrips[tripName];
      updateTrip(newTrips, draftTripName);
      showMessage("已保存", "rename");
    }
    setIsEditingTripName(false);
    restoreZoom();
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleImportSelect = (e) => {
    const csvImportFile = e.target.files[0];
    if (!csvImportFile) return;
    const csvImportReader = new FileReader();
    csvImportReader.onload = (csvImportEvent) => {
      try {
        const csvImportText = new TextDecoder('utf-8').decode(new Uint8Array(csvImportEvent.target.result));
        const csvImportRows = csvImportText.split(/\r?\n/).filter(csvImportRowString => csvImportRowString.trim());
        const csvImportHeaders = csvImportRows[0].split(',').map(h => h.trim());
        
        const csvImportColumnMap = {
          date: csvImportHeaders.indexOf("日期"),
          order: csvImportHeaders.indexOf("序号"),
          city: csvImportHeaders.indexOf("城市/交通"),
          name: csvImportHeaders.indexOf("地点名称/出行方式"),
          locationDuration: csvImportHeaders.indexOf("时间（分）"),
          note: csvImportHeaders.indexOf("备注"),
          cost: csvImportHeaders.indexOf("费用"),
          currency: csvImportHeaders.indexOf("币种"),
          status: csvImportHeaders.indexOf("打卡状态")
        };

        const csvImportMissingHeaders = [];
        if (csvImportColumnMap.date === -1) csvImportMissingHeaders.push("日期");
        if (csvImportColumnMap.name === -1) csvImportMissingHeaders.push("地点名称");
        if (csvImportMissingHeaders.length > 0) {
          showMessage(`缺少${csvImportMissingHeaders.join('、')}`, "error");
          return;
        }

        const csvImportParsedItems = [];
        csvImportRows.slice(1).forEach((csvImportRowString, csvImportRowIndex) => {
          const csvImportRowValues = csvImportRowString.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
          const getCsvImportColumnValue = (col) => col !== -1 ? (csvImportRowValues[col] || "") : "";
          
          csvImportParsedItems.push({
            date: sanitizeDate(getCsvImportColumnValue(csvImportColumnMap.date)),
            order: parseInt(getCsvImportColumnValue(csvImportColumnMap.order)),
            city: getCsvImportColumnValue(csvImportColumnMap.city),
            name: getCsvImportColumnValue(csvImportColumnMap.name),
            locationDuration: getCsvImportColumnValue(csvImportColumnMap.locationDuration) === "" ? null : (parseInt(getCsvImportColumnValue(csvImportColumnMap.locationDuration)) || 0),
            note: getCsvImportColumnValue(csvImportColumnMap.note) || null,
            cost: getCsvImportColumnValue(csvImportColumnMap.cost) === "" ? null : (parseFloat(getCsvImportColumnValue(csvImportColumnMap.cost)) || 0),
            currency: getCsvImportColumnValue(csvImportColumnMap.currency) || null,
            isLocationChecked: getCsvImportColumnValue(csvImportColumnMap.status) === "是"
          });
        });

        const csvImportProcessedItems = [];
        const csvImportItemByDate = {};
        csvImportParsedItems.forEach(item => {
          if (!csvImportItemByDate[item.date]) csvImportItemByDate[item.date] = [];
          csvImportItemByDate[item.date].push(item);
        });

        Object.keys(csvImportItemByDate).forEach(date => {
          const sameDayLocationsForTimeline = csvImportItemByDate[date];
          let csvImportLocationCounter = 1;
          sameDayLocationsForTimeline.forEach((csvImportRowString, csvImportItemIndex) => {
            const isTransportNode = csvImportRowString.city === "交通" || (csvImportRowString.name && (csvImportRowString.name.includes("步行") || csvImportRowString.name.includes("公交") || csvImportRowString.name.includes("打车")));
            
            if (isTransportNode) {
              if (csvImportProcessedItems.length > 0) {
                const previousLocation = csvImportProcessedItems[csvImportProcessedItems.length - 1];
                if (csvImportRowString.name.includes("打车")) previousLocation.transportMode = 'car';
                else if (csvImportRowString.name.includes("公交")) previousLocation.transportMode = 'train';
                else previousLocation.transportMode = 'walk';
                previousLocation.transportDuration = csvImportRowString.locationDuration || 0;
              }
            } else {
              if (csvImportProcessedItems.length > 0) {
                const previousLocation = csvImportProcessedItems[csvImportProcessedItems.length - 1];
                if (previousLocation.date === csvImportRowString.date && previousLocation.transportDuration === undefined) {
                  previousLocation.transportMode = 'walk';
                  previousLocation.transportDuration = 0;
                }
              }
              csvImportProcessedItems.push({
                ...csvImportRowString,
                id: `imported-${Date.now()}-${csvImportItemIndex}`,
                order: csvImportLocationCounter++,
                locationDuration: csvImportRowString.locationDuration === null ? 0 : csvImportRowString.locationDuration,
                transportMode: 'walk',
                transportDuration: 0,
                transportRoute: '',
                isLocationChecked: csvImportRowString.isLocationChecked || false
              });
            }
          });
        });
        
        if (csvImportProcessedItems.length > 0) {
          setPendingImportData(csvImportProcessedItems);
          setShowImportModal(true); 
        } else {
          showMessage("无有效地点", "emptyImport");
        }
      } catch (err) {
        showMessage("格式解析失败", "importError");
      }
    };
    csvImportReader.readAsArrayBuffer(csvImportFile);
    e.target.value = null;
  };

  const handleImportConfirm = (mode) => {
    if (mode === 'overwrite') {
      updateTrip({ ...tripData, [tripName]: pendingImportData });
    } else {
      updateTrip({ ...tripData, [tripName]: [...(currentTripData || []), ...pendingImportData] });
    }
    setShowImportModal(false);
    setPendingImportData([]);
    showMessage("导入成功", "import");
  };

  const handleExport = () => {
    const csvExportHeaders = ["日期", "序号", "城市/交通", "地点名称/出行方式", "时间（分）", "备注", "费用", "币种", "打卡状态"];
    
    const csvExportGroups = {};
    sanitizedTripData.sort((a,b) => new Date(a.date) - new Date(b.date) || a.order - b.order).forEach(item => {
       if (!csvExportGroups[item.date]) csvExportGroups[item.date] = [];
       csvExportGroups[item.date].push(item);
    });
    
    const csvExportRows = [];
    Object.values(csvExportGroups).forEach(csvExportGroupedItems => {
       csvExportGroupedItems.forEach((item, dailyTripDataItemIndex) => {
          csvExportRows.push([
            item.date, item.order, item.city || "", `"${(item.name || "").replace(/"/g, '""')}"`, item.locationDuration || 0, `"${(item.note || "").replace(/"/g, '""')}"`, item.cost || "", item.cost ? (item.currency || "") : "", item.isLocationChecked ? "是" : "否"
          ].join(','));
          if (dailyTripDataItemIndex < csvExportGroupedItems.length - 1) {
            const csvExportTransportMode = TRANSPORT_MODE[item.transportMode || 'walk'].label;
            csvExportRows.push([
              item.date, 0, "交通", csvExportTransportMode, item.transportDuration || 0, '""', "", "", item.isTransportChecked ? "是" : "否"
            ].join(','));
          }
       });
    });

    const csvExportText = [
      csvExportHeaders.join(','),
      ...csvExportRows
    ].join('\n');
    
    const csvExportBlob = new Blob(["\ufeff" + csvExportText], { type: 'text/csv;charset=utf-8;' });
    const csvExportLink = document.createElement("a");
    csvExportLink.href = URL.createObjectURL(csvExportBlob);
    csvExportLink.download = `${tripName}_${getCurrentDate()}.csv`;
    csvExportLink.click();
    showMessage("导出成功", "export");
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(p => p.slice(0, -1));
    setRedoStack(f => [{ tripData, tripName }, ...f]);
    setTripData(previous.tripData);
    setTripName(previous.tripName);
    showMessage("已撤销", "undo");
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack(f => f.slice(1));
    setUndoStack(p => [...p, { tripData, tripName }]);
    setTripData(next.tripData);
    setTripName(next.tripName);
    showMessage("已重做", "redo");
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setExpandedOverviewDateMap({});
    setWeatherDataMap({});
    setWeatherRefreshTrigger(prev => prev + 1);
    setCurrentTime(new Date());
    showMessage("已刷新", "refresh");
  };

  const handleLocate = () => {
    const getGroupedTripData = (tabName) => {
      const sortedTripData = [...(tripData[tripName] || [])].map(item => ({ ...item, date: sanitizeDate(item.date) })).sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        return (a.order || 0) - (b.order || 0);
      });
      const groupedTripDataWithTime = {};
      sortedTripData.forEach(item => {
        if (!groupedTripDataWithTime[item.date]) groupedTripDataWithTime[item.date] = { date: item.date, items: [] };
        groupedTripDataWithTime[item.date].items.push(item);
      });
      let filteredTimelineResult = Object.values(groupedTripDataWithTime).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (tabName !== "Total") filteredTimelineResult = filteredTimelineResult.filter(g => g.date === tabName);
      return filteredTimelineResult;
    };

    const currentDateTabGroups = getGroupedTripData(activeDateTab);
    for (const dailyTripData of currentDateTabGroups) {
      for (const [dailyTripDataItemIndex, item] of dailyTripData.items.entries()) {
        if (!item.isLocationChecked) {
          scrollToElement(`location-${item.id}`);
          return;
        }
        if (dailyTripDataItemIndex < dailyTripData.items.length - 1 && !item.isTransportChecked) {
          scrollToElement(`transport-${item.id}`);
          return;
        }
      }
    }

    const totalTripData = getGroupedTripData("Total");
    for (const dailyTripData of totalTripData) {
      for (const [dailyTripDataItemIndex, item] of dailyTripData.items.entries()) {
        if (!item.isLocationChecked) {
          setActiveDateTab(dailyTripData.date);
          setTimeout(() => scrollToElement(`location-${item.id}`), 100);
          return;
        }
        if (dailyTripDataItemIndex < dailyTripData.items.length - 1 && !item.isTransportChecked) {
          setActiveDateTab(dailyTripData.date);
          setTimeout(() => scrollToElement(`transport-${item.id}`), 100);
          return;
        }
      }
    }

    showMessage("已全部打卡", "allDone");
  };

  const handleOverviewToggle = (date) => {
    setExpandedOverviewDateMap(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleLocationCheck = (id) => {
    const checkedLocationIndex = currentTripData.findIndex(item => item.id === id);
    if (checkedLocationIndex === -1) return;
    const newCheckState = !currentTripData[checkedLocationIndex].isLocationChecked;
    let checkedTripData = currentTripData.map(item => item.id === id ? { ...item, isLocationChecked: newCheckState } : item);
    if (newCheckState) {
      const item = checkedTripData[checkedLocationIndex];
      const sameDayLocationsForTimeline = checkedTripData.filter(i => i.date === item.date).sort((a,b) => (a.order||0) - (b.order||0));
      const checkedLocationIndexByDate = sameDayLocationsForTimeline.findIndex(i => i.id === id);
      const previousLocationNode = sameDayLocationsForTimeline[checkedLocationIndexByDate - 1];
      const nextLocationNode = sameDayLocationsForTimeline[checkedLocationIndexByDate + 1];
      if (previousLocationNode && previousLocationNode.isLocationChecked) checkedTripData = checkedTripData.map(i => i.id === previousLocationNode.id ? { ...i, isTransportChecked: true } : i);
      if (nextLocationNode && nextLocationNode.isLocationChecked) checkedTripData = checkedTripData.map(i => i.id === item.id ? { ...i, isTransportChecked: true } : i);
    } else {
      const item = checkedTripData[checkedLocationIndex];
      const sameDayLocationsForTimeline = checkedTripData.filter(i => i.date === item.date).sort((a,b) => (a.order||0) - (b.order||0));
      const checkedLocationIndexByDate = sameDayLocationsForTimeline.findIndex(i => i.id === id);
      const previousLocationNode = sameDayLocationsForTimeline[checkedLocationIndexByDate - 1];
      if (previousLocationNode) checkedTripData = checkedTripData.map(i => i.id === previousLocationNode.id ? { ...i, isTransportChecked: false } : i);
      checkedTripData = checkedTripData.map(i => i.id === item.id ? { ...i, isTransportChecked: false } : i);
    }
    updateTrip({ ...tripData, [tripName]: checkedTripData });
  };

  const handleLocationAdd = () => {
    setLocationModalMode('add'); 
    const editedLocationDate = activeDateTab !== 'Total' ? activeDateTab : getCurrentDate();
    setLocationFormData({ name: '', date: editedLocationDate, locationDuration: '60', city: '', note: '', cost: '', currency: '', order: '1', transportMode: 'walk', transportRoute: '' }); 
    setShowLocationModal(true); 
  };

  const handleLocationEdit = (item) => {
    setLocationModalMode('edit');
    setEditingLocationId(item.id);
    setLocationFormData({ 
      ...item, 
      locationDuration: String(item.locationDuration), 
      cost: item.cost ? String(item.cost) : '', 
      currency: item.cost ? item.currency : '',
      order: String(item.order),
      transportRoute: item.transportRoute || ''
    });
    setShowLocationModal(true);
  };

  const handleLocationSave = (e) => {
    e.preventDefault();
    const editedLocationPayload = {
      ...locationFormData,
      locationDuration: locationFormData.locationDuration === "" ? 0 : (parseInt(locationFormData.locationDuration) || 0),
      cost: parseFloat(locationFormData.cost) || 0,
      order: parseInt(locationFormData.order) || 1,
    };
    setLastSelectedCurrency(locationFormData.currency);

    const editedLocationDate = sanitizeDate(locationFormData.date);
    const editedLocationOrder = editedLocationPayload.order;
    let editedTripData = [...currentTripData];

    let sameDayLocations = currentTripData.filter(item => sanitizeDate(item.date) === editedLocationDate && item.id !== (locationModalMode === 'edit' ? editingLocationId : null));
    
    let precedingLocations = sameDayLocations.filter(item => item.order < editedLocationOrder).sort((a,b) => a.order - b.order);
    let succeedingLocations = sameDayLocations.filter(item => item.order >= editedLocationOrder).sort((a,b) => a.order - b.order);
    
    let precedingLocationCount = precedingLocations.length;
    let updatedOrderMap = {};
    
    let currentOrderIndex = 1;
    precedingLocations.forEach(item => { updatedOrderMap[item.id] = currentOrderIndex++; });
    
    editedLocationPayload.order = precedingLocationCount + 1;
    
    currentOrderIndex = precedingLocationCount + 2;
    succeedingLocations.forEach(item => { updatedOrderMap[item.id] = currentOrderIndex++; });

    if (locationModalMode === 'add') {
      const newLocation = { ...editedLocationPayload, id: `manual-${Date.now()}`, isLocationChecked: false };
      editedTripData = editedTripData.map(item => updatedOrderMap[item.id] !== undefined ? { ...item, order: updatedOrderMap[item.id] } : item);
      editedTripData.push(newLocation);
      showMessage("已添加", "add");
    } else {
      editedTripData = editedTripData.map(item => {
        if (item.id === editingLocationId) return { ...item, ...editedLocationPayload };
        if (updatedOrderMap[item.id] !== undefined) return { ...item, order: updatedOrderMap[item.id] };
        return item;
      });
      showMessage("已保存", "edit");
    }
    
    updateTrip({ ...tripData, [tripName]: editedTripData });
    setShowLocationModal(false);
    restoreZoom();
  };

  const handleLocationDelete = (id) => {
    const remainingItems = currentTripData.filter(item => item.id !== id).map(item => ({...item}));
    
    const csvImportItemByDate = {};
    remainingItems.forEach(item => {
      if (!csvImportItemByDate[item.date]) csvImportItemByDate[item.date] = [];
      csvImportItemByDate[item.date].push(item);
    });
    
    Object.keys(csvImportItemByDate).forEach(date => {
      csvImportItemByDate[date].sort((a, b) => parseInt(a.order || 0) - parseInt(b.order || 0));
      let counter = 1;
      csvImportItemByDate[date].forEach(item => {
        if (parseInt(item.order) !== 0) {
          item.order = counter++;
        }
      });
    });
    
    updateTrip({ ...tripData, [tripName]: remainingItems });
    showMessage("已删除", "delete");
  };

  const handleLocationPreviewMap = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    setIframePreviewUrl(`https://maps.google.com/maps?q=${query}&output=embed`);
  };

  const handleLocationOpenMap = (name, city) => {
    const query = encodeURIComponent(`${name} ${city}`);
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
  };

  const handleTransportCheck = (id) => {
    const checkedTripData = currentTripData.map(item => item.id === id ? { ...item, isTransportChecked: !item.isTransportChecked } : item);
    updateTrip({ ...tripData, [tripName]: checkedTripData });
  };

  const handleTransportEdit = (item) => {
    setEditingTransportId(item.id);
    setTransportFormData(String(item.transportDuration || 0));
    setShowTransportModal(true);
  };

  const handleTransportSave = (e) => {
    e.preventDefault();
    const editedTripData = currentTripData.map(item => {
      if (item.id === editingTransportId) {
        return { ...item, transportDuration: parseInt(transportFormData) || 0 };
      }
      return item;
    });
    updateTrip({ ...tripData, [tripName]: editedTripData });
    setShowTransportModal(false);
    restoreZoom();
    showMessage("已保存", "edit");
  };

  const handleTransportChangeMode = (id, mode) => {
    const editedTripData = currentTripData.map(item => item.id === id ? { ...item, transportMode: mode } : item);
    updateTrip({ ...tripData, [tripName]: editedTripData });
  };

  const handleStartTimeEdit = (date) => {
    setStartTimeFormData({ date: date, time: dailyStartTimeMap[tripName]?.[date] || "08:00" });
    setShowStartTimeModal(true);
  };

  const handleStartTimeSave = (e) => {
    e.preventDefault();
    setDailyStartTimeMap(prev => ({
      ...prev,
      [tripName]: { ...(prev[tripName] || {}), [startTimeFormData.date]: startTimeFormData.time }
    }));
    setShowStartTimeModal(false);
    restoreZoom();
  };

  const isMobileView = deviceViewMode === 'mobile' || isWindowNarrow;
  
  const bodyThemeClasses = isDarkMode ? 'bg-[#000000] text-white' : 'bg-[#e8e4d9] text-[#2c241b]';
  const containerThemeClasses = isDarkMode ? 'bg-[#0f1115]' : 'bg-[#fdfbf7]';
  
  const containerWrapperClasses = isMobileView 
    ? `max-w-[430px] w-full mx-auto min-h-[100dvh] relative shadow-2xl transition-colors duration-[400ms] overflow-hidden ${containerThemeClasses}` 
    : `w-full min-h-[100dvh] relative transition-colors duration-[400ms] overflow-hidden ${containerThemeClasses}`;

  const currentYear = currentTime.getFullYear();
  const currentMonth = String(currentTime.getMonth() + 1).padStart(2, '0');
  const currentDay = String(currentTime.getDate()).padStart(2, '0');
  const currentDateString = `${currentYear}-${currentMonth}-${currentDay}`;
  const currentTimeString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={`font-sans transition-colors duration-[400ms] flex justify-center select-none ${bodyThemeClasses}`}>
      <div className={containerWrapperClasses}>
        
        {isAppLoading && (
          <div className="fixed inset-0 flex items-center justify-center z-[999] bg-inherit">
            <RefreshCw className={`w-10 h-10 animate-spin ${isDarkMode ? 'text-white' : 'text-gray-800'}`} />
          </div>
        )}

        <div className={isAppLoading ? 'opacity-0 pointer-events-none' : 'transition-opacity duration-500 opacity-100'}>
          {toastState.show && (
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
                  delete: { icon: Trash2, color: 'text-red-500' },
                  add: { icon: MapPinPlusInside, color: 'text-green-500' },
                  edit: { icon: SquarePen, color: 'text-green-500' },
                  rename: { icon: NotebookPen, color: 'text-green-500' },
                  refresh: { icon: RefreshCw, color: 'text-yellow-500' },
                  error: { icon: MapPinXInside, color: 'text-red-500' }
                };
                const config = IconMap[toastState.type] || { icon: Sparkles, color: 'text-yellow-500' };
                const Icon = config.icon;
                return <Icon className={`w-4 h-4 ${config.color}`} />;
              })()}
              <span className="text-sm font-bold">{toastState.message}</span>
            </div>
          )}

          {iframePreviewUrl && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 fade-in duration-300">
               <div className={`fixed -inset-[200px] backdrop-blur-sm ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`} onClick={() => setIframePreviewUrl(null)}></div>
               <div className={`relative w-[95vw] h-[75dvh] rounded-[2rem] overflow-hidden border-4 transition-colors duration-[400ms] ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                  <button onClick={() => setIframePreviewUrl(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <iframe 
                    key={iframePreviewUrl}
                    title="Preview"
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{ 
                      border: 0
                    }} 
                    src={iframePreviewUrl} 
                    allowFullScreen>
                  </iframe>
               </div>
            </div>
          )}

          {notePreviewText && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in zoom-in-95 fade-in duration-300">
               <div className={`fixed -inset-[200px] backdrop-blur-sm ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`} onClick={() => setNotePreviewText(null)}></div>
               <div className={`relative w-[95vw] max-h-[75dvh] overflow-y-auto rounded-[2rem] p-8 border-4 transition-colors duration-[400ms] ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                  <button onClick={() => setNotePreviewText(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <div className={`text-2xl font-semibold whitespace-pre-wrap break-all select-text leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {notePreviewText}
                  </div>
               </div>
            </div>
          )}

          <div className="pb-[42px] min-h-[100dvh] flex flex-col relative">
            
            <header className={`${isMobileView ? 'px-3' : 'px-6'} py-4 space-y-4`}>
              <div className="flex justify-between items-center gap-2">
                {isEditingTripName ? (
                  <input 
                    autoFocus
                    className={`w-1/2 min-w-0 flex-1 bg-transparent border-b border-blue-500 outline-none text-2xl font-semibold truncate transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    value={draftTripName}
                    onChange={(e) => setDraftTripName(e.target.value)}
                    onBlur={handleTripRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleTripRename()}
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0 group cursor-pointer" onClick={() => { setDraftTripName(tripName); setIsEditingTripName(true); }}>
                    <h1 className="text-2xl font-semibold truncate">{tripName}</h1>
                    <NotebookPen className={`w-4 h-4 opacity-0 group-hover:opacity-70 transition-opacity shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                )}

                <div className={`flex backdrop-blur-xl rounded-2xl p-1 shrink-0 border transition-colors duration-[400ms] ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-200/50 border-gray-300'}`}>
                  <button onClick={handleThemeToggle} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}>
                    {isDarkMode ? <Moon className="w-4 h-4 text-yellow-400" /> : <Sun className="w-4 h-4 text-orange-500" />}
                  </button>
                  <button onClick={() => setDeviceViewMode(deviceViewMode === 'mobile' ? 'web' : 'mobile')} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}>
                    {deviceViewMode === 'mobile' ? <Monitor className="w-4 h-4 text-gray-400" /> : <Smartphone className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-black cursor-pointer hover:bg-blue-500/20 transition-all">
                  <Download className="w-4 h-4" /> 导入
                  <input type="file" accept=".csv" onChange={handleImportSelect} className="hidden" />
                </label>
                <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20 text-xs font-black hover:bg-green-500/20 transition-all">
                  <Upload className="w-4 h-4" /> 导出
                </button>
                <button onClick={handleUndo} disabled={undoStack.length === 0} className={`w-10 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white disabled:opacity-20' : 'bg-white border-gray-300 text-gray-700 disabled:opacity-30'}`}>
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} className={`w-10 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white disabled:opacity-20' : 'bg-white border-gray-300 text-gray-700 disabled:opacity-30'}`}>
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </header>

            <nav className={`${isMobileView ? 'px-3' : 'px-6'} py-4 flex gap-2 overflow-x-auto no-scrollbar items-center shrink-0`}>
              <button 
                onClick={() => setActiveDateTab('Total')} 
                className={`relative flex items-center justify-center whitespace-nowrap shrink-0 h-[40px] w-[72px] rounded-xl text-xs font-black transition-all border border-solid box-border ${
                  activeDateTab === 'Total' 
                    ? (isDarkMode ? 'bg-white text-black shadow-lg border-transparent' : 'bg-gray-800 text-white shadow-lg border-transparent') 
                    : (isDarkMode ? 'bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/40' : 'bg-white shadow-sm border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300')
                }`}
              >
                全部
              </button>

              {tripDataDates.map(date => (
                <button 
                  key={date} 
                  onClick={() => setActiveDateTab(date)} 
                  className={`relative flex items-center justify-center whitespace-nowrap shrink-0 h-[40px] w-[72px] rounded-xl text-xs font-black transition-all border border-solid box-border ${
                    activeDateTab === date 
                      ? (isDarkMode ? 'bg-white text-black shadow-lg border-transparent' : 'bg-gray-800 text-white shadow-lg border-transparent') 
                      : (isDarkMode ? 'bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/40' : 'bg-white shadow-sm border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300')
                  }`}
                >
                  {date.split('-').slice(1).join('/')}
                </button>
              ))}
            </nav>

            <div className={`${isMobileView ? 'px-3' : 'px-6'} mt-2 flex gap-2`}>
              <div className="relative flex-1 group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 group-hover:opacity-100 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索" 
                  className={`appearance-none w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold transition-all outline-none border text-opacity-50 group-hover:text-opacity-100 placeholder:opacity-50 group-hover:placeholder:opacity-100 ${isDarkMode ? 'bg-white/5 shadow-sm text-white border-white/10' : 'bg-white focus:bg-white shadow-sm text-gray-900 border-gray-300'}`}
                />
              </div>
              <button onClick={handleRefresh} className={`group p-3 rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 shadow-sm text-white border-white/10' : 'bg-white shadow-sm text-gray-700 border-gray-300'}`}>
                <RefreshCw className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              </button>
              <button onClick={handleLocationAdd} className={`group p-3 rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 shadow-sm text-white border-white/10' : 'bg-white shadow-sm text-gray-700 border-gray-300'}`}>
                <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              </button>
            </div>

            <main className={`${isMobileView ? 'px-3' : 'px-6'} py-6`}>
              {tripDataTimeline.length === 0 ? (
                <div className="py-20 text-center opacity-60 flex flex-col items-center gap-4">
                   <Sparkles className="w-12 h-12" />
                   <p className="text-xs font-bold uppercase tracking-widest">暂无行程计划，开始添加吧</p>
                </div>
              ) : tripDataTimeline.map((dailyTripData) => {
                const isOverviewExpanded = expandedOverviewDateMap[dailyTripData.date]; 
                const formattedDateString = dailyTripData.date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日');
                
                return (
                  <div key={dailyTripData.date} className="mb-[18px]">
                    <div className="mb-[12px]">
                      <div className="flex items-center mb-[20px]">
                        <span className="text-[10px] font-black px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-500 dark:text-blue-400 rounded uppercase tracking-widest">{dailyTripData.date}</span>
                        <div className={`h-px flex-1 mx-3 transition-colors duration-[400ms] ${isDarkMode ? 'bg-white/5' : 'bg-gray-300'}`} />
                        {weatherDataMap[dailyTripData.date] && (
                          <div 
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all hover:opacity-80 ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-black/5 text-gray-800'}`}
                            onClick={() => {
                              if (dailyTripData.items[0]?.city) {
                                setIframePreviewUrl(`https://www.google.com/search?q=${encodeURIComponent(dailyTripData.items[0].city + ' ' + formattedDateString + ' 天气')}&igu=1&hl=zh-CN&gl=CN`);
                              }
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-xs font-black whitespace-nowrap">{weatherDataMap[dailyTripData.date]}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={() => handleOverviewToggle(dailyTripData.date)} className={`flex-1 flex justify-between items-center px-4 py-3 rounded-2xl border border-dashed transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-white bg-white/60'}`}>
                           <span className="text-xs font-semibold opacity-80">当日行程总览（{dailyTripData.items.length}个地点）</span>
                           {isOverviewExpanded ? <ChevronUp className="w-4 h-4 opacity-60"/> : <ChevronDown className="w-4 h-4 opacity-60"/>}
                        </button>
                        <button onClick={() => handleStartTimeEdit(dailyTripData.date)} className={`px-3 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed transition-all shrink-0 ${isDarkMode ? 'bg-white/[0.03] border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-white bg-white/50'}`}>
                           <Clock className="w-4 h-4 opacity-60"/>
                           <span className="text-xs font-black opacity-80">{dailyStartTimeMap[tripName]?.[dailyTripData.date] || "08:00"}</span>
                        </button>
                      </div>
                      
                      {isOverviewExpanded && (
                        <div className={`mt-2 p-4 rounded-2xl shadow-sm text-[11px] font-bold leading-loose flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
                          {dailyTripData.items.length >= 2 && (
                            <div className={`w-full ${isMobileView ? 'aspect-[4/3]' : 'h-[75dvh]'} rounded-xl overflow-hidden mb-2 border-4 transition-colors duration-[400ms] ${isDarkMode ? 'border-white/10 bg-[#1a1d23]' : 'border-gray-200 bg-white'} shadow-2xl`}>
                              <iframe 
                                title="Daily Route"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                src={`https://maps.google.com/maps?saddr=${encodeURIComponent(dailyTripData.items[0].name + ' ' + (dailyTripData.items[0].city || ''))}&daddr=${encodeURIComponent(dailyTripData.items.slice(1).map(i => i.name + ' ' + (i.city || '')).join(' to:'))}&output=embed`} 
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}
                          {dailyTripData.items.map((i, dailyTripDataItemIndex) => (
                             <span key={dailyTripDataItemIndex} className={`block select-text ${i.isLocationChecked ? 'line-through opacity-40' : ''}`}>
                               {i.order}. {i.name}（{i.startTimeString} - {i.endTimeString}）
                             </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative space-y-0">
                      {dailyTripData.items.map((item, dailyTripDataItemIndex) => (
                        <div key={item.id} id={`location-${item.id}`} className="relative mb-0">
                          
                          {dailyTripDataItemIndex < dailyTripData.items.length - 1 && (
                            <div className={`absolute left-[27px] top-[36px] -bottom-[40px] z-0 transition-colors duration-[400ms] ${(dailyTripData.date < currentDateString || (dailyTripData.date === currentDateString && item.endTimeString <= currentTimeString)) ? `border-l-[2px] border-dotted w-0 ${isDarkMode ? 'border-white/30' : 'border-gray-400'} bg-transparent` : `w-[2px] ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`}`} />
                          )}

                          <div className={`relative flex ${isMobileView ? 'gap-2' : 'gap-4'} group z-10 pt-2`}>
                            <div className="flex flex-col items-center w-14 shrink-0 bg-transparent">
                              <button 
                                onPointerDown={() => setActivePressId(item.id)}
                                onPointerUp={() => setActivePressId(null)}
                                onPointerLeave={() => setActivePressId(null)}
                                onPointerCancel={() => setActivePressId(null)}
                                onClick={() => handleLocationCheck(item.id)} 
                                className="relative z-10 w-10 h-10 flex items-center justify-center cursor-pointer outline-none touch-manipulation bg-transparent border-none p-0 appearance-none"
                              >
                                <div className={`relative w-9 h-9 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all duration-300 shadow-lg transform hover:scale-110 ${activePressId === item.id ? 'scale-90' : 'scale-100'} ${
                                  item.isLocationChecked 
                                    ? 'bg-gray-500 border-gray-500/20 text-white' 
                                    : (isDarkMode ? 'bg-[#0f1115] text-blue-500 border-blue-500' : 'bg-[#fdfbf7] text-blue-600 border-blue-500')
                                }`}>
                                  <span 
                                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${
                                      item.isLocationChecked ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45'
                                    }`}
                                  >
                                    <CheckCircle className="w-5 h-5"/>
                                  </span>

                                  <span 
                                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${
                                      item.isLocationChecked ? 'opacity-0 scale-150' : 'opacity-100 scale-100'
                                    }`}
                                  >
                                    {item.order}
                                  </span>
                                </div>
                              </button>
                              <div className={`mt-2 text-[10px] font-black opacity-80 tabular-nums relative z-10 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm border ${isDarkMode ? 'bg-white/5 border-white/[0.08]' : 'bg-[#fdfbf7]/80 border-gray-200/80'}`}>
                                {item.startTimeString}
                              </div>
                            </div>

                            <div className={`relative z-20 flex-1 mb-2 p-4 rounded-[1.5rem] border shadow-sm transition-all duration-300 transform-gpu ${activePressId === item.id ? 'scale-95' : 'scale-100'} ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200'} ${item.isLocationChecked ? 'opacity-50' : ''}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className={`font-semibold text-sm leading-snug select-text ${item.isLocationChecked ? 'line-through opacity-70' : ''}`}>{item.name}</h3>
                                  {item.city && (
                                    <div className="flex items-center gap-1 mt-1 opacity-80">
                                      <MapPin className="w-3 h-3" />
                                      <span className="text-[9px] font-normal uppercase translate-y-[1px]">{item.city}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => handleLocationPreviewMap(item.name, item.city)} className={`p-2 rounded-xl hover:scale-105 transition-all flex items-center ${isDarkMode ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}>
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleLocationOpenMap(item.name, item.city)} className={`p-2 rounded-xl hover:scale-105 transition-all flex items-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                    <Map className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {item.note && (() => {
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const urls = item.note.match(urlRegex);
                                if (!urls) {
                                  return (
                                    <div 
                                      onClick={() => setNotePreviewText(item.note)}
                                      className={`mt-3 mb-3 text-[12px] font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all whitespace-pre-wrap break-all leading-relaxed border-l-2 select-text ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border-white/10' : 'text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-300'}`}
                                    >
                                      {item.note}
                                    </div>
                                  );
                                }
                                
                                const textPart = item.note.replace(urlRegex, '\n').split('\n').map(s => s.trim()).filter(Boolean).join('\n');
                                
                                return (
                                  <div className="mt-3 mb-3 flex flex-col gap-2 items-start w-full min-w-0">
                                    {textPart && (
                                      <div 
                                        onClick={() => setNotePreviewText(item.note)}
                                        className={`w-full text-[12px] font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all whitespace-pre-wrap break-all leading-relaxed border-l-2 select-text ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border-white/10' : 'text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-300'}`}
                                      >
                                        {textPart}
                                      </div>
                                    )}
                                    {urls.map((url, i) => (
                                      <div key={i} onClick={() => setIframePreviewUrl(url)} className={`text-[12px] font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all border-l-2 truncate w-full block select-text ${isDarkMode ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-300'}`}>
                                        {url.length > 28 ? url.substring(0, 20) + '...' + url.slice(-8) : url}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              
                              <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex gap-3 text-[10px] font-bold">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-[400ms] ${isDarkMode ? 'text-green-500 bg-green-500/10' : 'text-green-700 bg-green-100'} text-[10px] font-bold`}><Clock className="w-3 h-3" /> {item.locationDuration >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999m+' : '999999m+') : item.locationDuration + 'm'}</div>
                                  {item.cost > 0 && <div className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-[400ms] ${isDarkMode ? 'text-orange-400 bg-orange-400/10' : 'text-orange-600 bg-orange-100'}`}><Wallet className="w-3 h-3" /> {item.cost >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999+' : '999999+') : item.cost} {item.currency}</div>}
                                </div>
                                
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleLocationEdit(item)} className={`p-1.5 rounded-lg hover:scale-105 transition-all flex items-center justify-center ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}>
                                    <SquarePen className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleLocationDelete(item.id)} className={`p-1.5 rounded-lg hover:scale-105 transition-all flex items-center justify-center ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {dailyTripDataItemIndex < dailyTripData.items.length - 1 && (
                            <div key={`transport-${item.id}`} id={`transport-${item.id}`} className={`flex ${isMobileView ? 'gap-2' : 'gap-4'} py-1.5 items-center relative z-10 group`}>
                              <div className="w-14 shrink-0 bg-transparent flex flex-col items-center justify-center relative z-20 -translate-y-5">
                                <button 
                                  onPointerDown={() => setActivePressId(`transport-${item.id}`)}
                                  onPointerUp={() => setActivePressId(null)}
                                  onPointerLeave={() => setActivePressId(null)}
                                  onPointerCancel={() => setActivePressId(null)}
                                  onClick={() => handleTransportCheck(item.id)} 
                                  className="relative z-20 w-10 h-10 flex items-center justify-center cursor-pointer outline-none touch-manipulation bg-transparent border-none p-0 appearance-none"
                                >
                                  <div className={`relative w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-lg transform hover:scale-110 ${activePressId === `transport-${item.id}` ? 'scale-90' : 'scale-100'} ${
                                    item.isTransportChecked 
                                      ? 'bg-gray-500 border-gray-500/20 text-white' 
                                      : (isDarkMode ? 'bg-[#0f1115] text-yellow-500 border-yellow-500' : 'bg-[#fdfbf7] text-yellow-600 border-yellow-500')
                                  }`}>
                                    <span 
                                      className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${
                                        item.isTransportChecked ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45'
                                      }`}
                                    >
                                      <CheckCircle className="w-4 h-4"/>
                                    </span>
                                  </div>
                                </button>
                                <div className={`mt-2 text-[10px] font-black opacity-80 tabular-nums relative z-10 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm border ${isDarkMode ? 'bg-white/5 border-white/[0.08]' : 'bg-[#fdfbf7]/80 border-gray-200/80'}`}>
                                  {item.endTimeString}
                                </div>
                              </div>
                              <div className={`relative z-20 flex-1 flex items-center justify-between px-3 py-3.5 rounded-xl border border-dashed shadow-sm transition-all duration-300 transform-gpu ${activePressId === `transport-${item.id}` ? 'scale-95' : 'scale-100'} ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-white/60 border-gray-200'} ${item.isTransportChecked ? 'opacity-50' : ''}`}>
                                <div className="flex items-center min-w-0">
                                  <div className={`ml-1 flex items-center gap-1 px-2 py-1 rounded-lg transition-colors duration-[400ms] ${isDarkMode ? 'text-green-500 bg-green-500/10' : 'text-green-700 bg-green-100'} text-[10px] font-bold`}>
                                    <Clock className="w-3 h-3" /> {(item.transportDuration || 0) >= (isMobileView ? 1000 : 1000000) ? (isMobileView ? '999m+' : '999999m+') : (item.transportDuration || 0) + 'm'}
                                  </div>
                                </div>
                                <div className={`flex items-center shrink-0 ${isMobileView ? 'gap-2' : 'gap-3'}`}>
                                  <button onClick={() => handleTransportEdit(item)} className={`p-1.5 rounded-lg hover:scale-105 transition flex items-center justify-center ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}>
                                    <SquarePen className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="flex gap-1 shrink-0">
                                    {Object.entries(TRANSPORT_MODE).map(([mode, config]) => {
                                      const isActive = item.transportMode === mode;
                                      const Icon = config.icon;
                                      return (
                                        <button 
                                          key={mode} 
                                          onClick={() => handleTransportChangeMode(item.id, mode)} 
                                          className={`p-1.5 rounded-lg transition transform-gpu flex items-center justify-center ${isActive ? `${isDarkMode ? config.darkClass : config.lightClass} scale-110 shadow-sm` : 'text-gray-500 opacity-70 hover:opacity-100 hover:scale-105'}`}
                                          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                        >
                                          <Icon className="w-3.5 h-3.5 block" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <button 
                                    onClick={() => {
                                      const endItem = dailyTripData.items[dailyTripDataItemIndex+1];
                                      const transportMapOrigin = encodeURIComponent(`${item.name} ${item.city || ''}`);
                                      const transportMapDestination = encodeURIComponent(`${endItem.name} ${endItem.city || ''}`);
                                      const directionFlagMap = { walk: 'w', car: 'd', train: 'r' };
                                      const currentDirectionFlag = directionFlagMap[item.transportMode || 'train'];
                                      setIframePreviewUrl(`https://maps.google.com/maps?saddr=${transportMapOrigin}&daddr=${transportMapDestination}&dirflg=${currentDirectionFlag}&output=embed`);
                                    }}
                                    className={`${isMobileView ? 'px-2.5' : 'px-4'} py-1.5 rounded-lg text-[11px] font-black transition hover:scale-105 flex items-center gap-1 shrink-0 ${
                                      isDarkMode ? TRANSPORT_MODE[item.transportMode || 'walk'].darkClass : TRANSPORT_MODE[item.transportMode || 'walk'].lightClass
                                    }`}
                                  >
                                    <Route className="w-3.5 h-3.5" />
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
          </div>

          <div className={`fixed bottom-[20px] sm:bottom-6 flex justify-end ${isMobileView ? 'px-3' : 'px-6'} pointer-events-none z-[60] left-1/2 -translate-x-1/2 ${isMobileView ? 'max-w-[430px] w-full' : 'w-full'}`}>
            <button 
              onClick={handleLocate} 
              className={`pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-[0_4px_15px_rgb(37,99,235,0.4)] sm:shadow-[0_8px_30px_rgb(37,99,235,0.4)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all ${isMobileView ? 'mr-3' : 'mr-6'}`}
            >
              <Locate className="w-6 h-6" />
            </button>
          </div>

          {showLocationModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-in fade-in">
              <div className={`fixed -inset-[200px] backdrop-blur-sm -z-10 ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`}></div>
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <div className="w-full max-w-md relative">
                <form onSubmit={handleLocationSave} className={`relative z-[112] w-full max-h-[90dvh] overflow-y-auto overscroll-none rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-[calc(3rem+env(safe-area-inset-bottom))] shadow-2xl transition-colors duration-[400ms] ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-[14px] sticky top-0 bg-inherit py-2 z-10">
                    <h2 className={`text-xl font-black transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationModalMode === 'add' ? '添加地点' : '编辑地点'}</h2>
                    <button type="button" onClick={() => { setShowLocationModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-[400ms] ${isDarkMode ? 'bg-white/5 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-[1fr_80px] gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>地点名称</label>
                        <input required 
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          onInvalid={e => e.target.setCustomValidity('请填写')}
                          onInput={e => e.target.setCustomValidity('')}
                          className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={locationFormData.name} onChange={e => setLocationFormData({...locationFormData, name: e.target.value})} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>序号</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" 
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={locationFormData.order} onChange={e => setLocationFormData({...locationFormData, order: e.target.value.replace(/[^0-9]/g, '')})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>日期</label>
                        <input 
                          type="date" 
                          required 
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          onInvalid={e => e.target.setCustomValidity('请填写')}
                          onInput={e => e.target.setCustomValidity('')}
                          className={`w-full min-w-0 h-12 pl-4 pr-3 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border appearance-none transition-colors duration-[400ms] [&::-webkit-calendar-picker-indicator]:invert-[0.6] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={locationFormData.date} onChange={e => setLocationFormData({...locationFormData, date: sanitizeDate(e.target.value)})} />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>城市</label>
                        <input className={`w-full min-w-0 h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          value={locationFormData.city} onChange={e => setLocationFormData({...locationFormData, city: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                         <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>时间（分）</label>
                         <input type="text" inputMode="numeric" pattern="[0-9]*" 
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={locationFormData.locationDuration} onChange={e => setLocationFormData({...locationFormData, locationDuration: e.target.value.replace(/[^0-9]/g, '')})} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>花销</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }}
                          className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={locationFormData.cost} onChange={e => setLocationFormData({...locationFormData, cost: e.target.value.replace(/[^0-9.]/g, '')})} />
                      </div>
                      <div className="flex flex-col gap-1.5 relative">
                        <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>币种</label>
                        <div className="relative h-12">
                          <select 
                            required={parseFloat(locationFormData.cost) > 0}
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 300);
                            }}
                            onInvalid={e => e.target.setCustomValidity('请填写')}
                            onInput={e => e.target.setCustomValidity('')}
                            className={`w-full h-full px-4 pr-8 rounded-2xl text-base font-medium outline-none appearance-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value={locationFormData.currency} onChange={e => setLocationFormData({...locationFormData, currency: e.target.value})}>
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
                      <label className={`text-[10px] font-black uppercase ml-1 flex justify-between transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>
                        <span>备注</span>
                        <span className="text-blue-500 font-normal opacity-100">（支持文本/链接）</span>
                      </label>
                      <textarea className={`w-full p-4 rounded-2xl text-base font-medium min-h-[100px] outline-none resize-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 300);
                        }}
                        placeholder="例如：住宿、交通、门票、营业时间等信息"
                        value={locationFormData.note} onChange={e => setLocationFormData({...locationFormData, note: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-6 h-12 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all active:scale-[0.98] shadow-[0_0_10px_rgb(37,99,235,0.4)] sm:shadow-[0_0_20px_rgb(37,99,235,0.4)]">
                    保存
                  </button>
                </form>
              </div>
            </div>
          )}

          {showStartTimeModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-in fade-in">
              <div className={`fixed -inset-[200px] backdrop-blur-sm -z-10 ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`}></div>
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <div className="w-full max-w-md relative">
                <form onSubmit={handleStartTimeSave} className={`relative z-[112] w-full max-h-[90dvh] overflow-y-auto overscroll-none rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-[calc(3rem+env(safe-area-inset-bottom))] shadow-2xl transition-colors duration-[400ms] ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-[14px] sticky top-0 bg-inherit py-2 z-10">
                    <h2 className={`text-xl font-black transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>编辑时间</h2>
                    <button type="button" onClick={() => { setShowStartTimeModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-[400ms] ${isDarkMode ? 'bg-white/5 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>当日出发时间</label>
                      <input 
                        type="time" 
                        required 
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 300);
                        }}
                        onInvalid={e => e.target.setCustomValidity('请填写')}
                        onInput={e => e.target.setCustomValidity('')}
                        className={`w-full min-w-0 h-12 pl-4 pr-3 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border appearance-none transition-colors duration-[400ms] [&::-webkit-calendar-picker-indicator]:invert-[0.6] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={startTimeFormData.time} onChange={e => setStartTimeFormData({...startTimeFormData, time: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-6 h-12 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all active:scale-[0.98] shadow-[0_0_10px_rgb(37,99,235,0.4)] sm:shadow-[0_0_20px_rgb(37,99,235,0.4)]">
                    保存
                  </button>
                </form>
              </div>
            </div>
          )}

          {showTransportModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-in fade-in">
              <div className={`fixed -inset-[200px] backdrop-blur-sm -z-10 ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`}></div>
              <div className={`absolute -bottom-[50vh] left-0 right-0 h-[50vh] ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-white'} sm:hidden`}></div>
              <div className="w-full max-w-md relative">
                <form onSubmit={handleTransportSave} className={`relative z-[112] w-full max-h-[90dvh] overflow-y-auto overscroll-none rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-[calc(3rem+env(safe-area-inset-bottom))] shadow-2xl transition-colors duration-[400ms] ${isDarkMode ? 'bg-[#1a1d23] border-t border-white/10' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-[14px] sticky top-0 bg-inherit py-2 z-10">
                    <h2 className={`text-xl font-black transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>编辑交通</h2>
                    <button type="button" onClick={() => { setShowTransportModal(false); restoreZoom(); }} className={`p-2 rounded-full transition-colors duration-[400ms] ${isDarkMode ? 'bg-white/5 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}><X className={`w-5 h-5 transition-opacity ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                       <label className={`text-[10px] font-black uppercase ml-1 transition-colors duration-[400ms] ${isDarkMode ? 'opacity-80 text-white' : 'text-gray-700'}`}>时间（分）</label>
                       <input type="text" inputMode="numeric" pattern="[0-9]*" 
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 300);
                        }}
                        className={`w-full h-12 px-4 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 box-border border transition-colors duration-[400ms] ${isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value={transportFormData} onChange={e => setTransportFormData(e.target.value.replace(/[^0-9]/g, ''))} />
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-6 h-12 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all active:scale-[0.98] shadow-[0_0_10px_rgb(37,99,235,0.4)] sm:shadow-[0_0_20px_rgb(37,99,235,0.4)]">
                    保存
                  </button>
                </form>
              </div>
            </div>
          )}

          {showImportModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <div className={`fixed -inset-[200px] backdrop-blur-md -z-10 ${isDarkMode ? 'bg-black/80' : 'bg-black/40'}`}></div>
              <div className={`w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl transition-colors duration-[400ms] ${isDarkMode ? 'bg-[#1a1d23] border border-white/5' : 'bg-white text-black'}`}>
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className={`text-xl font-black mb-1 transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-black'}`}>识别到 {pendingImportData.length} 个地点</h2>
                <p className="text-[11px] opacity-80 mb-8">请选择如何将这些地点应用到当前行程：<br/><span className="text-blue-500 font-bold">{tripName}</span></p>
                
                <div className="grid gap-3">
                  <button onClick={() => handleImportConfirm('append')} className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all active:scale-[0.98] shadow-[0_0_10px_rgb(37,99,235,0.4)] sm:shadow-[0_0_20px_rgb(37,99,235,0.4)]">追加到当前行程末尾</button>
                  <button onClick={() => handleImportConfirm('overwrite')} className="w-full h-12 rounded-2xl border border-red-500/30 text-red-500 font-black hover:bg-red-500/10 transition-all active:scale-[0.98]">覆盖当前行程</button>
                  <button onClick={() => setShowImportModal(false)} className="mt-2 text-xs font-black opacity-70 uppercase tracking-widest hover:opacity-100 p-2">取消</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          html, body {
            background-color: ${isDarkMode ? '#000000' : '#e8e4d9'} !important;
            ${isAppLoaded ? 'transition: background-color 0.4s ease;' : ''}
          }
          ${!isAppLoaded ? '* { transition: none !important; }' : ''}
          .transition-colors {
            transition-property: background-color, border-color, text-decoration-color, fill, stroke !important;
            transition-duration: 0.4s !important;
            transition-timing-function: ease !important;
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