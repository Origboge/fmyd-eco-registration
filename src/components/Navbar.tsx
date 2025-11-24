
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Info, FileText } from 'lucide-react';
import { getLogo } from '../constants';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    // Helper to scroll to section if on home page, or navigate and scroll if on other pages
    const handleHashScroll = (id: string) => {
        closeMenu();
        if (location.pathname === '/') {
            const element = document.getElementById(id);
            if (element) element.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/', { state: { targetId: id } });
        }
    };

    const navLinks = [
        { name: 'Home', path: '/', icon: <Home size={18} />, type: 'link' },
        { name: 'About Us', path: '/#about', icon: <Info size={18} />, type: 'hash', target: 'about' },
        { name: 'Register Now', path: '/register', icon: <FileText size={18} />, type: 'link' }
    ];

    // Determine if we should show the "Solid White" navbar style
    // Show if scrolled, menu open, OR if we are NOT on the home page (e.g. Register page)
    const showSolidNav = isScrolled || isOpen || location.pathname !== '/';

    // Dynamic styles for the navbar container
    const navbarClasses = `fixed top-0 w-full z-50 transition-all duration-300 ${
        showSolidNav 
        ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' 
        : 'bg-transparent py-4'
    }`;

    // Dynamic styles for text based on scroll/open state
    const textClasses = showSolidNav ? 'text-brand-dark' : 'text-white';

    return (
        <nav className={navbarClasses}>
            <div className="container mx-auto px-4 md:px-6 relative">
                <div className="flex justify-between items-center">
                    {/* Logo Only */}
                    <Link to="/" className="flex items-center gap-2" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                        <img src={getLogo()} alt="FMYD Circular Eco Logo" className="h-20 w-auto md:h-24 object-contain" />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            link.type === 'hash' ? (
                                <button 
                                    key={link.name}
                                    onClick={() => handleHashScroll(link.target!)}
                                    className={`flex items-center gap-2 font-semibold transition-colors hover:text-brand-primary ${textClasses} bg-transparent border-none cursor-pointer`}
                                >
                                    {link.icon}
                                    {link.name}
                                </button>
                            ) : (
                                <Link 
                                    key={link.name}
                                    to={link.path} 
                                    className={`flex items-center gap-2 font-bold transition-all duration-300 px-6 py-2.5 rounded-full border-2 ${
                                        link.path === '/register' 
                                        ? 'bg-brand-primary border-brand-primary text-white hover:bg-white hover:text-brand-primary shadow-md' 
                                        : `${textClasses} hover:text-brand-primary`
                                    }`}
                                >
                                    {link.icon}
                                    {link.name}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <button className={`md:hidden p-2 rounded-lg transition-colors ${textClasses}`} onClick={toggleMenu}>
                        {isOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Nav - Compact & Floating Right */}
                {isOpen && (
                    <div className="md:hidden absolute top-full right-0 mt-2 w-64 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl py-4 px-3 flex flex-col gap-2 animate-fade-in-down origin-top-right">
                         {navLinks.map((link) => (
                            link.type === 'hash' ? (
                                <button 
                                    key={link.name}
                                    onClick={() => handleHashScroll(link.target!)}
                                    className="flex items-center w-full gap-3 p-3 rounded-xl hover:bg-brand-light/50 text-brand-dark font-bold text-sm transition-colors text-left"
                                >
                                    <span className="text-brand-primary">{link.icon}</span>
                                    {link.name}
                                </button>
                            ) : (
                                <Link 
                                    key={link.name}
                                    to={link.path}
                                    onClick={closeMenu}
                                    className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm border transition-colors ${
                                        link.path === '/register' 
                                        ? 'bg-brand-primary text-white justify-center hover:bg-brand-dark shadow-md' 
                                        : 'text-brand-dark border-transparent hover:bg-brand-light/50'
                                    }`}
                                >
                                    {link.path !== '/register' && <span className="text-brand-primary">{link.icon}</span>}
                                    {link.name}
                                </Link>
                            )
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
