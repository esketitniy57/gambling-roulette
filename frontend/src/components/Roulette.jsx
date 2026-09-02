import { useEffect, useRef } from 'react';

export default function Roulette({ winningColor, status }) {
  const wheelRef = useRef(null);
  
  // Создаём 14 секторов: 7 красных, 6 черных, 1 зеленый
  const sectors = [
    'green',
    'red', 'red', 'red', 'red', 'red', 'red', 'red',
    'black', 'black', 'black', 'black', 'black', 'black'
  ];

  useEffect(() => {
    if (status === 'spinning' && wheelRef.current) {
      // Случайное вращение
      const randomRotation = 1800 + Math.random() * 1800;
      wheelRef.current.style.transform = `translateX(-${randomRotation}px)`;
    }
    
    if (status === 'betting' && wheelRef.current) {
      wheelRef.current.style.transform = 'translateX(0)';
    }
  }, [status]);

  return (
    <div className="relative mb-8">
      {/* Указатель */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-yellow-400"></div>
      </div>

      {/* Рулетка */}
      <div className="overflow-hidden bg-gray-800 rounded-lg p-4">
        <div 
          ref={wheelRef}
          className="roulette-wheel"
          style={{ transition: status === 'spinning' ? 'transform 5s cubic-bezier(0.17, 0.67, 0.21, 0.99)' : 'none' }}
        >
          {sectors.map((color, index) => (
            <div
              key={index}
              className={`roulette-sector ${color} ${winningColor === color && status === 'finished' ? 'ring-4 ring-yellow-400' : ''}`}
            >
              {index === 0 ? '🟢' : color === 'red' ? '🔴' : '⚫'}
            </div>
          ))}
        </div>
      </div>

      {/* Результат */}
      {status === 'finished' && winningColor && (
        <div className="text-center mt-4">
          <p className="text-2xl font-bold">
            Выпало: <span className={
              winningColor === 'red' ? 'text-red-500' : 
              winningColor === 'black' ? 'text-gray-300' : 
              'text-green-500'
            }>
              {winningColor === 'red' ? 'КРАСНОЕ' : 
               winningColor === 'black' ? 'ЧЕРНОЕ' : 
               'ЗЕЛЕНОЕ'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
