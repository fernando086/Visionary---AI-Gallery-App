
import React, { useRef, useState } from 'react';

interface SearchHeaderProps {
  onSearchText: (query: string) => void;
  onSearchImage: (file: File) => void;
  isSearching: boolean;
  onClear: () => void;
  isAIEnabled: boolean;
  onToggleAI: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ onSearchText, onSearchImage, isSearching, onClear, isAIEnabled, onToggleAI }) => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearchText(query);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSearchImage(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="w-full max-w-2xl flex items-center gap-4">
      <div className="flex-1 relative group">
        <form onSubmit={handleSubmit}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className={`w-4 h-4 transition-colors ${isAIEnabled ? 'text-purple-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAIEnabled ? "Describe what you want to find..." : "Search by filename..."}
            className={`block w-full pl-10 pr-24 py-2.5 bg-white/5 border rounded-xl focus:ring-2 outline-none transition-all placeholder:text-gray-600 text-sm text-white ${isAIEnabled
              ? 'border-purple-500/30 focus:border-purple-500 focus:ring-purple-500/20'
              : 'border-white/10 focus:border-white/30 focus:ring-white/10'
              }`}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-lg transition-colors border ${isAIEnabled
                ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                }`}
              title="Image Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </form>
      </div>

      {/* AI Toggle Checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={isAIEnabled}
            onChange={onToggleAI}
            className="peer sr-only"
          />
          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[19px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </div>
        <span className={`text-sm font-medium transition-colors ${isAIEnabled ? 'text-purple-300' : 'text-gray-400 group-hover:text-gray-300'}`}>
          AI Search
        </span>
      </label>
    </div>
  );
};

export default SearchHeader;
