import { useState } from 'react';

const USERNAME = 'dealer';
const PASSWORD = 'dealer@1234';

export const AUTH_KEY = 'cockpit_assistant_auth';

export default function Login({ onSuccess }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (user.trim() === USERNAME && pass === PASSWORD) {
      try { sessionStorage.setItem(AUTH_KEY, '1'); } catch { /* storage unavailable */ }
      onSuccess();
    } else {
      setError('Incorrect username or password.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="mb-5">
          <div className="text-base font-semibold text-slate-900">Cockpit dealer assistant</div>
          <div className="text-xs text-slate-500">RBIN / Maruti Suzuki digital cockpit &middot; sign in to continue</div>
        </div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
        <input
          value={user}
          onChange={e => { setUser(e.target.value); setError(''); }}
          autoFocus
          autoComplete="username"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
        <input
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setError(''); }}
          autoComplete="current-password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2">
          Sign in
        </button>
      </form>
    </div>
  );
}
