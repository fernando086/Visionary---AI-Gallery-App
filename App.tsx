
import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import { MediaItem, AppStatus, MediaMetadata, Album } from './types';
import Layout from './components/Layout';
import SearchHeader from './components/SearchHeader';
import MediaItemComponent from './components/MediaItem';
import AlbumGrid from './components/AlbumGrid';
import LoadingOverlay from './components/LoadingOverlay';
import { analyzeMedia, semanticSearch, imageSimilaritySearch } from './services/geminiService';

// Utility for persisting Directory Handles in IndexedDB
const DB_NAME = 'VisionaryDB';
const STORE_NAME = 'Handles';

const saveHandle = async (handle: any) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, 'gallery_handle');
};

const getSavedHandle = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  return tx.objectStore(STORE_NAME).get('gallery_handle');
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const App: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [view, setView] = useState<'albums' | 'media'>('albums');
  const [gridColumns, setGridColumns] = useState(3);

  const [filteredItems, setFilteredItems] = useState<MediaItem[] | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [hasSavedHandle, setHasSavedHandle] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  useEffect(() => {
    // Mobile: Load albums on mount
    if (Capacitor.isNativePlatform()) {
      loadMobileAlbums();
    } else {
      // Web: Check for saved handle
      getSavedHandle().then(handle => {
        if (handle) setHasSavedHandle(true);
      });

      // Web: Load persisted data
      const saved = localStorage.getItem('visionary_gallery_data');
      if (saved) {
        try {
          setItems(JSON.parse(saved));
          setView('media'); // Web continues to just show all media for now
        } catch (e) {
          console.error("Failed to load gallery data", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('visionary_gallery_data', JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save gallery data to localStorage (probably quota exceeded)", e);
    }
  }, [items]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSyncGallery = async (reSync = false) => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Fix: Pass currentAlbum.id if we are inside an album view
        // We need to access the current state, but handleSyncGallery is defined before render? 
        // Actually, we can access state variables in the function scope.
        // Assuming 'currentAlbum' is available in scope (it is state).
        await syncMobileGallery(currentAlbum?.id);
        return;
      }

      if (!('showDirectoryPicker' in window)) {
        alert("Automatic Directory Sync is only supported on Desktop Chrome/Edge. Please upload files manually.");
        return;
      }

      let directoryHandle;
      if (reSync) {
        directoryHandle = await getSavedHandle();
        // Request permission to access the saved handle again
        const permission = await directoryHandle.requestPermission({ mode: 'read' });
        if (permission !== 'granted') return;
      } else {
        directoryHandle = await (window as any).showDirectoryPicker();
        await saveHandle(directoryHandle);
        setHasSavedHandle(true);
      }

      const files: File[] = [];
      setStatus(AppStatus.INDEXING);

      async function scanDirectory(handle: any) {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.includes('gif')) {
              files.push(file);
            }
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry);
          }
        }
      }

      await scanDirectory(directoryHandle);
      await processFiles(files);
    } catch (err) {
      console.error("Sync failed", err);
      setStatus(AppStatus.IDLE);
    }
  };

  const loadMobileAlbums = async () => {
    try {
      const { albums } = await Media.getAlbums();

      // Map to our Album interface and try to find a thumbnail (requires fetching at least 1 item)
      // Optimization: For now just show generic or try to fetch one per album lazily
      // For this demo, we will just list them. Real app would batch fetch thumbnails.
      const mappedAlbums: Album[] = albums.map((a: any) => ({
        id: a.identifier,
        name: a.name,
        count: a.count || 0,
        thumbnailUrl: a.cover ? Capacitor.convertFileSrc(a.cover) : undefined,
        thumbnailType: (a.coverMimeType || "").startsWith("video") ? 'video' : 'image'
      }));
      setAlbums(mappedAlbums);
      setView('albums');
    } catch (e) {
      console.error("Failed to load albums", e);
    }
  };

  // Auto-load when entering an album
  useEffect(() => {
    if (view === 'media' && currentAlbum && Capacitor.isNativePlatform()) {
      // Clear items if it's a new album load (not pagination)
      // But wait, syncMobileGallery handles appending? 
      // We should probably clear items here if we want a fresh start, 
      // OR rely on syncMobileGallery(albumId, false) to clear.

      // Let's make syncMobileGallery smarter.
      syncMobileGallery(currentAlbum.id, false);
    }
  }, [currentAlbum, view]);

  const syncMobileGallery = async (albumId?: string, isLoadMore = false) => {
    try {
      setStatus(AppStatus.INDEXING);

      const currentCount = isLoadMore ? items.length : 0;

      const options = {
        quantity: 1000,
        sort: 'creationDate' as const,
        offset: currentCount // Send offset to native
      };

      // If an album is selected, filter by it
      if (albumId) {
        Object.assign(options, { albumIdentifier: albumId });
      }

      const { medias } = await Media.getMedias(options);

      if (!isLoadMore) {
        // If not loading more, we are starting fresh. 
        // However, setItems inside processFiles appends. 
        // We should ideally clear items first if it's a new album.
        setItems([]);
      }

      const nativeItems: MediaItem[] = medias.map((asset: any) => {
        // Use the mimeType returned from native to correctly identify videos
        const type = (asset.mimeType || "").startsWith("video") ? 'video' : 'image';
        // Note: mimeType might be missing in some plugin versions, so fallback to name checks or assume image if not video

        return {
          id: Math.random().toString(36).substr(2, 9),
          url: Capacitor.convertFileSrc(asset.identifier),
          type: type, // logic to detect video
          name: asset.identifier.split('/').pop() || "Unknown",
          timestamp: asset.creationDate ? new Date(asset.creationDate).getTime() : Date.now(),
          metadata: {
            description: "Unanalyzed",
            tags: [],
            dominantColors: [],
            objects: [],
            text: [],
            mood: "unknown",
            nsfwScore: 0
          }
        };
      });

      setItems(prev => [...prev, ...nativeItems]);
      setStatus(AppStatus.IDLE);

      // Skip the old processFiles loop for mobile
    } catch (e) {
      console.error("Mobile sync failed", e);
      setStatus(AppStatus.IDLE);
      alert("Failed to access mobile gallery: " + (e as any).message);
    }
  };

  const processFiles = async (files: File[]) => {
    const existingNames = new Set(items.map(i => i.name));
    const newFiles = files.filter(f => !existingNames.has(f.name));

    if (newFiles.length === 0) {
      setStatus(AppStatus.IDLE);
      return;
    }

    setSyncProgress({ current: 0, total: newFiles.length });

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      setSyncProgress(prev => ({ ...prev, current: i + 1 }));

      let metadata = {
        description: "Unanalyzed",
        tags: [],
        dominantColors: [],
        objects: [],
        text: [],
        mood: "unknown",
        nsfwScore: 0
      };

      try {
        // Optimization: Do NOT analyze on load. Only analyze on demand (search).
        // const base64 = await fileToBase64(file);
        // try { metadata = await analyzeMedia(base64, file.type); } ...

        const url = Capacitor.isNativePlatform()
          ? Capacitor.convertFileSrc(file.name)
          : await fileToDataUrl(file);

        const newItem: MediaItem = {
          id: Math.random().toString(36).substr(2, 9),
          url,
          type: file.type.startsWith('image') ? 'image' : file.type.includes('gif') ? 'gif' : 'video',
          name: file.name,
          timestamp: Date.now(),
          metadata
        };

        setItems(prev => [newItem, ...prev]);
      } catch (err) {
        console.error("Failed to process", file.name, err);
      }
    }

    setStatus(AppStatus.IDLE);
  };

  const indexGallery = async (): Promise<MediaItem[] | null> => {
    const unindexed = items.filter(i => i.metadata.description === "Unanalyzed");
    if (unindexed.length === 0) return items;

    if (!confirm(`AI Search requires analyzing ${unindexed.length} items. This process happens on your device/API and may take time. Start indexing?`)) {
      return null;
    }

    setStatus(AppStatus.INDEXING);
    setSyncProgress({ current: 0, total: unindexed.length });

    // Local copy to return updated state immediately
    let currentItems = [...items];

    for (let i = 0; i < unindexed.length; i++) {
      const item = unindexed[i];
      setSyncProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        // Fetch blob
        const response = await fetch(item.url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const mime = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const metadata = await analyzeMedia(base64, mime);

        // Update state AND local copy
        const updatedItem = { ...item, metadata };
        // Update local array
        currentItems = currentItems.map(p => p.id === item.id ? updatedItem : p);
        // Update React state
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, metadata } : p));

      } catch (e) {
        console.error("Analysis failed for", item.name, e);
      }
    }
    setStatus(AppStatus.IDLE);
    return currentItems;
  };

  const displayItems = filteredItems || items;

  const handleMediaClick = (item: MediaItem) => {
    setSelectedItem(item);
  };

  return (
    <Layout header={
      <SearchHeader
        isAIEnabled={aiMode}
        onToggleAI={() => setAiMode(prev => !prev)}
        onSearchText={async (q) => {
          if (!aiMode) {
            // Classic Search
            if (!q.trim()) { setFilteredItems(null); return; }
            const lower = q.toLowerCase();
            setFilteredItems(items.filter(i => i.name.toLowerCase().includes(lower)));
            return;
          }

          // AI Search
          const updatedItems = await indexGallery();
          if (!updatedItems) {
            return;
          }

          setStatus(AppStatus.SEARCHING);
          try {
            // Use updatedItems here, NOT items (which is stale)
            const ids = await semanticSearch(q, updatedItems);
            setFilteredItems(updatedItems.filter(i => ids.includes(i.id)));
          } catch (e) {
            alert("AI Search failed: " + e);
          }
          setStatus(AppStatus.IDLE);
        }}
        onSearchImage={async (f) => {
          // Image search implies AI/Similarity
          if (!aiMode && !confirm("Image similarity search requires AI Analysis. Enable AI Mode and proceed?")) return;

          setAiMode(true);
          const updatedItems = await indexGallery();
          if (!updatedItems) return;

          setStatus(AppStatus.SEARCHING);
          try {
            const b64 = await fileToBase64(f);
            const ids = await imageSimilaritySearch(b64, f.type, updatedItems);
            setFilteredItems(updatedItems.filter(i => ids.includes(i.id)));
          } catch (e) {
            alert("Image Search failed: " + e);
          }
          setStatus(AppStatus.IDLE);
        }}
        isSearching={status === AppStatus.SEARCHING}
        onClear={() => setFilteredItems(null)}
      />
    }>
      {status === AppStatus.SEARCHING && <LoadingOverlay message="AI is processing your query..." />}
      {status === AppStatus.INDEXING && (
        <div className="mb-8 p-6 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-purple-500 border-purple-500/20 animate-spin" />
            <div>
              <p className="text-white font-bold">Scanning Local Gallery</p>
              <p className="text-purple-400 text-sm">{syncProgress.current} of {syncProgress.total} new items processed</p>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-[72px] z-30 bg-[#0a0a0a]/95 backdrop-blur-md py-4 -mx-4 px-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 transition-all">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {view === 'albums' ? 'Albums' : (currentAlbum ? currentAlbum.name : 'Digital Archive')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {view === 'albums'
              ? `${albums.length} folders found`
              : `${displayItems.length} items`}
          </p>
        </div>

        <div className="flex gap-3">
          {view === 'media' && currentAlbum && (
            <button
              onClick={() => {
                setView('albums');
                setItems([]); // Clear items to save memory/state when going back
                setCurrentAlbum(null);
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10"
            >
              Back to Albums
            </button>
          )}

          {view === 'albums' && (
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400 pl-2">Columns:</span>
              {[2, 3, 4].map(cols => (
                <button
                  key={cols}
                  onClick={() => setGridColumns(cols)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${gridColumns === cols ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {cols}
                </button>
              ))}
            </div>
          )}

          {hasSavedHandle && !filteredItems && !Capacitor.isNativePlatform() && (
            <button
              onClick={() => handleSyncGallery(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Scan for Updates
            </button>
          )}
          <button
            onClick={() => handleSyncGallery(false)}
            disabled={status === AppStatus.INDEXING}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            {hasSavedHandle ? 'Change Sync Folder' : 'Sync Gallery Folder'}
          </button>
        </div>
      </div>

      {view === 'albums' ? (
        <AlbumGrid
          albums={albums}
          columns={gridColumns}
          onSelectAlbum={(album) => {
            setCurrentAlbum(album);
            // Auto-load triggers via useEffect
            setView('media');
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Media Grid */}
          <div
            className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
          >
            {displayItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-square bg-black border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-white/30 transition-all active:scale-95"
              >
                {item.type === 'video' ? (
                  <>
                    <video
                      src={item.url}
                      className="w-full h-full object-contain"
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        // Optional: force seek to generate thumbnail frame if browser supports it
                        e.currentTarget.currentTime = 0.1;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  <p className="text-gray-400 text-xs">{item.metadata?.description || "Unanalyzed"}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button (Native) */}
          {Capacitor.isNativePlatform() && currentAlbum && displayItems.length > 0 && (
            <div className="mt-8 flex justify-center pb-8">
              <button
                onClick={() => syncMobileGallery(currentAlbum.id, true)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-colors flex items-center gap-2 border border-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                Load More Photos
              </button>
            </div>
          )}

          {/* Empty State */}
          {displayItems.length === 0 && status !== AppStatus.INDEXING && (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem]">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">No Items Detected</h3>
              {Capacitor.isNativePlatform() && currentAlbum && <p className="text-gray-500 mt-2">Pull to refresh or check permissions</p>}

              {!Capacitor.isNativePlatform() && (
                <div className="mt-4">
                  <p className="text-gray-500 max-w-sm px-6 mb-4">
                    Grant permission to your photo directory to enable automatic AI indexing and semantic search.
                  </p>
                  <button
                    onClick={() => handleSyncGallery(false)}
                    className="text-purple-400 font-bold hover:text-purple-300 underline underline-offset-8"
                  >
                    Start Automatic Discovery
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay with Swipe, Zoom, and Nav */}
      {selectedItem && (
        <ModalViewer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onNext={() => {
            const idx = displayItems.findIndex(i => i.id === selectedItem.id);
            if (idx < displayItems.length - 1) setSelectedItem(displayItems[idx + 1]);
          }}
          onPrev={() => {
            const idx = displayItems.findIndex(i => i.id === selectedItem.id);
            if (idx > 0) setSelectedItem(displayItems[idx - 1]);
          }}
          hasNext={displayItems.findIndex(i => i.id === selectedItem.id) < displayItems.length - 1}
          hasPrev={displayItems.findIndex(i => i.id === selectedItem.id) > 0}
        />
      )}
    </Layout>
  );
};

// Separated Modal Component for cleaner state management (Zoom)
const ModalViewer: React.FC<{
  item: MediaItem,
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void,
  hasNext: boolean,
  hasPrev: boolean
}> = ({ item, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Check if zoomed in
    if (transformRef.current && transformRef.current.instance.transformState.scale > 1.1) return;

    if (diff > 50 && hasNext) {
      onNext();
    } else if (diff < -50 && hasPrev) {
      onPrev();
    }
    setTouchStart(null);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-8 right-8 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Nav Buttons (Desktop/Visible on tap) */}
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12 overflow-y-auto max-h-screen pt-20 pb-12 px-4 no-scrollbar">
        <div
          className="flex-1 w-full h-[80vh] bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center backdrop-blur-sm relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
            maxScale={8}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                  {item.type === 'video' ? (
                    <video src={item.url} controls className="max-w-full max-h-full object-contain w-auto h-auto" />
                  ) : (
                    <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain w-auto h-auto" />
                  )}
                </TransformComponent>

                {/* Zoom Controls Overlay */}
                {item.type !== 'video' && (
                  <div className="absolute bottom-4 right-4 flex gap-2 z-50">
                    <button onClick={() => zoomIn()} className="p-2 bg-black/50 rounded-full text-white/70 hover:text-white backdrop-blur-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                    <button onClick={() => zoomOut()} className="p-2 bg-black/50 rounded-full text-white/70 hover:text-white backdrop-blur-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <button onClick={() => resetTransform()} className="p-2 bg-black/50 rounded-full text-white/70 hover:text-white backdrop-blur-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </TransformWrapper>
        </div>

        {/* Metadata Info */}
        <div className="w-full lg:w-96 space-y-6">
          <h3 className="text-3xl font-bold text-white break-words">{item.name}</h3>
          {item.metadata && (
            <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/10">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">AI Description</h4>
                <p className="text-gray-200 leading-relaxed font-light">{item.metadata.description}</p>
              </div>
              {item.metadata.tags && item.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.metadata.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">{tag}</span>
                  ))}
                </div>
              )}
              {/* Manual Analyze Button if unanalyzed */}
              {item.metadata.description === "Unanalyzed" && (
                <button
                  onClick={async () => {
                    // Trigger analysis manually
                    alert("AI Search will analyze this image when needed.");
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm"
                >
                  Analyze this image
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
