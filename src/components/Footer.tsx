
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Mail, Phone, Facebook, Twitter, Instagram } from 'lucide-react';
import { getLogo } from '../constants';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const navigate = useNavigate();
    const location = useLocation();

    const handleAboutClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (location.pathname === '/') {
            document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/', { state: { targetId: 'about' } });
        }
    };

    return (
        <footer className="bg-brand-dark text-white pt-16 pb-8 border-t border-green-800">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
                    
                    {/* Logo & Brand */}
                    <div className="flex flex-col items-center md:items-start max-w-xs">
                        <div className="bg-white p-3 rounded-xl mb-4 shadow-lg">
                             <img src={getLogo()} alt="Logo" className="h-16 w-auto" />
                        </div>
                        <p className="text-sm text-green-100/80 font-medium leading-relaxed">
                            Empowering Nigerian Youth through Circular Economy. Turning waste into wealth for a sustainable future.
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-col gap-4 text-sm">
                        <h3 className="text-lg font-bold mb-2 text-white border-b-2 border-green-600 pb-1 inline-block md:block">Contact Us</h3>
                        <p className="flex items-start justify-center md:justify-start gap-2 text-green-100">
                            <MapPin size={18} className="shrink-0 text-green-400 mt-1" />
                            <span className="text-left md:text-left">2nd floor, Block D Federal Secretariat Complex, Bullet Building, Garki, Abuja.</span>
                        </p>
                        <p className="flex items-center justify-center md:justify-start gap-2 text-green-100">
                            <Mail size={18} className="shrink-0 text-green-400" />
                            <a href="mailto:info@youthdev.gov.ng" className="hover:text-white hover:underline transition-colors">info@youthdev.gov.ng</a>
                        </p>
                        <div className="flex flex-col gap-1">
                            <p className="flex items-center justify-center md:justify-start gap-2 text-green-100">
                                <Phone size={18} className="shrink-0 text-green-400" />
                                <a href="tel:+2349160108171" className="hover:text-white hover:underline transition-colors">+234 916 010 8171</a>
                            </p>
                            <p className="flex items-center justify-center md:justify-start gap-2 text-green-100">
                                <Phone size={18} className="shrink-0 text-green-400" />
                                <a href="tel:+2348038298666" className="hover:text-white hover:underline transition-colors">+234 803 829 8666</a>
                            </p>
                        </div>
                    </div>

                    {/* Quick Links & Socials */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold mb-2 text-white border-b-2 border-green-600 pb-1 inline-block md:block">Quick Links</h3>
                        <div className="flex flex-col gap-2 text-green-100">
                            <button onClick={handleAboutClick} className="hover:text-white hover:translate-x-1 transition-all bg-transparent border-none cursor-pointer">About Us</button>
                            <Link to="/register" className="hover:text-white hover:translate-x-1 transition-all">Register</Link>
                        </div>
                        
                        <div className="flex gap-4 mt-4 justify-center md:justify-start">
                            <a href="#" className="bg-white/10 p-2 rounded-full hover:bg-green-600 hover:text-white transition-colors text-green-100"><Facebook size={20} /></a>
                            <a href="https://x.com/fmydng?s=21&t=rqnN4NOLifHw5p_qEVlcKw" className="bg-white/10 p-2 rounded-full hover:bg-green-600 hover:text-white transition-colors text-green-100"><Twitter size={20} /></a>
                            <a href="https://www.instagram.com/fmyd_official?igsh=MWV3czI0NGtxOHNmYQ==" className="bg-white/10 p-2 rounded-full hover:bg-green-600 hover:text-white transition-colors text-green-100"><Instagram size={20} /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-green-800 mt-12 pt-8 text-center text-sm text-green-400/60">
                 <p>&copy; {currentYear} FMYD Circular Eco. All Rights Reserved.</p>
                    <p>Designed & Built by  <a 
        href="https://origboge.vercel.app/" // <-- REPLACE THIS with your actual portfolio URL
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white  hover:text-brand-primary transition-colors ml-1" // <-- Added Tailwind classes for styling and hover effect
>
        Origboge
    </a>
    .
</p>
                   
                </div>
            </div>
        </footer>
    );
};

export default Footer;
