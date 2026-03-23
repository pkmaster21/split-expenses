import { Link } from 'react-router-dom';
import { Button } from '../components/Button.js';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <div className="text-5xl mb-4">💸</div>
          <h1 className="text-4xl font-bold text-gray-900">Tabby</h1>
          <p className="mt-3 text-lg text-gray-500">
            Split expenses with friends. No account required.
          </p>
        </div>

        <div className="space-y-4">
          <Link to="/create" className="block">
            <Button size="lg" className="w-full">Create a group</Button>
          </Link>
          <p className="text-sm text-gray-400">
            Have an invite link? Open it to join a group.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: '🔗', title: 'Share a link', desc: 'Invite friends instantly' },
            { icon: '📊', title: 'Track expenses', desc: 'Equal, exact, or % splits' },
            { icon: '✅', title: 'Settle up', desc: 'Fewest transactions possible' },
          ].map((item) => (
            <div key={item.title} className="text-center space-y-1">
              <div className="text-2xl">{item.icon}</div>
              <div className="text-sm font-medium text-gray-700">{item.title}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
