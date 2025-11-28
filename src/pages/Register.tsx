import * as React from 'react';
import { useState, useEffect } from 'react';

// ✅ MODULAR IMPORTS
import { signInAnonymously } from 'firebase/auth'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
// ✅ FUNCTIONS IMPORTS
import { getFunctions, httpsCallable } from 'firebase/functions';

import type { ChangeEvent } from 'react';
import { STATE_LGAS } from '../constants';
import { auth, db, storage } from '../services/firebase';

import type { RegistrationFormData } from '../types'
// ✅ ICONS (Added 'X' back for the Terms modal)
import { CheckCircle2, Upload, XCircle, Image as ImageIcon, Loader2, Check, X } from 'lucide-react';

const Register: React.FC = () => {
    const [formData, setFormData] = useState<RegistrationFormData>({
        firstName: '', middleName: '', lastName: '', email: '', phone: '',
        dob: '', sex: '', 
        stateOfOrigin: '', 
        state: '', lga: '', 
        address: '', landmark: '', trainingArea: '',
    });
    const [age, setAge] = useState<number | null>(null);
    const [lgas, setLgas] = useState<string[]>([]);
    
    // Submission Status State
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    
    // ✅ RESTORED: Terms Modal State
    const [showTerms, setShowTerms] = useState(false);

    // Visual & Validation State
    const [previews, setPreviews] = useState<{passport?: string, nin?: string}>({});
    const [fieldErrors, setFieldErrors] = useState<{phone?: string, email?: string}>({});
    const [fileErrors, setFileErrors] = useState<{passport?: string, nin?: string}>({});

    // --- ✅ OTP STATE ---
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState(''); 

    const functions = getFunctions();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            if (previews.passport) URL.revokeObjectURL(previews.passport);
            if (previews.nin) URL.revokeObjectURL(previews.nin);
        };
    }, [previews]);

    // --- ✅ LOGIC: SEND OTP (STRICT VALIDATION) ---
    const handleSendOtp = async () => {
        setOtpError('');
        setFeedbackMsg('');

        // 1. STRICT VALIDATION: Check every single string field
        const requiredFields: (keyof RegistrationFormData)[] = [
            'firstName', 'lastName', 'email', 'phone', 'dob', 'sex',
            'stateOfOrigin', 'state', 'lga', 'address', 'landmark', 'trainingArea'
        ];

        // Find the first missing field
        const missingField = requiredFields.find(field => !formData[field] || formData[field].toString().trim() === '');

        if (missingField) {
            // Convert camelCase to Readable Text (e.g., stateOfOrigin -> State Of Origin)
            const readableField = missingField.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            setOtpError(`Please fill in the "${readableField}" field before verifying.`);
            
            // Scroll to top so they see what is missing
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
        }

        // 2. Specific Checks
        if (fieldErrors.email || fieldErrors.phone) {
            setOtpError("Please fix the validation errors (Email/Phone) first.");
            return;
        }
        if (age !== null && age < 18) {
            setOtpError("You must be 18+ to register.");
            return;
        }
        if (!formData.passport || !formData.nin) {
            setOtpError("Please upload both Passport and NIN documents.");
            return;
        }

        // 3. Send OTP
        setVerifying(true);
        try {
            const sendOtpFn = httpsCallable(functions, 'sendRegistrationOtp');
            await sendOtpFn({ email: formData.email, name: formData.firstName }); 
            
            setOtpSent(true);
            
            // ✅ SIMPLE FEEDBACK (No confusing full-screen popup)
            setFeedbackMsg(`Code sent to ${formData.email}. Please enter it below.`);

        } catch (error: any) {
            console.error("OTP Error:", error);
            setOtpError(error.message || 'Failed to send code. Check internet or email.');
        } finally {
            setVerifying(false);
        }
    };

    // --- ✅ LOGIC: VERIFY OTP -> THEN SHOW TERMS ---
    const handleVerifyOtp = async () => {
        if (otpCode.length < 6) return;
        
        setVerifying(true);
        setOtpError('');
        
        try {
            // 1. Verify Code with Backend
            const verifyOtpFn = httpsCallable(functions, 'verifyRegistrationOtp');
            await verifyOtpFn({ email: formData.email, code: otpCode });
            
            setIsEmailVerified(true);
            setVerifying(false); // Stop loading so we can show the modal
            
            // 2. 🚀 OPEN TERMS MODAL (User must accept to submit)
            setShowTerms(true);

        } catch (error: any) {
            console.error("Verification Error:", error);
            setOtpError('Invalid code or expired. Please try again.');
            setVerifying(false); 
        }
    };

    // --- EXISTING HANDLERS ---

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (['firstName', 'middleName', 'lastName'].includes(name)) {
            if (!/^[A-Za-z\s]*$/.test(value)) return; 
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() } as RegistrationFormData));
            return;
        }

        if (name === 'phone') {
             if (!/^[0-9+\-\s]*$/.test(value)) {
                setFieldErrors(prev => ({ ...prev, phone: "Only numbers are allowed." }));
                setTimeout(() => setFieldErrors(prev => ({ ...prev, phone: undefined })), 2000);
                return; 
             } else {
                setFieldErrors(prev => ({ ...prev, phone: undefined }));
             }
        }

        setFormData(prev => ({ ...prev, [name]: value } as RegistrationFormData));

        if (name === 'state') {
            setLgas(STATE_LGAS[value] || []);
            setFormData(prev => ({ ...prev, state: value, lga: '' } as RegistrationFormData));
        }

        if (name === 'dob') {
            const birth = new Date(value);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                calculatedAge--;
            }
            setAge(calculatedAge);
        }
    };

    const handleEmailBlur = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
             setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
        } else {
             setFieldErrors(prev => ({ ...prev, email: undefined }));
        }
        
        // Reset verification if email changes
        if (isEmailVerified) {
            setIsEmailVerified(false);
            setOtpSent(false);
            setOtpCode('');
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        setFileErrors(prev => ({...prev, [name]: undefined}));

        if (files && files[0]) {
            const file = files[0];
            if (file.size > 25 * 1024) { 
                setFileErrors(prev => ({...prev, [name]: "File too large. Max size is 25KB."}));
                e.target.value = ''; 
                setPreviews(prev => {
                    const newPreviews = {...prev};
                    if (name === 'passport') delete newPreviews.passport;
                    if (name === 'nin') delete newPreviews.nin;
                    return newPreviews;
                });
                return;
            }
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [name]: url }));
            setFormData(prev => ({ ...prev, [name]: files } as RegistrationFormData));
        }
    };

    const handleFinalSubmit = async () => {
        setShowTerms(false);
        setStatus('submitting');

        try {
            let user = auth.currentUser;
            if (!user) {
                const userCred = await signInAnonymously(auth); 
                user = userCred.user;
            }

            if (!user) throw new Error("Authentication failed.");

            const passportFile = formData.passport![0];
            const ninFile = formData.nin![0];
            
            const passportRef = ref(storage, `passport/${user.uid}/${Date.now()}_${passportFile.name}`);
            const ninRef = ref(storage, `nin/${user.uid}/${Date.now()}_${ninFile.name}`);

            await uploadBytes(passportRef, passportFile);
            await uploadBytes(ninRef, ninFile);

            const passportUrl = await getDownloadURL(passportRef);
            const ninUrl = await getDownloadURL(ninRef);

            await addDoc(collection(db, 'registrations'), {
                ...formData,
                stateOfOrigin: formData.stateOfOrigin, 
                passportURL: passportUrl,
                ninURL: ninUrl,
                age: age,
                userId: user.uid,
                timestamp: serverTimestamp(), 
                passport: null, 
                nin: null 
            });

            setStatus('success');
            setFormData({
                firstName: '', middleName: '', lastName: '', email: '', phone: '',
                dob: '', sex: '', stateOfOrigin: '', state: '', lga: '', address: '', landmark: '', trainingArea: ''
            });
            setPreviews({});
            setIsEmailVerified(false);
            setOtpSent(false);
            setOtpCode('');

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setVerifying(false); 
        }
    };

    // --- RENDER ---

    if (status === 'success') {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-white to-brand-light/30 p-4 overflow-y-auto">
                <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full animate-fade-in-up border border-brand-light relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary"></div>
                    <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle2 className="w-14 h-14 text-brand-primary" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-brand-dark mb-2">Registration Successful!</h2>
                    <p className="text-gray-600 mb-8 font-medium">Thank you for joining the Circular Economy Youth Empowerment Initiative.</p>
                    <button onClick={() => setStatus('idle')} className="bg-brand-primary text-white px-10 py-3 rounded-full font-bold hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                        Welldone
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-b from-white via-brand-light/40 to-brand-primary/5 min-h-screen py-24 px-4 relative">
            
            {status === 'submitting' && (
                <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center overflow-y-auto">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-gray-200 border-t-brand-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <p className="mt-6 text-xl font-bold text-brand-primary animate-pulse">Submitting Application...</p>
                    <p className="text-gray-500 text-sm mt-2">Please do not close this page.</p>
                </div>
            )}

            {status === 'error' && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up overflow-y-auto">
                    <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full border border-red-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-14 h-14 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-red-600 mb-2">Registration Failed</h2>
                        <p className="text-gray-600 mb-8 font-medium">We couldn't submit your application. Please check your internet connection and try again.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setStatus('idle')} className="px-8 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Close</button>
                            <button onClick={handleFinalSubmit} className="bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">Try Again</button>
                        </div>
                    </div>
                </div>
            )}
    
            <div className="-mt-11 pt-0 pb-0 -mb-11 max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-brand-primary to-brand-dark p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white relative z-10 mb-2 ">Registration Form</h2>
                    <div className="h-1 w-20 bg-brand-light mx-auto rounded-full mb-3 relative z-10"></div>
                    <p className="text-brand-light text-sm md:text-base relative z-10 font-medium">Fill in your details accurately to join the training.</p>
                </div>

                <form className="p-6 md:p-10 space-y-8">
                    
                    {/* Personal Information */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <h3 className="text-lg font-bold text-brand-primary border-b-2 border-brand-primary/10 pb-2 mb-6 flex items-center gap-2 uppercase tracking-wider">Personal Information</h3>
                        <div className="grid md:grid-cols-3 gap-5">
                            <div><input required name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="input-field uppercase-input" /></div>
                            <div><input required name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Middle Name" className="input-field uppercase-input" /></div>
                            <div><input required name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="input-field uppercase-input" /></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-5 mt-5">
                            <div>
                                <input required type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleEmailBlur} placeholder="Email Address" className={`input-field ${fieldErrors.email ? 'border-red-500 focus:ring-red-200' : ''}`} />
                                {fieldErrors.email && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{fieldErrors.email}</p>}
                            </div>
                            <div>
                                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number (+234...)" className={`input-field ${fieldErrors.phone ? 'border-red-500 focus:ring-red-200' : ''}`} />
                                {fieldErrors.phone && <p className="text-red-500 text-xs font-bold mt-1 ml-1 animate-pulse">{fieldErrors.phone}</p>}
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-5 mt-5">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1 uppercase ml-1">Date of Birth</label>
                                <input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="input-field" />
                                {age !== null && <span className={`text-xs mt-1 font-bold ml-1 ${age < 18 ? 'text-red-500' : 'text-brand-primary'}`}>Age: {age} {age < 18 && "(Must be 18+)"}</span>}
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1 uppercase ml-1">Sex</label>
                                <select required name="sex" value={formData.sex} onChange={handleChange} className="input-field">
                                    <option value="">Select Sex</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* State of Origin */}
                    <div className="md:col-span-1">
                        <label htmlFor="stateOfOrigin" className="block text-sm font-medium text-gray-700 mb-1">STATE OF ORIGIN <span className="text-red-500">*</span></label>
                        <select id="stateOfOrigin" name="stateOfOrigin" value={formData.stateOfOrigin} onChange={handleChange} required className="input-field">
                            <option value="" disabled>Select State of Origin</option>
                            {Object.keys(STATE_LGAS).map(stateName => (
                                <option key={stateName} value={stateName}>{stateName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Address */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <h3 className="text-lg font-bold text-brand-primary border-b-2 border-brand-primary/10 pb-2 mb-6 flex items-center gap-2 uppercase tracking-wider">Address</h3>
                        <div className="grid md:grid-cols-2 gap-5">
                            <select required name="state" value={formData.state} onChange={handleChange} className="input-field">
                                <option value="">Select State Of Residence</option>
                                {Object.keys(STATE_LGAS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select required name="lga" value={formData.lga} onChange={handleChange} disabled={!formData.state} className="input-field disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
                                <option value="">Select LGA Of Residence</option>
                                {lgas.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <textarea required name="address" value={formData.address} onChange={handleChange} placeholder="Permanent Home Address" className="input-field mt-5 h-24 resize-none" />
                        <textarea required name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Nearest Landmark" className="input-field mt-5 h-16 resize-none" />
                    </div>

                    {/* Documents */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <h3 className="text-lg font-bold text-brand-primary border-b-2 border-brand-primary/10 pb-2 mb-6 flex items-center gap-2 uppercase tracking-wider">Documents (Max 25KB)</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Passport */}
                            <div className="flex flex-col">
                                <div className={`relative border-2 border-dashed rounded-2xl p-2 h-64 flex flex-col items-center justify-center text-center transition-all group overflow-hidden ${fileErrors.passport ? 'border-red-300 bg-red-50' : (previews.passport ? 'border-brand-primary bg-brand-light/20' : 'border-gray-300 hover:border-brand-primary hover:bg-brand-light/10')}`}>
                                    {previews.passport ? (
                                        <>
                                            <img src={previews.passport} alt="Passport Preview" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold flex items-center gap-2"><Upload size={18} /> Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="z-10 flex flex-col items-center p-6">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${fileErrors.passport ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400 group-hover:bg-brand-primary group-hover:text-white'}`}>
                                                {fileErrors.passport ? <XCircle size={28} /> : <ImageIcon size={28} />}
                                            </div>
                                            <p className={`${fileErrors.passport ? 'text-red-600' : 'text-gray-700'} font-bold text-lg`}>Passport Photo</p>
                                            <p className="text-xs text-gray-500 mt-1">Click to browse (Max 25KB)</p>
                                        </div>
                                    )}
                                    <input required type="file" name="passport" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                                </div>
                                {fileErrors.passport && <p className="text-red-500 text-xs font-bold mt-2 ml-1 text-center">{fileErrors.passport}</p>}
                            </div>

                            {/* NIN */}
                            <div className="flex flex-col">
                                <div className={`relative border-2 border-dashed rounded-2xl p-2 h-64 flex flex-col items-center justify-center text-center transition-all group overflow-hidden ${fileErrors.nin ? 'border-red-300 bg-red-50' : (previews.nin ? 'border-brand-primary bg-brand-light/20' : 'border-gray-300 hover:border-brand-primary hover:bg-brand-light/10')}`}>
                                    {previews.nin ? (
                                        <>
                                            <img src={previews.nin} alt="NIN Preview" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold flex items-center gap-2"><Upload size={18} /> Change File</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="z-10 flex flex-col items-center p-6">
                                             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${fileErrors.nin ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400 group-hover:bg-brand-primary group-hover:text-white'}`}>
                                                {fileErrors.nin ? <XCircle size={28} /> : <ImageIcon size={28} />}
                                            </div>
                                            <p className={`${fileErrors.nin ? 'text-red-600' : 'text-gray-700'} font-bold text-lg`}>NIN Slip</p>
                                            <p className="text-xs text-gray-500 mt-1">Click to browse (Max 25KB)</p>
                                        </div>
                                    )}
                                    <input required type="file" name="nin" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                                </div>
                                {fileErrors.nin && <p className="text-red-500 text-xs font-bold mt-2 ml-1 text-center">{fileErrors.nin}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Training Selection */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <h3 className="text-lg font-bold text-brand-primary border-b-2 border-brand-primary/10 pb-2 mb-6 flex items-center gap-2 uppercase tracking-wider">Training Selection</h3>
                        <select required name="trainingArea" value={formData.trainingArea} onChange={handleChange} className="input-field w-full text-lg py-3">
                            <option value="">Select Area of Training</option>
                            <option>Plastic Recycling</option>
                            <option>Wind Turbines</option>
                            <option>Glass Recycling</option>
                            <option>E-Waste Recycling</option>
                            <option>Waste to Feeds & Fertilizers</option>
                            <option>Textile Recycling</option>
                            <option>Waste Exportation</option>
                            <option>Metal Recycling</option>
                            <option>Scrap Recycling</option>
                            <option>Energy & Community Solutions</option>
                            <option>Upscaling & Upcycling</option>
                            <option>Solar Installation and Maintainance</option>
                            <option>Ecoprenuership</option>
                            <option>Eco literacy </option>
                            <option>Afforestation & Reforestation</option>
                            <option>Waste Collection, Sorting, Segregation and Sales</option>
                        </select>
                    </div>

                    {/* --- ✅ EMAIL VERIFICATION & AUTO SUBMIT SECTION --- */}
                    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm">
                        <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
                            <span className="bg-brand-primary text-white text-xs px-2 py-1 rounded">REQUIRED</span>
                            Email Verification
                        </h3>

                        {/* 1. MESSAGE AREA (Toast) */}
                        {feedbackMsg && (
                            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center animate-fade-in-down shadow-sm flex items-center justify-center gap-2">
                                <Check size={16} /> {feedbackMsg}
                            </div>
                        )}

                        {/* 2. ERROR AREA */}
                        {otpError && (
                            <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg text-sm flex items-center gap-2 animate-pulse border border-red-100">
                                <XCircle size={16} /> {otpError}
                            </div>
                        )}

                        {/* 3. INPUTS & BUTTONS */}
                        {!otpSent ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">
                                    We need to verify your email <span className="font-bold text-brand-dark">{formData.email || '...'}</span> before you can submit.
                                </p>
                                <button
                                    onClick={handleSendOtp}
                                    disabled={verifying}
                                    type="button"
                                    className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-black transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifying ? <Loader2 className="animate-spin" /> : 'Send Verification Code'}
                                </button>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Enter 6-Digit Code</label>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full sm:flex-1 p-3 border border-gray-300 rounded-xl text-center tracking-[0.5em] font-bold text-lg focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                        placeholder="000000"
                                    />
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={verifying || otpCode.length < 6}
                                        type="button"
                                        className="w-full sm:w-auto px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center shadow-md whitespace-nowrap"
                                    >
                                        {verifying ? <Loader2 className="animate-spin" /> : 'Verify'}
                                    </button>
                                </div>

                                <p className="text-[10px] text-gray-400 mt-3 text-center">
                                    Click "Verify" to proceed to Terms & Conditions.
                                </p>
                                <button onClick={() => setOtpSent(false)} type="button" className="text-xs text-gray-500 mt-2 hover:text-brand-primary underline w-full text-center">
                                    Wrong email? Resend Code
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* ✅ TERMS MODAL (Restored) */}
            {showTerms && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 max-h-[80vh] flex flex-col shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h3 className="text-2xl font-bold text-brand-dark">Terms & Conditions</h3>
                            <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 mb-6 text-base text-gray-600 space-y-4 pr-2 custom-scrollbar">
                            <p className="font-medium">Before proceeding, please accept our Data Privacy Policy in compliance with the Nigeria Data Protection Act 2023.</p>
                            <ul className="list-disc pl-5 space-y-3 marker:text-brand-primary">
                                <li><strong>Collection:</strong> We collect your data solely for program registration, verification, and communication purposes.</li>
                                <li><strong>Sharing:</strong> Data may be shared with verified government partners and training providers strictly for program delivery.</li>
                                <li><strong>Security:</strong> We implement strict security measures to protect your data from unauthorized access or breaches.</li>
                                <li><strong>Accuracy:</strong> You affirm that all information provided is accurate and verifiable. Providing false information may lead to disqualification.</li>
                            </ul>
                            <p className="text-sm bg-brand-light/30 p-4 rounded-xl border border-brand-primary/20 text-brand-dark font-medium">By clicking "Accept & Submit", you consent to these terms and the processing of your personal data.</p>
                        </div>
                        <div className="flex gap-4 justify-end shrink-0">
                            <button onClick={() => setShowTerms(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Decline</button>
                            {/* This is the REAL submit trigger */}
                            <button onClick={handleFinalSubmit} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-lg hover:shadow-xl">Accept & Submit</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.9rem 1.25rem;
                    background-color: #ffffff;
                    border: 2px solid #e5e7eb;
                    border-radius: 0.75rem;
                    outline: none;
                    transition: all 0.3s;
                    color: #111827;
                    font-weight: 500;
                }
                .input-field:focus {
                    border-color: hsl(142, 76%, 36%);
                    box-shadow: 0 0 0 4px rgba(12, 136, 41, 0.1);
                }
                .input-field::placeholder {
                    color: #9ca3af;
                    font-weight: 400;
                }
                .input-field:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 30px white inset !important;
                    -webkit-text-fill-color: #111827 !important;
                }
            `}</style>
        </div>
    );
};

export default Register;