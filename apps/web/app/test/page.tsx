export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Tailwind Test</h1>
      <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
        If you see red background, Tailwind is working!
      </div>
      <div className="bg-green-500 text-white p-4 rounded-lg mb-4">
        If you see green background, Tailwind is working!
      </div>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Test Button
      </button>
    </div>
  );
}
