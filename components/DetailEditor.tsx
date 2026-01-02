
import React from 'react';
import { PassportData } from '../types';

interface DetailEditorProps {
  item: PassportData;
  onClose: () => void;
  onUpdate: (field: keyof PassportData, value: string) => void;
  onDelete: () => void;
}

const DetailEditor: React.FC<DetailEditorProps> = ({ item, onClose, onUpdate, onDelete }) => {
  const fields: { key: keyof PassportData; label: string; placeholder: string; type?: string; select?: string[] }[] = [
    { key: 'passengerType', label: 'Type', placeholder: 'ADULT / CHILD / INFANT', select: ['ADULT', 'CHILD', 'INFANT'] },
    { key: 'title', label: 'Title', placeholder: 'MR / MS / MRS', select: ['MR', 'MRS', 'MS', 'MSTR', 'MISS'] },
    { key: 'firstName', label: 'First Name', placeholder: 'FAISAL' },
    { key: 'lastName', label: 'Last Name', placeholder: 'PULIKKUTH' },
    { key: 'passportNumber', label: 'Passport No.', placeholder: 'U9628867' },
    { key: 'nationality', label: 'Country', placeholder: 'INDIA' },
    { key: 'gender', label: 'Gender', placeholder: 'MALE / FEMALE', select: ['MALE', 'FEMALE'] },
    { key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'DD/MM/YYYY' },
    { key: 'issueDate', label: 'Date of Issue', placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate', label: 'Date of Expiry', placeholder: 'DD/MM/YYYY' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="font-bold text-slate-800">Edit Passenger</h3>
        <button onClick={onClose} className="text-blue-600 font-bold text-sm uppercase">Done</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        {item.isDuplicate && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-8 flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="text-amber-800 font-black text-[11px] uppercase tracking-wider">Duplicate Detected</h5>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Another record with the same passport number or name already exists in this manifest.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {field.label}
              </label>
              {field.select ? (
                <select
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all appearance-none"
                  value={item[field.key] as string || ''}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                >
                  <option value="">Select {field.label}</option>
                  {field.select.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all"
                  value={item[field.key] as string || ''}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          
          <div className="pt-6">
            <button 
              onClick={() => { if(confirm('Delete this record?')) onDelete(); }}
              className="w-full py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:bg-red-100 transition-colors"
            >
              Delete Passenger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailEditor;
