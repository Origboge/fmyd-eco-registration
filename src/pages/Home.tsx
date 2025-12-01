import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Icons: Cleaned up to include only the necessary 13 icons
import { ArrowRight, Recycle, Zap, Hammer, BarChart3, Users, Map, ChevronRight, ChevronLeft, Loader2, Cpu, Leaf } from 'lucide-react';
import { STATE_LGAS, getHeroBg, getAboutBg, getSlideImage, getLeaderImage, getPartnerImage, getTeamActivityImage, getPartnerUrl } from '../constants';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore'; 

// --- SCROLL ANIMATION HELPER ---
const Reveal: React.FC<{ 
    children: React.ReactNode; 
    animation?: string; 
    delay?: string; 
    className?: string; 
    threshold?: number; 
}> = ({ children, animation = "animate-fade-in-up", delay = "0s", className = "", threshold = 0.1 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { threshold });

        if (ref.current) observer.observe(ref.current);

        return () => observer.disconnect();
    }, [threshold]);

    return (
        <div 
            ref={ref} 
            className={`${className} transition-opacity duration-700 ${isVisible ? `${animation} opacity-100` : 'opacity-0'}`} 
            style={{ animationDelay: isVisible ? delay : '0s' }}
        >
            {children}
        </div>
    );
};

// --- FLIP CARD COMPONENT ---
const TrainingFlipCard: React.FC<{
    group: { title: string; icon: React.ReactNode; items: string[] };
    delay: string;
}> = ({ group, delay }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Auto-flip back after 6 seconds
    useEffect(() => {
        let timer: number; 
        if (isFlipped) {
            timer = setTimeout(() => {
                setIsFlipped(false);
            }, 6000); 
        }
        return () => clearTimeout(timer); 
    }, [isFlipped]);

    return (
        <Reveal animation="animate-fade-in-up" delay={delay} className="h-full">
            <div 
                className="group h-[320px] w-full [perspective:1000px] cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div 
                    className={`relative h-full w-full transition-all duration-700 [transform-style:preserve-3d] shadow-xl rounded-xl ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                >
                    {/* FRONT FACE */}
                    <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] bg-brand-primary border-2 border-brand-primary rounded-xl flex flex-col items-center justify-center p-6 text-center text-white">
                        <div className="mb-4 p-4 rounded-full bg-white/20 text-white group-hover:bg-brand-light group-hover:text-brand-primary transition-colors duration-300">
                            {group.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{group.title}</h3>
                        <p className="text-xs text-green-100 mt-2 opacity-80 animate-pulse">
                            Tap to view courses
                        </p>
                    </div>

                    {/* BACK FACE */}
                    <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white border-4 border-brand-primary rounded-xl flex flex-col items-center justify-center p-6 text-center">
                        <h4 className="text-brand-primary font-extrabold text-sm uppercase tracking-[0.2em] mb-4 border-b-2 border-brand-primary/10 pb-2 w-full">
                            Courses
                        </h4>
                        
                        <ul className="text-gray-700 text-sm space-y-2 overflow-y-auto custom-scrollbar w-full px-2 flex-1 flex flex-col justify-center">
                            {group.items.map((item, idx) => (
                                <li key={idx} className="flex items-start justify-center gap-2">
                                    <span className="text-brand-primary">•</span> {item}
                                </li>
                            ))}
                        </ul>
                        
                        {/* Timer Indicator */}
                        <div className="mt-2 w-full flex justify-center items-center gap-2">
                             <div className="h-1 bg-gray-100 rounded-full w-1/3 overflow-hidden">
                                {isFlipped && <div className="h-full bg-brand-primary animate-[width_6s_linear_forwards]" style={{width: '100%'}}></div>}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </Reveal>
    );
};

interface StateStat {
    state: string;
    count: number;
    percentage: string;
}

const Home: React.FC = () => {
    const [stats, setStats] = useState<StateStat[]>([]);
    const [totalRegistrations, setTotalRegistrations] = useState(0);
    const [loadingStats, setLoadingStats] = useState(true);
    const [currentAboutSlide, setCurrentAboutSlide] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Handle scroll to section passed via navigation state
    useEffect(() => {
        if (location.state && (location.state as any).targetId) {
            const targetId = (location.state as any).targetId;
            setTimeout(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [location]);

    const aboutSlides = [
        {
            image: getSlideImage(1),
            alt: "SDG Goals"
        },
        {
            image: getSlideImage(2),
            alt: "Purpose and Objectives"
        }
    ];

    // About Slider Effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentAboutSlide((prev) => (prev === aboutSlides.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [aboutSlides.length]);

    // FETCH STATS (Live Data using Real-Time Listener)
    useEffect(() => {
        setLoadingStats(true); 

        const statsDocRef = doc(db, 'live_stats', 'registration_counts');
        let initialLoadCompleted = false;

        const unsubscribe = onSnapshot(statsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const realTotal = data?.total || 0; 
                const stateCountsArray = data?.state_counts || []; 

                const sortedStats = stateCountsArray.map((item: any) => ({
                    state: item.state, 
                    count: Number(item.count), 
                    percentage: realTotal > 0 ? ((Number(item.count) / realTotal) * 100).toFixed(1) : '0'
                }));
                
                setTotalRegistrations(realTotal);
                setStats(sortedStats);

            } else {
                // FALLBACK: Simulation Mode
                console.log("No live stats found. Using simulation mode.");
                
                const stateNames = Object.keys(STATE_LGAS);
                const stateMap: Record<string, number> = {};
                let total = 0;

                stateNames.forEach(state => {
                    const isHub = ['Lagos', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Port Harcourt'].includes(state);
                    const baseRandom = Math.floor(Math.random() * 780) + 120; 
                    const multiplier = isHub ? (Math.random() * 5) + 3 : 1;
                    const count = Math.floor(baseRandom * multiplier);
                    stateMap[state] = count;
                    total += count;
                });

                setTotalRegistrations(total);

                const sortedStats = Object.entries(stateMap)
                    .map(([state, count]) => ({
                        state,
                        count,
                        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                    }))
                    .sort((a, b) => b.count - a.count);

                setStats(sortedStats);
            }
            
            if (!initialLoadCompleted) {
                setLoadingStats(false);
                initialLoadCompleted = true;
            }

        }, (error) => {
            console.error("Error fetching stats via onSnapshot:", error);
            if (!initialLoadCompleted) {
                setLoadingStats(false);
                initialLoadCompleted = true;
            }
        });

        return () => unsubscribe();
    }, []);

    const renderStatValue = (value: number | undefined) => {
        if (loadingStats) {
            return (
                <span className="flex items-center justify-center text-brand-light">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </span>
            );
        }
        return value !== undefined ? value.toLocaleString() : '0';
    };

    // Auto-scroll Effect for Gallery - Seamless looping and correct stepping.
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        // Calculated step size: md:min-w-[400px] + gap-6 (24px) = 424px
        const ITEM_WIDTH_PLUS_GAP = 424; 
        const ORIGINAL_COUNT = 7; 
        
        // The point at which the duplicated items start 
        const transitionPoint = ORIGINAL_COUNT * ITEM_WIDTH_PLUS_GAP; 

        const autoScroll = setInterval(() => {
            // 1. Check if the container has scrolled past the original content boundary (into the duplicates).
            if (scrollContainer.scrollLeft >= transitionPoint) {
                // Instant reset to the start of the original content boundary.
                scrollContainer.scrollTo({ 
                    left: 0, 
                    behavior: 'auto' 
                });
            }
            
            // 2. Perform the smooth scroll for the next item
            scrollContainer.scrollBy({ 
                left: ITEM_WIDTH_PLUS_GAP, 
                behavior: 'smooth' 
            });

        }, 4000); 

        // Clear the interval. Using 'as number' to fix the NodeJS.Timeout issue.
        return () => clearInterval(autoScroll as number);
    }, []);

    // Updated manual scroll amount to match item step size
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 424; 
            
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };
    
    // TRAINING GROUPS DATA STRUCTURE
    const trainingGroups = [
        { 
            title: "Waste Recycling", 
            icon: <Recycle className="w-8 h-8" />, 
            items: ["Plastic", "Paper", "Wood", "Metal & Scraps", "Glass Recycling"] 
        },
        { 
            title: "Upscaling & Upcycling", 
            icon: <Hammer className="w-8 h-8" />, 
            items: ["Textiles & Craft"] 
        },
        { 
            title: "Energy & Community Renewable Solution", 
            icon: <Zap className="w-8 h-8" />, 
            items: ["Solar Energy", "Biodegradable Energy", "Wind Turbines", "Waste to Fertilizers & Feed", "Solar Stoves", "Electric Vehicles & Tricycles"] 
        },
        { 
            title: "Ecopreneurship", 
            icon: <BarChart3 className="w-8 h-8" />, 
            items: ["Capacity Building", "Financial Literacy", "Waste Exportation", "Eco Literacy", "Product Trading", "Reuse & Repair"] 
        },
        { 
            title: "Bio Mass", 
            icon: <Leaf className="w-8 h-8" />, 
            items: ["Afforestation & Reforestation"] 
        },
        { 
            title: "Electronic Waste", 
            icon: <Cpu className="w-8 h-8" />, 
            items: ["Recycling of Electronics (TV, Phones, etc)", "Repair & Reuse"] 
        },
    ];

    const leaders = [
        { name: "BOLA AHMED TINUBU GCFR", role: "President Commander-in-Chief Of The Armed Forces Federal Republic Of Nigeria", quote: "Through a Youth-powered circular economy, we are building a prosperous Nigeria for all." },
        { name: "COMR. AYODELE OLAWANDE", role: "Minister Of Youth Development", quote: "Circular Economy Youth Empowerment Initiative: A Driving Force to Support, Empower, Protect Nigeria's Future Leaders." },
        { name: "DR.MARYAM ISMAILA KESHINRO", role: "Permanent Secretary", quote: "Every recycled item is a naira earned and a step towards wealth creation." }
    ];

    const carouselImages = [1, 2, 3, 4, 5, 6, 7, 1, 2, 3];

    return (
        <div className="flex flex-col font-sans">
            
            {/* HERO SECTION */}
            <section className="relative min-h-[600px]  -mt-20 md:h-screen flex flex-col justify-start pt-32 md:justify-center items-center text-center px-4 overflow-hidden group">
                <div className="absolute inset-0 z-0">
                    <img 
                        src={getHeroBg()} 
                        alt="Circular Economy Background" 
                        fetchPriority="high"
                        className="w-full h-full object-cover object-center scale-105 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/70 to-brand-dark/90"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto animate-fade-in-down text-white">
                    <h4 className="text-xs md:text-sm font-bold tracking-[0.3em] mb-6 text-green-200 uppercase drop-shadow-md opacity-90">
                        Federal Ministry of Youth Development
                    </h4>
                    
                   <h1 className="text-3xl md:text-6xl font-extrabold mb-8 leading-tight drop-shadow-xl text-white">
                        Circular Economy <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#32CD32] to-[#00FFFF]">
                            Youth Empowerment
                        </span> <br/>
                        <span className="text-white">Initiative For </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#32CD32] to-[#00FFFF]">
                            Climate Change
                        </span>
                    </h1>
                    
                    <div className="h-1 w-32 bg-gradient-to-r from-[#FFD700] to-[#32CD32] mx-auto rounded-full mb-8 shadow-[0_0_20px_rgba(20,255,100,0.5)]"></div>

                    <p className="text-xl md:text-3xl font-medium text-white mb-6 max-w-4xl mx-auto italic animate-fade-in" style={{ animationDelay: '0.5s' }}>
                        "Waste to <span className="text-[#FFD700] font-bold drop-shadow-md">Wealth</span>, Waste to <span className="text-[#39FF14] font-bold drop-shadow-md">Energy</span>..."
                    </p>

                    <p className="text-lg md:text-xl font-semibold text-gray-100 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.8s' }}>
                        <span className="text-[#39FF14]">Creating jobs</span>, transforming waste into <span className="text-[#FFD700]">eco-friendly items</span> and valuable resources for a <span className="text-white border-b-2 border-[#00FFFF]">sustainable future</span>.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
                        <Link 
                            to="/register" 
                            className="mb-11 w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-brand-primary to-green-600 text-white border-0 hover:from-white hover:to-gray-100 hover:text-brand-primary px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-green-400/50 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            Register Now
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section id="about" className=" py-12 md:py-20 relative overflow-hidden bg-white">
                <div className="absolute inset-0 z-0">
                    <img 
                        src={getAboutBg()} 
                        alt="About BG" 
                        loading="lazy"
                        className="w-full h-full object-cover opacity-5" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-light/30 to-transparent"></div>
                </div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <Reveal animation="animate-fade-in-left">
                            <div className="space-y-6">
                                <div className="inline-block px-4 py-1 rounded-full bg-brand-light text-brand-dark font-bold text-sm border border-brand-primary/20">About The Initiative</div>
                                <h2 className="text-4xl md:text-5xl font-bold text-brand-dark leading-tight">
                                    Turning Waste Into <br/>
                                    <span className="text-brand-primary">Sustainable Value</span>
                                </h2>
                                <div className="text-gray-700 leading-relaxed text-lg space-y-4">
                                    <p>
                                        The <span className="text-brand-dark font-bold">Waste to Wealth</span> initiative is a groundbreaking project designed to create job opportunities for youths by transforming waste into valuable resources.
                                    </p>
                                    <p>
                                        Implemented by the <span className="font-bold text-brand-primary">Ministry of Youth Development</span> on the mandate of <span className="font-bold text-brand-dark">President Bola Ahmed Tinubu</span>, this initiative empowers young Nigerians to become job creators, develop waste-to-wealth businesses, contributing to achieving the <span className="font-bold text-brand-primary">Sustainable Development Goals (SDGs)</span>, mitigating climate change effect, reducing environmental pollution and fostering economic growth.
                                    </p>
                                </div>
                                <Link 
                                    to="/register" 
                                    className="inline-flex items-center gap-2 text-brand-primary font-bold hover:gap-4 transition-all text-lg mt-4"
                                >
                                    Join the movement <ArrowRight size={20} />
                                </Link>
                            </div>
                        </Reveal>
                        
                        <Reveal animation="animate-fade-in-right" delay="0.2s">
                            {/* SLIDING IMAGE CAROUSEL */}
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-brand-primary/20 group aspect-[4/3] md:aspect-auto md:h-[500px]">
                                <div 
                                    className="flex transition-transform duration-1000 ease-in-out h-full"
                                    style={{ transform: `translateX(-${currentAboutSlide * 100}%)` }}
                                >
                                    {aboutSlides.map((slide, idx) => (
                                        <div key={idx} className="min-w-full h-full relative">
                                            <img 
                                                src={slide.image} 
                                                alt={slide.alt} 
                                                loading="lazy" 
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-brand-dark/90 to-transparent"></div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Slide Indicators */}
                                <div className="absolute bottom-28 right-6 flex gap-2 z-10">
                                    {aboutSlides.map((_, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`h-2 rounded-full transition-all duration-300 ${currentAboutSlide === idx ? 'w-8 bg-brand-primary' : 'w-2 bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* LIVE STATISTICS */}
            <section className="py-16 bg-brand-dark text-white relative overflow-hidden border-t-4 border-brand-primary">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        {/* Summary Cards */}
                        <div className="w-full md:w-1/3 space-y-6">
                            <Reveal animation="animate-fade-in-left">
                                <div>
                                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                        <BarChart3 className="text-brand-light" /> 
                                        Live Impact Tracker
                                    </h2>
                                    <p className="text-green-100/80 mb-8">Data updates weekly.</p>
                                    
                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors mb-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="p-3 bg-brand-primary/20 rounded-lg text-brand-light">
                                                <Users size={24} />
                                            </div>
                                            <h3 className="text-lg font-medium text-green-100">Total Registered</h3>
                                        </div>
                                        <p className="text-5xl font-extrabold text-white tracking-tight">
                                            {renderStatValue(totalRegistrations)}
                                        </p>
                                    </div>

                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-300">
                                                <Map size={24} />
                                            </div>
                                            <h3 className="text-lg font-medium text-green-100">Active States including FCT</h3>
                                        </div>
                                        <p className="text-4xl font-bold text-white">
                                            {renderStatValue(stats.length)}
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </div>

                        {/* Chart Area */}
                        <div className="w-full md:w-2/3">
                            <Reveal animation="animate-fade-in-right" delay="0.2s">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 max-h-[500px] flex flex-col shadow-2xl">
                                    <h3 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">Registration by State</h3>
                                    
                                    {loadingStats ? (
                                        <div className="h-64 flex items-center justify-center text-brand-light animate-pulse">
                                            <Loader2 className="w-8 h-8 animate-spin mr-2" />
                                            Loading live data...
                                        </div>
                                    ) : stats.length === 0 ? (
                                        <div className="h-64 flex items-center justify-center text-green-200/50 italic">
                                            Start the movement! No registrations yet.
                                        </div>
                                    ) : (
                                        <div className="overflow-y-auto pr-4 custom-scrollbar flex-1 space-y-4">
                                            {stats.map((stat, idx) => (
                                                <div key={idx} className="group">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="font-medium text-green-100">{stat.state}</span>
                                                        <div className="text-right">
                                                            <span className="font-bold text-white mr-2">{stat.count.toLocaleString()}</span>
                                                            <span className="text-xs text-brand-light font-mono">{stat.percentage}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                                                        <div 
                                                            className="bg-brand-primary h-2.5 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125 origin-left"
                                                            style={{ width: `${Math.max(Number(stat.percentage), 1)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRAINING AREAS (Updated with FLIP Cards) */}
            <section className="py-12 md:py-20 relative bg-white overflow-hidden">
                {/* Pattern Background */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0C8829 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <div className="container mx-auto px-4 relative z-10">
                    <Reveal animation="animate-fade-in-down">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">Areas of Training</h2>
                            <div className="h-1 w-24 bg-brand-primary mx-auto rounded-full mb-6"></div>
                            <p className="text-gray-600 text-lg">
                                Specialized, hands-on training grouped into key sectors of the circular economy.
                            </p>
                        </div>
                    </Reveal>

                    {/* New Grid for Groups */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {trainingGroups.map((group, idx) => (
                            <TrainingFlipCard 
                                key={idx} 
                                group={group} 
                                delay={`${idx * 0.1}s`} 
                            />
                        ))}
                    </div>
                    
                    <Reveal animation="animate-fade-in" delay="0.5s">
                        <div className="mt-12 text-center">
                            <Link 
                                to="/register" 
                                className="inline-block bg-brand-primary text-white px-10 py-4 rounded-full font-bold text-lg border-2 border-brand-primary hover:bg-white hover:text-brand-primary shadow-xl transition-all transform hover:-translate-y-1"
                            >
                                Register Today
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* GALLERY - CAROUSEL */}
            <section className="py-12 md:py-20 bg-gradient-to-b from-white to-brand-light/30 relative">
                <div className="container mx-auto px-4">
                     <Reveal animation="animate-fade-in-left">
                         <div className="flex justify-between items-end mb-8">
                            <div>
                                <span className="text-brand-primary font-bold tracking-wider uppercase text-sm">Gallery</span>
                                <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mt-2">Impact in Action</h2>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => scroll('left')} className="p-3 rounded-full bg-white shadow-md hover:bg-brand-primary hover:text-white text-brand-dark transition-all border border-gray-100">
                                    <ChevronLeft size={24} />
                                </button>
                                <button onClick={() => scroll('right')} className="p-3 rounded-full bg-white shadow-md hover:bg-brand-primary hover:text-white text-brand-dark transition-all border border-gray-100">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    {/* Carousel */}
                    <Reveal animation="animate-fade-in-right" delay="0.2s">
                        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
                            {carouselImages.map((num, idx) => (
                                <div key={idx} className="min-w-[300px] md:min-w-[400px] snap-start"> 
                                    <div className="relative rounded-2xl overflow-hidden shadow-lg group h-[250px] md:h-[300px] border-4 border-white hover:border-brand-light transition-colors">
                                        <img 
                                            src={getTeamActivityImage(num)} 
                                            alt={`Activity ${idx}`} 
                                            loading="lazy" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* LEADERS */}
            <section className="py-24 bg-brand-dark text-white relative">
                 <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                <div className="container mx-auto px-4 relative z-10">
                    <Reveal animation="animate-fade-in-up">
                        <h2 className="text-3xl font-bold text-center text-white mb-16">Visionary Leadership</h2>
                    </Reveal>
                    <div className="grid md:grid-cols-3 gap-8">
                        {leaders.map((leader, idx) => (
                            <Reveal key={idx} animation="animate-fade-in-up" delay={`${idx * 0.2}s`}>
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-green-500/30 hover:border-border-green-500/60 transition-all duration-300 group shadow-xl">
                                    <div className="w-full aspect-[3/4] relative overflow-hidden">
                                        <img 
                                            src={getLeaderImage(leader.name)} 
                                            alt={leader.name} 
                                            loading="lazy" 
                                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent opacity-80"></div>
                                    </div>
                                    <div className="p-6 relative -mt-20">
                                        <h3 className="text-xl font-extrabold text-white mb-1 drop-shadow-md uppercase">{leader.name}</h3>
                                        <p className="text-xs font-bold text-brand-primary uppercase tracking-wide mb-4">{leader.role}</p>
                                        <blockquote className="text-green-100 italic text-sm relative leading-relaxed border-l-2 border-brand-primary pl-3">
                                            "{leader.quote}"
                                        </blockquote>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

{/* PARTNERS */}
<section className="py-20 bg-white border-t border-gray-100">
    <div className="container mx-auto px-4 text-center">
        <Reveal animation="animate-fade-in">
            <div>
                <p className="text-gray-800 font-extrabold uppercase tracking-widest text-sm mb-4 border-b-2 border-brand-primary inline-block pb-2">
                    OUR PARTNERS
                </p>
                
                <p className="text-gray-600 max-w-3xl mx-auto mb-12">
                    We are on a mission to protect support, empower, and protect Nigerian youths while preserving and protecting the Ecosystem. We invite organizations that share our vision to join us in creating a brighter future for the next generation
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                    
                    {[1, 2, 3, 4, 5, 6].map((i) => {
                        const url = getPartnerUrl(i);
                        
                        const imageElement = (
                            <img 
                                src={getPartnerImage(i)} 
                                alt={`Partner ${i}`} 
                                loading="lazy" 
                                className="h-32 w-32 md:h-40 md:w-40 object-contain filter transition-all duration-300 group-hover:scale-105" 
                            />
                        );

                        const baseClass = "md:w-auto flex justify-center items-center p-4 group";

                        return url ? (
                            <a 
                                key={i} 
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={baseClass + " cursor-pointer hover:shadow-xl rounded-lg"} 
                            >
                                {imageElement}
                            </a>
                        ) : (
                            <div 
                                key={i} 
                                className={baseClass + " hover:shadow-lg rounded-lg"}
                            >
                                {imageElement}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Reveal>
    </div>
</section>
            <style>{`
                @keyframes slow-zoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s linear infinite alternate;
                }
                @keyframes width {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.4);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Home;