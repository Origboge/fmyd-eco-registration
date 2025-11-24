// src/pages/AdminLogin.tsx
import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Lock, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [error, setError] = useState("");

    // Monitor Auth State
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Check if this user has the admin token
                try {
                    const idTokenResult = await currentUser.getIdTokenResult(true);
                    setRole(idTokenResult.claims.role as string || "User (No Role)");
                } catch (e) {
                    console.error(e);
                }
            } else {
                setRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setEmail("");
        setPassword("");
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-brand-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                    <p className="text-gray-400 text-sm">Authorized Personnel Only</p>
                </div>

                {user ? (
                    <div className="space-y-6 text-center">
                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                            <p className="text-gray-300 text-sm mb-1">Logged in as:</p>
                            <p className="text-white font-mono font-bold text-lg mb-2">{user.email}</p>
                            
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${role === 'admin' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {role === 'admin' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                                Role: {role}
                            </div>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg p-3 focus:border-brand-primary outline-none transition-colors"
                                placeholder="admin@fmyd.gov.ng"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg p-3 focus:border-brand-primary outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-1"
                        >
                            Access Dashboard
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;