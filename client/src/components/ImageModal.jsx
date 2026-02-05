import React from 'react';
import { X } from 'lucide-react';

const ImageModal = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={24} />
      </button>
      <img 
        src={src} 
        alt="Full view" 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Bấm vào ảnh không đóng
      />
    </div>
  );
};

export default ImageModal;