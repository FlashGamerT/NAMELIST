
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { PassportData, ProcessingStatus, SortConfig, SortOrder } from './types';
import { extractPassportDetails } from './services/geminiService';
import PassportCard from './components/PassportCard';
import DetailEditor from './components/DetailEditor';
import PassportTable from './components/PassportTable';

// Add global declaration for XLSX since it's loaded via CDN
declare const XLSX: any;

type DateField = 'dateOfBirth' | 'issueDate' | 'expiryDate';

interface FilterState {
  field: DateField;
  startDate: string;
  endDate: string;
}

interface HistoryState {
  past: PassportData[][];
  present: PassportData[];
  future: PassportData[][];
}

const App: React.FC = () => {
  // History State Management
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: [],
    future: []
  });

  const passports = history.present;

  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [view, setView] = useState<'dashboard' | 'manifest'>('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    field: 'expiryDate',
    startDate: '',
    endDate: ''
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', order: 'asc' });

  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate age, title, and type
  const deriveAttributes = (dob: string, gender: string): { title: string, passengerType: 'ADULT' | 'CHILD' | 'INFANT' } => {
    if (!dob) return { title: '', passengerType: 'ADULT' };
    
    // Parse DD/MM/YYYY
    const parts = dob.split('/');
    if (parts.length !== 3) return { title: '', passengerType: 'ADULT' };
    
    const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    let pType: 'ADULT' | 'CHILD' | 'INFANT' = 'ADULT';
    if (age < 2) pType = 'INFANT';
    else if (age < 12) pType = 'CHILD';
    else pType = 'ADULT';

    let title = '';
    const isMale = gender?.toUpperCase() === 'MALE';
    
    if (age < 2) {
      title = isMale ? 'MSTR' : 'MISS';
    } else {
      if (isMale) {
        title = 'MR';
      } else {
        title = age > 30 ? 'MRS' : 'MS';
      }
    }

    return { title, passengerType: pType };
  };

  // Helper to update state with history preservation
  const setPassportsWithHistory = useCallback((newPassports: PassportData[] | ((prev: PassportData[]) => PassportData[]), shouldClearFuture = true) => {
    setHistory(prev => {
      const nextPresent = typeof newPassports === 'function' ? newPassports(prev.present) : newPassports;
      if (nextPresent === prev.present) return prev;
      return {
        past: [...prev.past, prev.present].slice(-50),
        present: nextPresent,
        future: shouldClearFuture ? [] : prev.future
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { redo(); } else { undo(); }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    let interval: number;
    if (status === ProcessingStatus.PROCESSING) {
      interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const checkIsDuplicate = (details: Partial<PassportData>, currentId: string, list: PassportData[]) => {
    if (!details.passportNumber && (!details.firstName || !details.lastName)) return false;
    return list.some(p => {
      if (p.id === currentId) return false;
      if (p.status !== 'completed') return false;
      const samePassport = details.passportNumber && p.passportNumber && 
        details.passportNumber.trim().toUpperCase() === p.passportNumber.trim().toUpperCase();
      const sameName = details.firstName && details.lastName && p.firstName && p.lastName &&
        details.firstName.trim().toUpperCase() === p.firstName.trim().toUpperCase() &&
        details.lastName.trim().toUpperCase() === p.lastName.trim().toUpperCase();
      return samePassport || sameName;
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray: File[] = Array.from(files);
    setTotalCount(fileArray.length);
    setProcessedCount(0);
    setBatchStartTime(Date.now());
    setStatus(ProcessingStatus.PROCESSING);
    setView('manifest'); 
    
    const placeholders: PassportData[] = fileArray.map(f => ({
      id: Math.random().toString(36).substring(7),
      fileName: f.name,
      firstName: '',
      lastName: '',
      passportNumber: '',
      status: 'processing'
    }));

    setPassportsWithHistory(prev => [...placeholders, ...prev]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const placeholderId = placeholders[i].id;
      try {
        const details = await extractPassportDetails(file);
        
        // Auto-derive Title and Type
        const derived = deriveAttributes(details.dateOfBirth || '', details.gender || '');
        const finalDetails = { 
          ...details, 
          title: details.title || derived.title,
          passengerType: derived.passengerType 
        };

        setHistory(prev => {
          const nextPresent = prev.present.map(p => 
            p.id === placeholderId 
              ? { ...p, ...finalDetails, status: 'completed' as const, isDuplicate: checkIsDuplicate(finalDetails, placeholderId, prev.present) } 
              : p
          );
          return { ...prev, present: nextPresent };
        });
      } catch (err) {
        setHistory(prev => ({
          ...prev,
          present: prev.present.map(p => 
            p.id === placeholderId 
              ? { ...p, status: 'error' as const, errorMessage: (err as Error).message } 
              : p
          )
        }));
      }
      setProcessedCount(i + 1);
    }
    setStatus(ProcessingStatus.IDLE);
    setBatchStartTime(null);
  };

  const updatePassport = (id: string, field: keyof PassportData, value: string) => {
    setPassportsWithHistory(prev => {
      const updatedList = prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        
        // If DOB or Gender changed, re-derive Title and Type unless specifically edited?
        // For simplicity, let's auto-update them if these fields change.
        if (field === 'dateOfBirth' || field === 'gender') {
          const derived = deriveAttributes(updated.dateOfBirth || '', updated.gender || '');
          updated.passengerType = derived.passengerType;
          updated.title = derived.title;
        }
        
        return updated;
      });
      
      const target = updatedList.find(p => p.id === id);
      if (target && target.status === 'completed') {
        const isDup = checkIsDuplicate(target, id, updatedList);
        return updatedList.map(p => p.id === id ? { ...p, isDuplicate: isDup } : p);
      }
      return updatedList;
    });
  };

  const deletePassport = (id: string) => {
    setPassportsWithHistory(prev => prev.filter(p => p.id !== id));
    setEditingId(null);
  };

  const handleSort = (key: keyof PassportData) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedPassports = useMemo(() => {
    let result = [...passports];
    if (filters.startDate || filters.endDate) {
      result = result.filter(p => {
        const dateVal = p[filters.field];
        if (!dateVal) return false;
        const parts = (dateVal as string).split('/');
        if (parts.length !== 3) return false;
        const pDate = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
        if (filters.startDate && pDate < new Date(filters.startDate)) return false;
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59);
          if (pDate > end) return false;
        }
        return true;
      });
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key!] || '';
        const valB = b[sortConfig.key!] || '';
        const strA = String(valA).toUpperCase();
        const strB = String(valB).toUpperCase();
        if (strA < strB) return sortConfig.order === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [passports, filters, sortConfig]);

  const exportToXLSX = () => {
    const headers = ["NO", "TYPE", "TITLE", "FIRST NAME", "LAST NAME", "GENDER", "PASSPORT NUMBER", "COUNTRY", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRE"];
    const rows = filteredAndSortedPassports.map((p, i) => [
      i + 1, 
      p.passengerType || 'ADULT', 
      p.title || '', 
      p.firstName || '', 
      p.lastName || '', 
      p.gender || '', 
      p.passportNumber || '', 
      p.nationality || '', 
      p.dateOfBirth || '', 
      p.issueDate || '', 
      p.expiryDate || ''
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Style the header row (yellow background, bold green text as per screenshot)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { bold: true, color: { rgb: "008000" } },
        alignment: { horizontal: "center" }
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manifest");
    
    XLSX.writeFile(workbook, `BESTEX_Manifest_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`);
  };

  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
  const editingItem = passports.find(p => p.id === editingId);

  return (
    <div className={`mx-auto min-h-screen bg-[#F8FAFF] flex flex-col relative transition-all duration-500 ease-in-out w-full max-w-none`}>
      {/* Dynamic Header */}
      <header className={`bg-[#1E3A8A] px-6 relative overflow-hidden transition-all duration-500 ${view === 'dashboard' ? 'pt-16 pb-28' : 'pt-12 pb-20'}`}>
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-[100px] float-animation"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-indigo-600 rounded-full opacity-10 blur-[120px]"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-baseline">
                <span className="text-2xl md:text-4xl font-extrabold text-[#3B82F6] tracking-tighter uppercase italic">BESTEX&nbsp;&nbsp;</span>
                <span className="text-2xl md:text-4xl font-extrabold text-white tracking-tighter uppercase italic">NAMELIST</span>
              </div>
              <div className="flex items-center w-full gap-2 mt-0.5">
                <div className="h-[1px] flex-1 bg-blue-300/40"></div>
                <span className="text-[9px] md:text-[11px] font-bold text-blue-200 uppercase tracking-[0.3em] whitespace-nowrap">TOURS & TRAVELS</span>
                <div className="h-[1px] flex-1 bg-blue-300/40"></div>
              </div>
            </div>
          </div>
          
          <div className="relative">
             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#22C55E] border-2 border-[#1E3A8A] rounded-full shadow-lg z-20"></div>
             <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                <svg className="w-7 h-7 md:w-9 md:h-9 text-white opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
             </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          {view === 'dashboard' ? (
            <div className="animate-in fade-in slide-in-from-left duration-700">
               <h2 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight">Welcome Faisal</h2>
               <p className="text-blue-100/70 text-sm md:text-lg mt-1.5 font-medium">Ready to build your next passenger manifest?</p>
            </div>
          ) : (
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-left duration-700">
               <div>
                 <h2 className="text-white text-2xl md:text-4xl font-bold tracking-tight">Active Manifest</h2>
                 <p className="text-blue-100/70 text-sm md:text-lg font-medium">{passports.length} Passengers Scanned</p>
               </div>
               <button 
                 onClick={() => setView('dashboard')}
                 className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-2xl text-white text-xs md:text-sm font-black uppercase tracking-widest border border-white/10 transition-all shadow-lg active:scale-95"
               >
                 Go Back
               </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 -mt-10 px-4 md:px-8 pb-36 relative z-20 max-w-7xl mx-auto w-full">
        {status === ProcessingStatus.PROCESSING && (
          <div className="mb-8 glass-card p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border-white animate-in zoom-in-95 duration-500 max-w-xl mx-auto">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="inline-block bg-blue-100 text-blue-600 text-[10px] md:text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-widest mb-2">AI Extraction</span>
                <h4 className="text-lg md:text-xl font-extrabold text-slate-800">{processedCount} / {totalCount} Files</h4>
              </div>
              <div className="text-right">
                <span className="text-3xl md:text-4xl font-black text-blue-600 tracking-tighter">{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full h-4 bg-blue-50/50 rounded-2xl overflow-hidden mb-3 p-1">
              <div className="h-full bg-blue-600 transition-all duration-700 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 justify-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              Reading Machine Readable Zone (MRZ)...
            </p>
          </div>
        )}

        {view === 'dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div 
              onClick={() => setView('manifest')}
              className="col-span-1 sm:col-span-2 group glass-card p-8 md:p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all cursor-pointer border-transparent hover:border-blue-200 active:scale-[0.98] overflow-hidden relative desktop-hover"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 group-hover:bg-blue-100 rounded-bl-[100px] transition-colors -z-10"></div>
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-8">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-2">View Manifest</h3>
              <p className="text-slate-500 text-base font-medium max-w-md">Access your scanned passenger lists, edit details, and export to Excel instantly.</p>
              <div className="mt-8 flex items-center gap-3">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-wider">{passports.length} Passengers Scanned</span>
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] shadow-lg hover:shadow-xl transition-all cursor-pointer border border-slate-100 flex flex-col items-center justify-center text-center active:scale-95 desktop-hover">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-widest">History</span>
              <p className="text-slate-400 text-xs mt-2 font-medium">Previous uploads</p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] shadow-lg hover:shadow-xl transition-all cursor-pointer border border-slate-100 flex flex-col items-center justify-center text-center active:scale-95 desktop-hover">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Setup</span>
              <p className="text-slate-400 text-xs mt-2 font-medium">App preferences</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 bg-white/40 p-6 rounded-[2.5rem]">
               <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="w-1.5 h-10 bg-blue-600 rounded-full hidden md:block"></div>
                  <h3 className="text-2xl font-black text-slate-800">Passenger Records</h3>
                  
                  {/* Undo/Redo Controls */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                    <button 
                      onClick={undo}
                      disabled={history.past.length === 0}
                      className={`p-2.5 rounded-lg transition-all ${history.past.length > 0 ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}
                      title="Undo (Ctrl+Z)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button 
                      onClick={redo}
                      disabled={history.future.length === 0}
                      className={`p-2.5 rounded-lg transition-all ${history.future.length > 0 ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}
                      title="Redo (Ctrl+Y)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                    </button>
                  </div>
               </div>
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-4 rounded-2xl flex-1 md:flex-none border transition-all shadow-sm ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}
                  >
                    <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  </button>
                  <button 
                    onClick={exportToXLSX}
                    className="flex-[2] md:flex-none bg-slate-900 text-white px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
                  >
                    Export to Excel
                  </button>
               </div>
            </div>

            {showFilters && (
               <div className="glass-card p-8 rounded-[2.5rem] border-white shadow-2xl mb-8 max-w-2xl mx-auto animate-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Filter Criterion</label>
                        <select 
                          className="w-full bg-slate-100/50 border border-slate-200 px-4 py-4 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                          value={filters.field}
                          onChange={e => setFilters({...filters, field: e.target.value as DateField})}
                        >
                          <option value="expiryDate">Passport Expiry</option>
                          <option value="issueDate">Passport Issue Date</option>
                          <option value="dateOfBirth">Date of Birth</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">From Date</label>
                        <input type="date" className="w-full bg-slate-100/50 border border-slate-200 px-4 py-4 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">To Date</label>
                        <input type="date" className="w-full bg-slate-100/50 border border-slate-200 px-4 py-4 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                     </div>
                  </div>
                  <button onClick={() => setFilters({field:'expiryDate',startDate:'',endDate:''})} className="w-full mt-6 text-xs font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Reset All Filters</button>
               </div>
            )}

            {/* Responsive Manifest Views */}
            <div className="md:hidden space-y-4">
              {filteredAndSortedPassports.map(p => <PassportCard key={p.id} item={p} status={p.status} onClick={() => setEditingId(p.id)} />)}
            </div>
            
            <div className="hidden md:block">
              <PassportTable 
                data={filteredAndSortedPassports} 
                onDelete={deletePassport} 
                onClear={() => { if(confirm('Clear current manifest?')) setPassportsWithHistory([]); }}
                onExport={exportToXLSX}
                onUpdate={updatePassport}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </div>

            {filteredAndSortedPassports.length === 0 && (
              <div className="py-48 text-center bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h4 className="text-2xl font-black text-slate-500">Manifest Empty</h4>
                <p className="text-slate-400 text-base mt-3 max-w-sm mx-auto">Start by clicking the '+' button below to scan and extract passport data with AI.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {editingItem && <DetailEditor item={editingItem} onClose={() => setEditingId(null)} onUpdate={(f, v) => updatePassport(editingItem.id, f, v)} onDelete={() => deletePassport(editingItem.id)} />}

      {/* Responsive Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 mx-auto ${view === 'manifest' ? 'max-w-none px-6' : 'max-w-xl'}`}>
        <div className="wave-container max-w-xl mx-auto md:max-w-2xl">
          <div className="fab-notch"></div>
          <div className="wave-bg px-12 safe-bottom flex justify-between items-center text-white">
            <button onClick={() => setView('dashboard')} className={`p-5 transition-all ${view === 'dashboard' ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-100'}`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
            <div className="absolute top-[-40px] left-1/2 -translate-x-1/2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={status === ProcessingStatus.PROCESSING}
                className="w-20 h-20 bg-blue-600 rounded-full shadow-[0_20px_40px_rgba(30,58,138,0.5)] flex items-center justify-center active:scale-90 transition-all border-4 border-[#F8FAFF] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white rounded-full scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-10 transition-all duration-300"></div>
                {status === ProcessingStatus.PROCESSING ? (
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                )}
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf" onChange={e => e.target.files && processFiles(e.target.files)} />
              </button>
            </div>
            <button onClick={() => setView('manifest')} className={`p-5 transition-all ${view === 'manifest' ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-100'}`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default App;
