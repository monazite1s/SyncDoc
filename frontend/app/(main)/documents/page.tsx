'use client';

export default function DocumentsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
          New Document
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Placeholder for document list */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-primary-300 transition cursor-pointer">
          <h3 className="font-medium text-lg mb-2">Sample Document</h3>
          <p className="text-gray-500 text-sm mb-4">
            This is a sample document description...
          </p>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Last edited: 2 hours ago</span>
            <span className="px-2 py-1 bg-gray-100 rounded">Draft</span>
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center hover:border-primary-400 transition cursor-pointer">
          <div className="text-center text-gray-500">
            <span className="text-4xl">+</span>
            <p className="mt-2">Create New Document</p>
          </div>
        </div>
      </div>
    </div>
  );
}
