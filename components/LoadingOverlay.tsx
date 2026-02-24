
import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-10 max-w-sm w-full shadow-2xl">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Analyzing...</h3>
        <p className="text-gray-400 text-sm">{message}</p>
        <div className="mt-8 flex gap-1 justify-center">
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75"></div>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150"></div>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-300"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
