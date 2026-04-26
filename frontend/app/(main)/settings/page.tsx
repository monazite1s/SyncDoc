import { SettingsForm } from './settings-form';

export default function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8 text-foreground">设置</h1>
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
                <SettingsForm />
            </div>
        </div>
    );
}
