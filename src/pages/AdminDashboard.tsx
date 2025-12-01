// src/pages/AdminDashboard.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
// Import functions for Auth, Firestore, and Cloud Functions
import { auth, db } from '../services/firebase'; 
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import type { QuerySnapshot, DocumentData } from 'firebase/firestore'; 
import { useNavigate } from 'react-router-dom';
import { Loader2, LogOut, FileText, BarChart3, X, ExternalLink, User } from 'lucide-react'; 

// --- CONFIGURATION ---
const ADMIN_SESSION_TIMEOUT_MINUTES = 30;
// 🔒 Admin Login Route - Make sure this matches your App.tsx route!
const LOGIN_ROUTE = '/secure-auth-2025-a5B8'; 

// --- TYPE DEFINITION (UPDATED TO INCLUDE ALL FIELDS) ---
interface RegistrationRecord {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    // 📍 ALL NEW FIELDS DEFINED
    dob: string;
    sex: string;
    stateOfOrigin: string;
    lga: string;
    address: string;
    // Existing fields
    state: string; // State of residence
    trainingArea: string;
    createdAt: string; 
    passportURL?: string; 
    ninURL?: string;      
}

const AdminDashboard: React.FC = () => {
    // --- STATE ---
    const [isLoading, setIsLoading] = useState(true); 
    const [isAuthenticated, setIsAuthenticated] = useState(false); 
    const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(false);

    // Modal State
    const [selectedUser, setSelectedUser] = useState<RegistrationRecord | null>(null);
    const [docUrls, setDocUrls] = useState<{ passport?: string, nin?: string } | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const navigate = useNavigate();
    const timeoutRef = useRef<number | undefined>(undefined);

    // --- 1. ROBUST LOGOUT FUNCTION ---
    const handleLogout = useCallback(async () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Sign out error (forcing redirect):", error);
        } finally {
            navigate(LOGIN_ROUTE, { replace: true });
        }
    }, [navigate]);

    // --- 2. IDLE TIMER ---
    const resetTimer = useCallback(() => {
        if (!isAuthenticated) return;

        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        
        const timeoutMs = ADMIN_SESSION_TIMEOUT_MINUTES * 60 * 1000;
        timeoutRef.current = window.setTimeout(() => {
            console.warn("Session timed out due to inactivity. Signing out.");
            handleLogout();
        }, timeoutMs);
    }, [isAuthenticated, handleLogout]);

    // --- 3. DATA FETCHING (Updated to include all new fields) ---
    const fetchRegistrations = useCallback(async () => {
        setIsFetchingData(true);
        try {
            const q = query(
                collection(db, "registrations"), 
                orderBy("timestamp", "desc"), 
                limit(50) 
            );

            const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
            
            const fetchedRecords: RegistrationRecord[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let dateStr = 'N/A';
                
                // Get the creation date string
                if (data.timestamp?.toDate) dateStr = data.timestamp.toDate().toLocaleDateString();
                else if (data.createdAt?.toDate) dateStr = data.createdAt.toDate().toLocaleDateString();

                fetchedRecords.push({
                    id: doc.id,
                    firstName: data.firstName || 'N/A',
                    lastName: data.lastName || 'N/A',
                    email: data.email || 'N/A',
                    phone: data.phone || 'N/A',
                    // 📍 NEW FIELDS MAPPED FROM FIRESTORE
                    dob: data.dob || 'N/A',
                    sex: data.sex || 'N/A',
                    stateOfOrigin: data.stateOfOrigin || 'N/A',
                    lga: data.lga || 'N/A',
                    address: data.address || 'N/A',
                    // Existing fields
                    state: data.state || 'N/A', // State of residence
                    trainingArea: data.trainingArea || 'N/A',
                    // File URLs
                    passportURL: data.passportURL,
                    ninURL: data.ninURL,
                    createdAt: dateStr,
                });
            });
            
            setRegistrations(fetchedRecords);
        } catch (error) {
            console.error("Error fetching data. Check Firestore Rules.", error);
        } finally {
            setIsFetchingData(false);
        }
    }, []);

    // --- 4. AUTHENTICATION CHECK ---
    useEffect(() => {
        let isMounted = true;

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                if (isMounted) handleLogout();
                return;
            }

            try {
                // Force refresh token to get latest claims
                const idTokenResult = await user.getIdTokenResult(true); 
                
            

                if (idTokenResult.claims.role === 'admin') {
                    if (isMounted) {
                        setIsAuthenticated(true);
                        setIsLoading(false); 
                        fetchRegistrations(); 
                        resetTimer();
                    }
                } else {
                    if (isMounted) {
                        // User is logged in but not admin: sign out
                        console.warn("🚨 ACCESS DENIED: Missing 'admin' role on account.");
                        alert("Access Denied: You do not have administrator privileges.");
                        await auth.signOut();
                        handleLogout(); 
                    }
                }
            } catch (e) {
                console.error("Auth check failed:", e);
                if (isMounted) handleLogout();
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, handleLogout]); 

    // --- 5. ACTIVITY LISTENERS ---
    useEffect(() => {
        if (!isAuthenticated) return;

        resetTimer(); 
        const events = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
        const handleActivity = () => resetTimer();

        events.forEach(e => window.addEventListener(e, handleActivity));
        
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
            events.forEach(e => window.removeEventListener(e, handleActivity));
        };
    }, [isAuthenticated, resetTimer]);
    
    // --- 6. DOCUMENT VIEWING ---
    const handleViewDetails = async (record: RegistrationRecord) => {
        setSelectedUser(record);
        setDocUrls(null);
        setModalLoading(true);
        
        // Use direct URLs from Firestore document if available
        if (record.passportURL || record.ninURL) {
            setDocUrls({ passport: record.passportURL, nin: record.ninURL });
            setModalLoading(false);
            return;
        }

        // --- FALLBACK: Generate Secure Links via Cloud Function ---
        try {
            const functions = getFunctions();
            const getUrl = httpsCallable(functions, 'getSignedDocumentUrl');
            
            let passportUrl: string | undefined;
            let ninUrl: string | undefined;

            try {
                // Assuming file paths are 'userId/passport.jpg'
                const res = await getUrl({ userId: record.id, fileName: 'passport.jpg' });
                passportUrl = (res.data as { url: string }).url;
            } catch (e) { console.warn("Passport link not generated via function (likely no file exists):", e); }

            try {
                // Assuming file paths are 'userId/nin.pdf'
                const res = await getUrl({ userId: record.id, fileName: 'nin.pdf' });
                ninUrl = (res.data as { url: string }).url;
            } catch (e) { console.warn("NIN link not generated via function (likely no file exists):", e); }

            setDocUrls({ passport: passportUrl, nin: ninUrl });
        } catch (error) {
            console.error("Secure link generation failed", error);
        } finally {
            setModalLoading(false);
        }
    };

    // --- RENDER ---

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
                <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                <p className="ml-3 text-gray-600 font-medium">Verifying Admin Access...</p>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-[#f8fdf8] p-4 sm:p-8 pt-24">
            
            {/* HEADER */}
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b-2 border-brand-primary/20 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-brand-dark flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-brand-primary"/>
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Secure Registration Management</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
                >
                    <LogOut size={18} /> Logout
                </button>
            </header>

            {/* CONTROLS */}
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-bold text-gray-700">
                    Total Registrations: <span className="text-brand-primary text-2xl ml-2">{registrations.length}</span>
                 </h2>
                 <button 
                     onClick={() => fetchRegistrations()}
                     disabled={isFetchingData}
                     className="text-sm text-brand-primary hover:text-brand-dark font-medium flex items-center gap-2 disabled:opacity-50"
                 >
                     {isFetchingData ? <Loader2 size={16} className="animate-spin"/> : null}
                     {isFetchingData ? 'Refreshing...' : 'Refresh List'}
                 </button>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Training</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {registrations.map((record) => (
                                <tr key={record.id} className="hover:bg-brand-light/10 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.createdAt}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {record.lastName}, {record.firstName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div className="flex flex-col">
                                            <span>{record.email}</span>
                                            <span className="text-xs text-gray-400">{record.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" title={record.trainingArea}>
                                        {record.trainingArea}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button 
                                            onClick={() => handleViewDetails(record)}
                                            className="text-brand-primary font-medium inline-flex items-center gap-1 border border-brand-primary/30 px-3 py-1 rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                                        >
                                            <FileText size={16}/> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {registrations.length === 0 && !isFetchingData && (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg">No registrations found.</p>
                        <p className="text-sm mt-1">Check your Firestore rules if you expect data here.</p>
                    </div>
                )}
            </div>

            {/* MODAL: SECURE VIEW (UPDATED) */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <User className="w-5 h-5 text-brand-primary"/> Full User Details
                            </h3>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[80vh] overflow-y-auto">
                            <h4 className="text-2xl font-extrabold text-brand-dark mb-4 border-b pb-2">
                                {selectedUser.firstName} {selectedUser.lastName}
                            </h4>
                            
                            {/* Personal Details Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8">
                                <h5 className="col-span-full text-lg font-bold text-gray-700 mt-2 mb-2">Personal & Location</h5>
                                
                                {/* 📍 NEW FIELDS RENDERED HERE */}
                                <DetailItem label="Date of Birth" value={selectedUser.dob} />
                                <DetailItem label="Sex" value={selectedUser.sex} />
                                <DetailItem label="State of Origin" value={selectedUser.stateOfOrigin} />
                                <DetailItem label="State of Residence" value={selectedUser.state} />
                                <DetailItem label="LGA" value={selectedUser.lga} />
                                <DetailItem label="Training Area" value={selectedUser.trainingArea} />
                                
                                <h5 className="col-span-full text-lg font-bold text-gray-700 mt-4 mb-2 border-t pt-4">Contact & Address</h5>

                                <DetailItem label="Email" value={selectedUser.email} />
                                <DetailItem label="Phone" value={selectedUser.phone} />
                                
                                <div className="col-span-full">
                                    {/* Use a full column for address */}
                                    <DetailItem label="Full Address" value={selectedUser.address} />
                                </div>

                                <div className="col-span-full border-t pt-4">
                                    <DetailItem label="Registered On" value={selectedUser.createdAt} />
                                </div>
                            </div>

                            {/* Document Section */}
                            <div className="border-t pt-6">
                                <h5 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-brand-primary"/> Uploaded Documents
                                </h5>

                                {modalLoading ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-gray-500 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                        <p>Generating secure temporary links...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Passport Link */}
                                        <DocumentLink 
                                            title="Passport Photo" 
                                            filename="passport.jpg" 
                                            url={docUrls?.passport}
                                            color="blue"
                                        />

                                        {/* NIN Link */}
                                        <DocumentLink 
                                            title="NIN Document" 
                                            filename="nin.pdf" 
                                            url={docUrls?.nin}
                                            color="purple"
                                        />
                                        
                                        <p className="text-center text-xs text-gray-400 pt-2">
                                            Links expire automatically in 1 hour (if using Cloud Function fallback).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HELPER COMPONENTS FOR MODAL ---

interface DetailItemProps {
    label: string;
    value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
    <div>
        <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
        {/* Added whitespace-pre-wrap to handle potential multiline data like addresses */}
        <p className="text-base text-gray-800 font-medium whitespace-pre-wrap">{value}</p>
    </div>
);

interface DocumentLinkProps {
    title: string;
    filename: string;
    url?: string;
    color: 'blue' | 'purple';
}

const DocumentLink: React.FC<DocumentLinkProps> = ({ title, filename, url, color }) => {
    const bgColor = color === 'blue' ? 'bg-blue-100' : 'bg-purple-100';
    const textColor = color === 'blue' ? 'text-blue-600' : 'text-purple-600';
    const hoverBorder = color === 'blue' ? 'hover:border-blue-400' : 'hover:border-purple-400';
    const textPrimary = color === 'blue' ? 'text-blue-600' : 'text-purple-600';

    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border border-gray-200 ${hoverBorder} hover:shadow-sm transition-all bg-white`}>
            <div className="flex items-center gap-3">
                <div className={`${bgColor} p-2 rounded-lg ${textColor}`}>
                    <FileText size={20} />
                </div>
                <div>
                    <p className="font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500">{filename}</p>
                </div>
            </div>
            {url ? (
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 text-sm font-bold ${textPrimary} hover:underline`}
                >
                    Open <ExternalLink size={14} />
                </a>
            ) : (
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">File Missing</span>
            )}
        </div>
    );
};

export default AdminDashboard;