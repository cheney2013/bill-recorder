import React, { useState, useRef, useCallback } from 'react';
import { NewTransaction } from '../types';
import { analyzeBillImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { UploadIcon, SpinnerIcon, AlertIcon, XCircleIcon, DocumentIcon } from './icons';

interface BillUploaderProps {
  onAddTransactions: (transactions: NewTransaction[]) => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface Preview {
    url: string;
    name: string;
    isImage: boolean;
}

export const BillUploader: React.FC<BillUploaderProps> = ({ onAddTransactions, isLoading, setIsLoading, error, setError }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' ||
      file.type === 'text/csv'
    );
    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);

    const newPreviewsPromises = validFiles.map(file => {
      return new Promise<Preview>(resolve => {
        const isImage = file.type.startsWith('image/');
        if (isImage) {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ url: reader.result as string, name: file.name, isImage: true });
          reader.readAsDataURL(file);
        } else {
          resolve({ url: '', name: file.name, isImage: false }); // No URL for non-images
        }
      });
    });

    Promise.all(newPreviewsPromises).then(newPreviews => {
        setPreviews(prev => [...prev, ...newPreviews]);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Allow re-selecting the same files
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError('请先选择一个或多个账单文件。');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const results = await Promise.allSettled(
      selectedFiles.map(async (file) => {
        const base64Image = await fileToBase64(file);
        return await analyzeBillImage(base64Image, file.type);
      })
    );
    
    const successfulTransactions: NewTransaction[] = [];
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulTransactions.push(...result.value);
      } else {
        const reason = result.reason as Error;
        errors.push(`文件 "${selectedFiles[index].name}" 处理失败: ${reason.message}`);
      }
    });
    
    if (successfulTransactions.length > 0) {
      onAddTransactions(successfulTransactions);
    }
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
    
    setSelectedFiles([]);
    setPreviews([]);
    setIsLoading(false);
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    if (event.dataTransfer.files) {
      addFiles(Array.from(event.dataTransfer.files));
    }
  }, [isLoading]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">上传账单</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div 
          className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors ${!isLoading ? 'cursor-pointer hover:border-blue-500' : ''}`}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            accept="image/*,application/pdf,text/plain,text/csv"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            disabled={isLoading}
          />
          {previews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group aspect-square">
                   {preview.isImage ? (
                    <img src={preview.url} alt={`账单预览 ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <div className="w-full h-full rounded-md bg-gray-100 flex flex-col items-center justify-center p-2 text-center">
                        <DocumentIcon className="w-10 h-10 text-gray-400"/>
                        <p className="text-xs text-gray-600 mt-2 break-all line-clamp-2">{preview.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                    className="absolute top-0 right-0 -m-2 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:hidden"
                    aria-label="Remove image"
                    disabled={isLoading}
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-50 min-h-full aspect-square">
                <UploadIcon className="w-8 h-8 mb-1"/>
                <p className="text-sm font-semibold">添加更多</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 py-6">
              <UploadIcon className="w-12 h-12 mb-2"/>
              <p className="font-semibold">点击或拖拽上传文件</p>
              <p className="text-sm">支持图片、PDF、文本文档、CSV</p>
            </div>
          )}
        </div>
        
        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-start gap-3" role="alert">
                <AlertIcon className="h-6 w-6 flex-shrink-0 mt-0.5"/>
                <div>
                    <p className="font-bold">错误</p>
                    {error.split('\n').map((line, i) => <p key={i} className="text-sm">{line}</p>)}
                </div>
            </div>
        )}

        <button
          type="submit"
          disabled={selectedFiles.length === 0 || isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              正在智能分析...
            </>
          ) : (
            `识别并添加 ${selectedFiles.length > 0 ? `${selectedFiles.length}个` : ''}文件`
          )}
        </button>
      </form>
    </div>
  );
};