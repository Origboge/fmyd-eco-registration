// src/pages/AdminLogin.tsx

import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// ✅ Cleaned imports: Removed ShieldCheck as it was unused (Fixes warning)
import { Lock, LogOut, AlertTriangle, Loader2 } from 'lucide-react'; 

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const navigate = useNavigate();

    // --- Configuration ---
    // 🛑 NEW URL: Admin Dashboard Route
    const DASHBOARD_ROUTE = '/console-access-81cW-ctrl'; 


    // Monitor Auth State - Use for checking existing sessions
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const idTokenResult = await currentUser.getIdTokenResult(false);
                    const userRole = idTokenResult.claims.role as string;
                    setRole(userRole || "User (No Role)");

                    // If already logged in AND admin, bypass login page
                    if (userRole === 'admin') {
                        // 🛑 FIX: Redirect to the new dashboard URL
                        setTimeout(() => navigate(DASHBOARD_ROUTE, { replace: true }), 100);
                    }

                } catch (e) {
                    console.error("Token check failed on login page:", e);
                    setRole(null);
                }
            } else {
                setRole(null);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        setError("");
        await signOut(auth);
        setUser(null);
        setRole(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoggingIn(true); 
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // CRITICAL FIX: Force token refresh immediately after password sign-in
            const idTokenResult = await user.getIdTokenResult(true); 
            
            if (idTokenResult.claims.role === 'admin') {
                // SUCCESS: Redirect to the new dashboard URL
                navigate(DASHBOARD_ROUTE, { replace: true });
            } else {
                setError("Login successful, but user is not assigned the 'admin' role.");
                await signOut(auth);
            }

        } catch (e: any) {
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                setError("Invalid email or password.");
            } else {
                console.error("Login error:", e);
                setError("An unknown error occurred during login.");
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-2xl border border-brand-primary/20">
                <div className="text-center mb-8">
                    <Lock className="w-10 h-10 text-brand-primary mx-auto mb-3" />
                    <h2 className="text-3xl font-extrabold">Admin Access</h2>
                    <p className="text-gray-400 text-sm mt-1"> Secured Portal for Registration Management </p>
                </div>
                
                {/* JSX to conditionally render if the user is logged in but not admin */}
                {user && role !== 'admin' ? (
                    <div className="text-center">
                        <p className="text-red-400 mb-4">
                            You are logged in as a standard user. Access denied.
                        </p>
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all"
                        >
                            <LogOut size={20} className="inline mr-2" /> Log Out
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-800 border border-red-600 text-white rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:border-brand-primary outline-none transition-colors"
                                placeholder="admin@example.com"
                                disabled={isLoggingIn}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:border-brand-primary outline-none transition-colors"
                                placeholder="••••••••"
                                disabled={isLoggingIn}
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isLoggingIn ? 'Verifying...' : 'Access Dashboard'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;