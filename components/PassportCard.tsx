
import React from 'react';
import { PassportData } from '../types';

interface PassportCardProps {
  item: PassportData;
  onClick: () => void;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const PassportCard: React.FC<PassportCardProps> = ({ item, onClick, status }) => {
  const getInitials = (first: string, last: string) => {
    if (status === 'error') return '!';
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const isError = status === 'error';

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-5 rounded-[2rem] mb-4 flex items-center gap-5 border shadow-lg active:scale-95 transition-all cursor-pointer relative overflow-hidden group
        ${isError ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform
        ${isError ? 'bg-red-50/50' : 'bg-blue-50/30'}`}></div>
      
      {item.isDuplicate && (
        <div className="absolute top-0 right-0">
          <div className="bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
            Potential Duplicate
          </div>
        </div>
      )}

      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl relative z-10 transition-colors
        ${status === 'completed' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
          status === 'error' ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 
          'bg-slate-100 text-slate-400'}`}>
        {status === 'processing' ? (
          <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        ) : getInitials(item.firstName, item.lastName)}
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <h4 className={`font-extrabold text-lg truncate flex items-center gap-2 ${isError ? 'text-red-700' : 'text-slate-800'}`}>
          {isError ? 'Scan Failed' : (item.firstName || 'Unknown') + ' ' + (item.lastName || '')}
          {item.isDuplicate && (
            <span className="text-amber-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </span>
          )}
        </h4>
        <div className="flex flex-col gap-0.5 mt-1">
          {isError ? (
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight italic">
              {item.errorMessage || 'Improve image quality and re-upload'}
            </span>
          ) : (
            <>
              <span className="text-xs font-black font-mono text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md inline-block self-start">
                {item.passportNumber || 'SCANNING...'}
              </span>
              {item.expiryDate && (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1 mt-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Exp: {item.expiryDate}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors ${isError ? 'text-red-300' : 'text-slate-300 group-hover:text-blue-600'}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </div>
  );
};

export default PassportCard;
