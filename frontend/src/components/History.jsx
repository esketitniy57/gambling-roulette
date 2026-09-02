export default function History({ history }) {
  if (history.length === 0) return null;

  return (
    <div className="mb-6 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-gray-300">📜 История выпадений</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {history.map((item, index) => (
          <div
            key={item.roundId}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white border-2 ${
              item.color === 'red' ? 'bg-red-600 border-red-400' : 
              item.color === 'black' ? 'bg-gray-900 border-gray-600' : 
              'bg-green-600 border-green-400'
            } ${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}
            title={`Раунд #${item.roundId}`}
          >
            {item.color === 'green' ? '💚' : item.color === 'red' ? '❤️' : '🖤'}
          </div>
        ))}
      </div>
    </div>
  );
}
