import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Pause, X, Info, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// Block shapes definitions
const SHAPES = [
  [[1]], // 1x1
  [[1, 1]], // 1x2
  [[1], [1]], // 2x1
  [[1, 1, 1]], // 1x3
  [[1], [1], [1]], // 3x1
  [[1, 1], [1, 1]], // 2x2 square
  [[1, 1, 1], [0, 1, 0]], // T-shape
  [[1, 0], [1, 0], [1, 1]], // L-shape
  [[0, 1], [0, 1], [1, 1]], // Reverse L-shape
  [[1, 1, 0], [0, 1, 1]], // Z-shape
  [[0, 1, 1], [1, 1, 0]], // S-shape
  [[1, 1, 1, 1]], // 1x4
  [[1], [1], [1], [1]], // 4x1
  [[1, 1, 1], [1, 0, 0], [1, 0, 0]], // Big L
  [[1, 1, 1], [0, 0, 1], [0, 0, 1]], // Big Reverse L
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]], // 3x3 square
];

const COLORS = [
  '#FF3D00', // Deep Orange
  '#2979FF', // Blue
  '#00E676', // Green
  '#FFEA00', // Yellow
  '#D500F9', // Purple
  '#00E5FF', // Cyan
  '#FF9100', // Orange
  '#F50057', // Pink
];

const GRID_SIZE = 8;
const SPARKLE_URL = 'https://img.icons8.com/emoji/48/sparkles.png';

// Sound System
const playSound = (type: 'place' | 'clear' | 'gameover' | 'drag' | 'combo', comboCount: number = 0) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = ctx.currentTime;

  const playPop = (freq: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq / 3, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  };

  const playCrunch = (duration: number, volume: number) => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  };

  switch (type) {
    case 'place':
      playPop(150, 0.15, 0.3, 'triangle');
      playCrunch(0.08, 0.15);
      break;
    case 'clear':
      // Musical scale for clearing
      const baseFreq = 440;
      const scale = [0, 2, 4, 7, 9, 12]; // Pentatonic
      const noteIndex = Math.min(comboCount, scale.length - 1);
      const freq = baseFreq * Math.pow(2, scale[noteIndex] / 12);
      
      playPop(freq, 0.3, 0.3, 'sine');
      playPop(freq * 2, 0.2, 0.1, 'sine');
      playCrunch(0.4, 0.2);
      break;
    case 'combo':
      playPop(660, 0.5, 0.4, 'sine');
      playPop(880, 0.4, 0.3, 'sine');
      break;
    case 'gameover':
      playPop(80, 1.0, 0.6, 'sawtooth');
      break;
    case 'drag':
      playPop(400, 0.05, 0.05, 'sine');
      break;
  }
};

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface Block {
  id: string;
  shape: number[][];
  color: string;
  used: boolean;
}

export default function BlockBlast() {
  const { theme } = useAuth();
  const [grid, setGrid] = useState<(string | null)[][]>(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
  const [clearingCells, setClearingCells] = useState<{ r: number; c: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('blockBlastHighScore')) || 0);
  const [availableBlocks, setAvailableBlocks] = useState<Block[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<{ block: Block; index: number; x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [previewPos, setPreviewPos] = useState<{ r: number; c: number } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  const generateNewBlocks = useCallback(() => {
    const newBlocks: Block[] = [];
    for (let i = 0; i < 3; i++) {
      const shapeIndex = Math.floor(Math.random() * SHAPES.length);
      const colorIndex = Math.floor(Math.random() * COLORS.length);
      newBlocks.push({
        id: Math.random().toString(36).substr(2, 9),
        shape: SHAPES[shapeIndex],
        color: COLORS[colorIndex],
        used: false,
      });
    }
    setAvailableBlocks(newBlocks);
  }, []);

  const resetGame = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    generateNewBlocks();
  };

  useEffect(() => {
    generateNewBlocks();
    playSound('place'); // Start sound
  }, [generateNewBlocks]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('blockBlastHighScore', score.toString());
    }
  }, [score, highScore]);

  const canPlaceBlock = (shape: number[][], row: number, col: number, currentGrid: (string | null)[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gridR = row + r;
          const gridC = col + c;
          if (gridR < 0 || gridR >= GRID_SIZE || gridC < 0 || gridC >= GRID_SIZE || currentGrid[gridR][gridC] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const checkGameOver = useCallback((blocks: Block[], currentGrid: (string | null)[][]) => {
    const activeBlocks = blocks.filter(b => !b.used);
    if (activeBlocks.length === 0) return false;

    for (const block of activeBlocks) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlaceBlock(block.shape, r, c, currentGrid)) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const createParticles = (row: number, col: number, color: string) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;
    const centerX = rect.left + col * cellSize + cellSize / 2;
    const centerY = rect.top + row * cellSize + cellSize / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 20 + 15,
        life: 1,
      });
    }
    setParticles(prev => [...prev.slice(-50), ...newParticles]); // Keep only last 50 particles for performance
  };

  // Remove the manual physics interval as we'll use motion.div for smoother animations

  const placeBlock = (block: Block, blockIndex: number, row: number, col: number) => {
    if (!canPlaceBlock(block.shape, row, col, grid)) return false;

    const newGrid = grid.map(r => [...r]);
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c]) {
          newGrid[row + r][col + c] = block.color;
        }
      }
    }

    // Check for completed rows and columns
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r].every(cell => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid.every(row => row[c] !== null)) {
        colsToClear.push(c);
      }
    }

    let clearedCount = 0;
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) newGrid[r][c] = null;
      clearedCount++;
    });

    colsToClear.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = null;
      clearedCount++;
    });

    const blockPoints = block.shape.flat().filter(x => x).length;
    const clearPoints = clearedCount * GRID_SIZE * 2;
    const comboBonus = clearedCount > 1 ? clearedCount * 50 : 0;
    
    if (clearedCount > 0) {
      setCombo(prev => prev + clearedCount);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 1000);
      playSound('combo', combo + clearedCount);
      
      const cellsToClear: { r: number; c: number }[] = [];
      rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
          cellsToClear.push({ r, c });
          createParticles(r, c, newGrid[r][c] || block.color);
        }
      });
      colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!rowsToClear.includes(r)) {
            cellsToClear.push({ r, c });
            createParticles(r, c, newGrid[r][c] || block.color);
          }
        }
      });
      setClearingCells(cellsToClear);
      setTimeout(() => setClearingCells([]), 500);
    }

    setScore(prev => prev + blockPoints + clearPoints + comboBonus);
    setGrid(newGrid);
    playSound(clearedCount > 0 ? 'clear' : 'place', combo + clearedCount);

    const newBlocks = [...availableBlocks];
    newBlocks[blockIndex].used = true;
    
    if (newBlocks.every(b => b.used)) {
      generateNewBlocks();
      setCombo(0); // Reset combo when new set of blocks arrives
    } else {
      setAvailableBlocks(newBlocks);
      if (checkGameOver(newBlocks, newGrid)) {
        setGameOver(true);
        playSound('gameover');
      }
    }

    return true;
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, block: Block, index: number) => {
    if (gameOver || isPaused) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDraggingBlock({ block, index, x: clientX, y: clientY });
    setDragPosition({ x: clientX, y: clientY });
    playSound('drag');
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingBlock) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragPosition({ x: clientX, y: clientY });

    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const cellSize = rect.width / GRID_SIZE;
      
      const offsetX = clientX - rect.left;
      // Offset set to 0 for "put it where it is" direct feel
      const VISUAL_OFFSET = 0; 
      const offsetY = clientY - rect.top - VISUAL_OFFSET;
      
      const col = Math.round((offsetX / cellSize) - (draggingBlock.block.shape[0].length / 2));
      const row = Math.round((offsetY / cellSize) - (draggingBlock.block.shape.length / 2));

      if (row >= -2 && row < GRID_SIZE && col >= -2 && col < GRID_SIZE) {
        // Find best fit
        if (canPlaceBlock(draggingBlock.block.shape, row, col, grid)) {
          setPreviewPos({ r: row, c: col });
        } else {
          setPreviewPos(null);
        }
      } else {
        setPreviewPos(null);
      }
    }
  }, [draggingBlock, grid]);

  const handleDragEnd = useCallback(() => {
    if (!draggingBlock) return;

    if (previewPos) {
      placeBlock(draggingBlock.block, draggingBlock.index, previewPos.r, previewPos.c);
    }

    setDraggingBlock(null);
    setPreviewPos(null);
  }, [draggingBlock, previewPos, placeBlock]);

  useEffect(() => {
    if (draggingBlock) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [draggingBlock, handleDragMove, handleDragEnd]);

  return (
    <div className={cn(
      "flex flex-col items-center h-full w-full max-w-2xl mx-auto p-4 md:p-8 space-y-6 select-none",
      theme === 'dark' ? 'text-white' : 'text-slate-900'
    )}>
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none z-[110]">
        <AnimatePresence>
          {particles.map(p => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 1, scale: 0, x: p.x, y: p.y }}
              animate={{ 
                opacity: 0, 
                scale: [0, 1.5, 0], 
                rotate: 360,
                x: p.x + p.vx,
                y: p.y + p.vy,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute flex items-center justify-center"
              style={{
                width: p.size,
                height: p.size,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {Math.random() > 0.3 ? (
                <img 
                  src={SPARKLE_URL} 
                  alt="sparkle" 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div 
                  className="w-full h-full rounded-sm border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)]" 
                  style={{ backgroundColor: p.color }} 
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black tracking-tighter bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">BLOCK BLAST</h2>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Trophy className="w-3 h-3 text-amber-500" />
            High Score: {highScore}
          </div>
        </div>
        <div className="bg-blue-600 px-6 py-2 rounded-2xl shadow-lg shadow-blue-500/20 flex flex-col items-center">
          <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Score</span>
          <span className="text-2xl font-black text-white leading-none">{score}</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative w-full aspect-square max-w-[450px]">
        <div 
          ref={gridRef}
          className={cn(
            "grid grid-cols-8 grid-rows-8 gap-1 p-2 rounded-2xl w-full h-full border-8 transition-colors duration-300",
            theme === 'dark' ? 'bg-slate-950 border-slate-900 shadow-inner' : 'bg-slate-300 border-slate-400 shadow-inner'
          )}
        >
          {grid.map((row, r) => (
            row.map((cell, c) => {
              const isPreview = previewPos && 
                r >= previewPos.r && r < previewPos.r + draggingBlock!.block.shape.length &&
                c >= previewPos.c && c < previewPos.c + draggingBlock!.block.shape[0].length &&
                draggingBlock!.block.shape[r - previewPos.r][c - previewPos.c];

              return (
                <div 
                  key={`${r}-${c}`}
                  className={cn(
                    "rounded-md transition-all duration-150 relative overflow-hidden",
                    cell ? "shadow-lg" : theme === 'dark' ? 'bg-slate-900/80 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'bg-slate-200 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]',
                    isPreview && "scale-95",
                    clearingCells.some(cell => cell.r === r && cell.c === c) && "scale-0 opacity-0 transition-all duration-500 z-20"
                  )}
                  style={{
                    backgroundColor: cell || (isPreview ? `${draggingBlock?.block.color}44` : undefined),
                    boxShadow: cell ? `inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.2)` : undefined,
                    transform: isPreview ? 'scale(0.95)' : undefined
                  }}
                >
                  {!cell && !isPreview && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <div className="w-1 h-1 rounded-full bg-current" />
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>

        {/* Combo Popup */}
        <AnimatePresence>
          {showCombo && combo > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -50, scale: 1.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none"
            >
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full font-black text-2xl shadow-2xl border-4 border-white italic">
                COMBO x{combo}!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl p-8 text-center"
            >
              <Trophy className="w-16 h-16 text-amber-500 mb-4" />
              <h3 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Game Over</h3>
              <p className="text-slate-400 mb-8">Bạn đã đạt được {score} điểm!</p>
              <button 
                onClick={resetGame}
                className="w-full max-w-xs py-4 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-6 h-6" />
                Chơi lại
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Available Blocks */}
      <div className="w-full flex justify-around items-center h-32 max-w-[450px]">
        {availableBlocks.map((block, i) => (
          <div 
            key={block.id}
            className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              block.used ? "opacity-0 pointer-events-none scale-0" : "opacity-100 scale-100"
            )}
            style={{ width: '100px', height: '100px' }}
          >
            {!block.used && (
              <div 
                onMouseDown={(e) => handleDragStart(e, block, i)}
                onTouchStart={(e) => handleDragStart(e, block, i)}
                className="cursor-grab active:cursor-grabbing"
                style={{
                  display: 'grid',
                  gridTemplateRows: `repeat(${block.shape.length}, 1fr)`,
                  gridTemplateColumns: `repeat(${block.shape[0].length}, 1fr)`,
                  gap: '2px',
                  transform: 'scale(0.6)'
                }}
              >
                {block.shape.map((row, r) => (
                  row.map((cell, c) => (
                  <div 
                    key={`${r}-${c}`}
                    className="w-8 h-8 rounded-md"
                    style={{
                      backgroundColor: cell ? block.color : "transparent",
                      boxShadow: cell ? `inset -2px -2px 0px rgba(0,0,0,0.2), inset 2px 2px 0px rgba(255,255,255,0.2)` : undefined
                    }}
                  />
                  ))
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dragging Preview */}
      {draggingBlock && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{
            left: dragPosition.x,
            top: dragPosition.y, // Match VISUAL_OFFSET (0)
            transform: 'translate(-50%, -50%) scale(1.1)',
            opacity: 0.8, // Slightly transparent so finger doesn't totally hide it
            display: 'grid',
            gridTemplateRows: `repeat(${draggingBlock.block.shape.length}, 1fr)`,
            gridTemplateColumns: `repeat(${draggingBlock.block.shape[0].length}, 1fr)`,
            gap: '2px',
          }}
        >
          {draggingBlock.block.shape.map((row, r) => (
            row.map((cell, c) => (
              <div 
                key={`${r}-${c}`}
                className="w-10 h-10 rounded-md shadow-2xl border-2 border-white/20"
                style={{
                  backgroundColor: cell ? draggingBlock.block.color : "transparent",
                  boxShadow: cell ? `inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.2), 0 0 20px ${draggingBlock.block.color}44` : undefined
                }}
              />
            ))
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 w-full max-w-[450px]">
        <button 
          onClick={resetGame}
          className={cn(
            "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
            theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
          )}
        >
          <RotateCcw className="w-5 h-5" />
          Làm mới
        </button>
        <button 
          className={cn(
            "p-4 rounded-2xl font-bold transition-all",
            theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
          )}
        >
          <Info className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
