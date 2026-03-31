
import React, { useState, useRef } from 'react';
import { Upload, File as FileIcon, X, Check, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { ClaimType, UploadedFile } from '../types';
import { formatFileSize } from '../utils';

interface Props {
  claimType: ClaimType;
  setClaimType: (type: ClaimType) => void;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onFinish: () => void;
}

const UploadSection: React.FC<Props> = ({ claimType, setClaimType, files, setFiles, onFinish }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getRequiredDocs = () => {
    switch (claimType) {
      case 'Medical Expense':
        return ['สำเนาบัตรประชาชน', 'ใบรับรองแพทย์ฉบับจริง', 'ใบเสร็จรับเงินฉบับจริง'];
      case 'Permanent Disability':
        return ['สำเนาบัตรประชาชน', 'ใบรับรองแพทย์ระบุความพิการ', 'สำเนาประวัติการรักษาทั้งหมด'];
      case 'Loss of Life':
        return ['ใบมรณบัตร', 'สำเนาบัตรประชาชนผู้เสียชีวิต/ผู้รับผลประโยชน์', 'สำเนาทะเบียนบ้าน'];
      default:
        return [];
    }
  };

  const simulateUpload = (fileName: string, size: number, type: string) => {
    const newFile: UploadedFile = {
      name: fileName,
      size,
      type,
      progress: 0,
      status: 'uploading'
    };
    
    setFiles(prev => [...prev, newFile]);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 30;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.name === fileName ? { ...f, progress: 100, status: 'completed' } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.name === fileName ? { ...f, progress: Math.floor(currentProgress) } : f
        ));
      }
    }, 400);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Fix: Explicitly type 'file' to avoid 'unknown' type error. Renamed icon import to avoid collision.
      Array.from(e.target.files).forEach((file: File) => {
        if (file.size > 5 * 1024 * 1024) {
           alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 5MB`);
           return;
        }
        simulateUpload(file.name, file.size, file.type);
      });
    }
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-semibold text-ttb-blue mb-2">ส่งเอกสารเรียกร้องค่าสินไหม</h2>
        <p className="text-gray-500">โปรดระบุประเภทการเคลมและอัปโหลดเอกสารที่เกี่ยวข้อง</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="md:col-span-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการเคลม</label>
            <div className="space-y-2">
              {(['Medical Expense', 'Permanent Disability', 'Loss of Life'] as ClaimType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setClaimType(type)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    claimType === type 
                    ? 'border-ttb-orange bg-orange-50 text-ttb-orange font-medium' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type === 'Medical Expense' ? 'ค่ารักษาพยาบาล' : type === 'Permanent Disability' ? 'ทุพพลภาพถาวร' : 'เสียชีวิต'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-ttb-blue" /> เอกสารที่ต้องเตรียม
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              {getRequiredDocs().map((doc, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-ttb-blue">•</span> {doc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Upload Area */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                // Fix: Explicitly type 'file' to avoid 'unknown' type error
                Array.from(e.dataTransfer.files).forEach((file: File) => simulateUpload(file.name, file.size, file.type));
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging ? 'border-ttb-orange bg-orange-50 scale-[1.02]' : 'border-gray-300 hover:border-ttb-blue hover:bg-gray-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <div className="w-16 h-16 bg-blue-100 text-ttb-blue rounded-full flex items-center justify-center mb-4">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-800">คลิก หรือ ลากไฟล์มาที่นี่เพื่ออัปโหลด</h3>
            <p className="text-gray-400 text-sm mt-1">รองรับ JPG, PNG, PDF (ขนาดไม่เกิน 5MB)</p>
          </div>

          {/* File List */}
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                <div className={`p-2 rounded-lg ${file.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-ttb-blue'}`}>
                  {/* Renamed icon to FileIcon to avoid shadowing the global File type */}
                  <FileIcon size={20} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-medium text-gray-800 truncate pr-6">{file.name}</h4>
                    <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
                  </div>
                  
                  {file.status === 'uploading' ? (
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                      <div 
                        className="bg-ttb-blue h-full rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                      <Check size={14} /> สำเร็จ
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                >
                  <X size={18} />
                </button>

                {file.status === 'uploading' && (
                  <div className="absolute top-0 right-10 p-2">
                    <Loader2 size={16} className="text-ttb-blue animate-spin" />
                  </div>
                )}
              </div>
            ))}

            {files.length === 0 && (
              <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                <AlertTriangle size={32} className="mb-2 opacity-20" />
                <p>ยังไม่มีการอัปโหลดไฟล์</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-8">
        <button
          disabled={files.length === 0 || files.some(f => f.status === 'uploading')}
          onClick={onFinish}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            files.length > 0 && !files.some(f => f.status === 'uploading')
            ? 'ttb-orange text-white shadow-xl hover:brightness-110 active:scale-95'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          ส่งข้อมูลการเคลม
        </button>
      </div>
    </div>
  );
};

export default UploadSection;
