
import React from 'react';
import { MediaItem as MediaItemType } from '../types';

interface MediaItemProps {
  item: MediaItemType;
  onClick: (item: MediaItemType) => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ item, onClick }) => {
  return (
    <div
      onClick={() => onClick(item)}
      className="relative aspect-square group cursor-pointer overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 transition-all duration-300"
    >
      <img
        src={item.url}
        alt={item.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
        <p className="text-xs font-medium text-white truncate">{item.name}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.metadata?.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] bg-white/10 backdrop-blur-md px-1.5 py-0.5 rounded text-white/80">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      {item.type === 'video' && (
        <div className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full">
           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
             <path d="M8 5v14l11-7z" />
           </svg>
        </div>
      )}
    </div>
  );
};

export default MediaItem;
