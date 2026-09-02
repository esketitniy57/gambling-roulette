import { useEffect, useRef, useState } from 'react';

export default function Roulette({ winningColor, status }) {
  const wheelRef = useRef(null);
  const [offset, setOffset] = useState(0);

  const sectors = [
    'green',
    'red', 'black', 'red', 'black', 'red', 'black', 'red',
    'black', 'red', 'black', 'red', 'black', 'red'
  ];

  const sectorWidth = 84;

  useEffect(() => {
    if (status === 'spinning') {
      const randomSector = Math.floor(Math.random() * 14);
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const newOffset = offset + (extraSpins * 14 * sectorWidth) + (randomSector * sectorWidth);
      setOffset(newOffset);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'betting') {
      setOffset(0);
    }
  }, [status]);

  return (
    <div className="relative mb-8">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
      </div>

      <div className="overflow-hidden bg-gray-800 rounded-lg p-2 border-2 border-gray-700">
        <div 
          ref={wheelRef}
          className="flex"
          style={{ 
            transform: `translateX(-${offset % (14 * sectorWidth)}px)`,
            transition: status === 'spinning' ? 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1.0)' : 'none'
          }}
        >
          {[...sectors, ...sectors, ...sectors, ...sectors].map((color, index) => (
            <div
              key={index}
              className={`flex-shrink-0 flex items-center justify-center font-bold text-white border-r-2 border-gray-900 ${
                color === 'red' ? 'bg-red-600' : 
                color === 'black' ? 'bg-gray-900' : 
                'bg-green-600'
              }`}
              style={{ width: sectorWidth + 'px', height: '80px' }}
            >
              {color === 'green' ? '' : color === 'red' ? '❤️' : '🖤'}
            </div>
          ))}
        </div>
      </div>

      {status === 'finished' && winningColor && (
        <div className="text-center mt-4 animate-bounce">
          <p className="text-3xl font-bold">
            Выпало:{' '}
            <span className={
              winningColor === 'red' ? 'text-red-500' : 
              winningColor === 'black' ? 'text-gray-300' : 
              'text-green-500'
            }>
              {winningColor === 'red' ? '🔴 КРАСНОЕ' : 
               winningColor === 'black' ? '⚫ ЧЁРНОЕ' : 
               '🟢 ЗЕЛЁНОЕ'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
