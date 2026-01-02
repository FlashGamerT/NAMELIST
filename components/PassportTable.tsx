
import React from 'react';
import { PassportData, SortConfig } from '../types';

interface PassportTableProps {
  data: PassportData[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
  onUpdate: (id: string, field: keyof PassportData, value: string) => void;
  sortConfig?: SortConfig;
  onSort?: (key: keyof PassportData) => void;
}

const PassportTable: React.FC<PassportTableProps> = ({ 
  data, 
  onDelete, 
  onClear, 
  onExport, 
  onUpdate,
  sortConfig,
  onSort
}) => {
  if (data.length === 0) return null;

  const renderSortIcon = (key: keyof PassportData) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-20 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className={`w-3 h-3 ml-1 transition-transform ${sortConfig.order === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
        <path d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  const HeaderCell = ({ field, label, width }: { field: keyof PassportData; label: string; width?: string }) => (
    <th 
      className={`px-4 py-6 font-black uppercase tracking-[0.15em] text-[10px] cursor-pointer group select-none transition-colors hover:text-blue-600 ${width || ''}`}
      onClick={() => onSort?.(field)}
    >
      <div className="flex items-center">
        {label}
        {renderSortIcon(field)}
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1500px]">
          <thead>
            <tr className="bg-slate-50 text-slate-400 border-b border-slate-200/60">
              <th className="px-8 py-6 w-20 text-center text-[10px] font-black uppercase tracking-widest">No.</th>
              <HeaderCell field="passengerType" label="Type" width="w-28" />
              <HeaderCell field="title" label="Title" width="w-28" />
              <HeaderCell field="firstName" label="First Name" />
              <HeaderCell field="lastName" label="Last Name" />
              <HeaderCell field="gender" label="Gender" width="w-32" />
              <HeaderCell field="passportNumber" label="Passport Number" width="w-44" />
              <HeaderCell field="nationality" label="Country" width="w-48" />
              <HeaderCell field="dateOfBirth" label="Date of Birth" width="w-36" />
              <HeaderCell field="issueDate" label="Date of Issue" width="w-36" />
              <HeaderCell field="expiryDate" label="Date of Expire" width="w-36" />
              <th className="px-4 py-6 w-28 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 w-20 text-right text-[10px] font-black uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => (
              <tr key={item.id} className={`hover:bg-slate-50/80 transition-all group ${item.isDuplicate ? 'bg-amber-50/30' : ''} ${item.status === 'error' ? 'bg-red-50/20' : ''}`}>
                <td className="px-8 py-5 text-[12px] font-black text-slate-400 text-center bg-slate-50/30">{index + 1}</td>
                <td className="px-4 py-5 text-center">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest ${
                    item.passengerType === 'INFANT' ? 'bg-purple-100 text-purple-700' :
                    item.passengerType === 'CHILD' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.passengerType || 'ADULT'}
                  </span>
                </td>
                <td className="px-4 py-5">
                  <select 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-bold text-slate-800 px-4 py-2.5 rounded-xl transition-all appearance-none"
                    value={item.title || ''}
                    onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
                  >
                    <option value="MR">MR</option>
                    <option value="MRS">MRS</option>
                    <option value="MS">MS</option>
                    <option value="MSTR">MSTR</option>
                    <option value="MISS">MISS</option>
                  </select>
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-bold text-slate-900 px-4 py-2.5 rounded-xl transition-all"
                    value={item.firstName}
                    onChange={(e) => onUpdate(item.id, 'firstName', e.target.value.toUpperCase())}
                  />
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-bold text-slate-900 px-4 py-2.5 rounded-xl transition-all"
                    value={item.lastName}
                    onChange={(e) => onUpdate(item.id, 'lastName', e.target.value.toUpperCase())}
                  />
                </td>
                <td className="px-4 py-5 text-center">
                  <select 
                    className="bg-slate-100 hover:bg-slate-200 text-[11px] font-black text-slate-600 px-3.5 py-2 rounded-xl border-none focus:ring-4 focus:ring-blue-100 cursor-pointer appearance-none text-center transition-colors"
                    value={item.gender || ''}
                    onChange={(e) => onUpdate(item.id, 'gender', e.target.value.toUpperCase())}
                  >
                    <option value="">N/A</option>
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                  </select>
                </td>
                <td className="px-4 py-5">
                  <div className="relative">
                    <input 
                      className={`w-full border border-transparent hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-black font-mono px-4 py-2.5 rounded-xl transition-all ${item.isDuplicate ? 'bg-amber-100 text-amber-800' : 'bg-blue-50/40 text-blue-700'}`}
                      value={item.passportNumber}
                      onChange={(e) => onUpdate(item.id, 'passportNumber', e.target.value.toUpperCase())}
                    />
                    {item.isDuplicate && (
                      <div className="absolute -top-2.5 -right-2.5 bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-md animate-bounce" title="Potential Duplicate">!</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-semibold text-slate-600 px-4 py-2.5 rounded-xl transition-all"
                    value={item.nationality || ''}
                    onChange={(e) => onUpdate(item.id, 'nationality', e.target.value.toUpperCase())}
                  />
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-medium text-slate-500 px-4 py-2.5 rounded-xl transition-all text-center"
                    value={item.dateOfBirth || ''}
                    onChange={(e) => onUpdate(item.id, 'dateOfBirth', e.target.value)}
                  />
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-medium text-slate-500 px-4 py-2.5 rounded-xl transition-all text-center"
                    value={item.issueDate || ''}
                    onChange={(e) => onUpdate(item.id, 'issueDate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-5">
                  <input 
                    className="w-full bg-white/50 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 text-[13px] font-medium text-slate-500 px-4 py-2.5 rounded-xl transition-all text-center"
                    value={item.expiryDate || ''}
                    onChange={(e) => onUpdate(item.id, 'expiryDate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-5 text-center">
                  {item.status === 'processing' ? (
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : item.status === 'error' ? (
                    <div className="flex flex-col items-center gap-1 group/err" title={item.errorMessage}>
                      <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm animate-pulse cursor-help">!</div>
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter opacity-0 group-hover/err:opacity-100 transition-opacity">Scan Failed</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-all p-3 hover:bg-red-50 rounded-2xl active:scale-90"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">End of Active Manifest</p>
      </div>
    </div>
  );
};

export default PassportTable;
