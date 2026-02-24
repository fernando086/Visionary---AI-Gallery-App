import React from 'react';
import { Album } from '../types';

interface AlbumGridProps {
    albums: Album[];
    onSelectAlbum: (album: Album) => void;
    columns: number;
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ albums, onSelectAlbum, columns }) => {
    return (
        <div
            className="grid gap-6 animate-in fade-in duration-500"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {albums.map((album) => (
                <div
                    key={album.id}
                    onClick={() => onSelectAlbum(album)}
                    className="group relative aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-95"
                >
                    {album.thumbnailUrl ? (
                        album.thumbnailType === 'video' ? (
                            <div className="w-full h-full relative bg-black">
                                <video
                                    src={album.thumbnailUrl}
                                    className="w-full h-full object-cover opacity-80"
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onLoadedMetadata={(e) => {
                                        e.currentTarget.currentTime = 0.1;
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                        <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <img
                                src={album.thumbnailUrl}
                                alt={album.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                        <h3 className="text-white font-bold truncate">{album.name}</h3>
                        <p className="text-gray-300 text-xs">{album.count} items</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlbumGrid;
