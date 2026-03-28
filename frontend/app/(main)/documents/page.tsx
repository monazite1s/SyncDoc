'use client';

export default function DocumentsPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-foreground">My Documents</h1>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition">
                    New Document
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Placeholder for document list */}
                <div className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition cursor-pointer">
                    <h3 className="font-medium text-lg mb-2 text-foreground">Sample Document</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        This is a sample document description...
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Last edited: 2 hours ago</span>
                        <span className="px-2 py-1 bg-secondary rounded text-secondary-foreground">
                            Draft
                        </span>
                    </div>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center hover:border-primary/50 transition cursor-pointer">
                    <div className="text-center text-muted-foreground">
                        <span className="text-4xl">+</span>
                        <p className="mt-2">Create New Document</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
