"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { supabase } from '../lib/supabase'; // --- BRAND NEW: The Supabase Bridge! ---

// --- THE TYPESCRIPT BLUEPRINTS ---
interface Car {
  id: string;
  make: string;
  model: string;
  plate: string;
  status: string;
  rate: number;
  returnDate?: string;     
  customerName?: string;
  customerPhone?: string;
  note?: string;
  mileage?: number;             
  nextServiceMileage?: number;  
}

interface Customer {
  id: string; 
  name: string; 
  phone: string; 
  idNumber: string;
  altName: string; 
  altPhone: string; 
  altId: string; 
  altRelationship: string;
}

// --- MOCK RECURRING CUSTOMERS (We will move this to the DB later) ---
const returningCustomers: Customer[] = [
  { id: 'c1', name: 'Jane Doe', phone: '0700123456', idNumber: '30123456', altName: 'John Doe', altPhone: '0711123456', altId: '28123456', altRelationship: 'Spouse' },
  { id: 'c2', name: 'Brian K.', phone: '0722000000', idNumber: '31555666', altName: 'Sarah K.', altPhone: '0733000000', altId: '29555666', altRelationship: 'Sibling' },
];

// --- CUSTOM TOUCH SIGNATURE PAD COMPONENT ---
const SignaturePad = ({ onSign }: { onSign: (data: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
      setIsDrawing(true);
    }
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onSign(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      onSign('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        />
        <div className="absolute bottom-2 left-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Sign Here X</div>
      </div>
      <button type="button" onClick={clear} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-700 transition">Clear Signature</button>
    </div>
  );
};

export default function BujatechAdmin() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'rentals' | 'customers' | 'reports'>('fleet');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- UPDATED: Start with empty state and loading flag ---
  const [fleet, setFleet] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewCarDetails, setViewCarDetails] = useState<Car | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // --- LIVE CLOUD FETCHING LOGIC ---
  useEffect(() => {
    setIsMounted(true);
    
    const fetchFleet = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .order('make', { ascending: true }); // Sorts Toyotas together!

      if (error) {
        console.error("Error fetching fleet:", error);
        toast.error("Failed to connect to cloud database");
      } else if (data) {
        // Map the snake_case database columns to our camelCase app format
        const formattedData: Car[] = data.map(car => ({
          id: car.id,
          make: car.make,
          model: car.model,
          plate: car.plate,
          status: car.status,
          rate: Number(car.rate),
          mileage: Number(car.mileage),
          nextServiceMileage: Number(car.next_service_mileage),
          note: car.note,
        }));
        setFleet(formattedData);
      }
      setIsLoading(false);
    };

    fetchFleet();
  }, []);

  // --- SMART BOOKING WIZARD STATES ---
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    carId: '',
    customerName: '',
    phone: '',
    idNumber: '',
    destination: '',
    purpose: 'Personal / Leisure',
    pickupDate: '',
    returnDate: '',
    amountPaid: '',
    paymentMethod: 'M-Pesa (Direct)', 
    idFront: null as File | null,
    idBack: null as File | null,
    dlFront: null as File | null,
    dlBack: null as File | null,
    altName: '',
    altPhone: '',
    altId: '',
    altRelationship: '',
    signature: '' 
  });

  // --- LIVE MATH & BALANCE CALCULATOR ---
  const availableCars = fleet.filter(c => c.status === 'available');
  const selectedCarDetails = availableCars.find(c => c.id === bookingData.carId);
  
  let billedDays = 0;
  let totalCost = 0;
  let balanceDue = 0;
  
  if (bookingData.pickupDate && bookingData.returnDate && selectedCarDetails) {
    const pickupTime = new Date(bookingData.pickupDate).getTime();
    const returnTime = new Date(bookingData.returnDate).getTime();
    
    if (returnTime > pickupTime) {
      const diffInHours = (returnTime - pickupTime) / (1000 * 60 * 60);
      billedDays = Math.ceil(diffInHours / 24);
      totalCost = billedDays * selectedCarDetails.rate;
      balanceDue = totalCost - (Number(bookingData.amountPaid) || 0);
    }
  }

  const filteredFleet = fleet.filter(car => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      car.make.toLowerCase().includes(query) ||
      car.model.toLowerCase().includes(query) ||
      car.plate.toLowerCase().includes(query) ||
      (car.customerName && car.customerName.toLowerCase().includes(query)) ||
      (car.customerPhone && car.customerPhone.includes(query))
    );
  });

  const handleReturningCustomer = (customerId: string) => {
    const customer = returningCustomers.find(c => c.id === customerId);
    if (customer) {
      setBookingData(prev => ({
        ...prev, 
        customerName: customer.name, 
        phone: customer.phone, 
        idNumber: customer.idNumber,
        altName: customer.altName, 
        altPhone: customer.altPhone, 
        altId: customer.altId, 
        altRelationship: customer.altRelationship
      }));
      toast.success("Customer Profile Loaded!");
    }
  };

  const generateContractPDF = async () => {
    const element = document.getElementById('receipt-pdf-template');
    if (!element) throw new Error("Template not found");
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bujatech_Contract_${bookingData.customerName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.idFront || !bookingData.idBack || !bookingData.dlFront || !bookingData.dlBack) {
      toast.error("Missing Documents", { description: "Please upload the Front and Back of BOTH the ID and Driver's License."});
      return;
    }

    if (!bookingData.signature) { 
      toast.error("Signature Required", { description: "Client must sign the contract." }); 
      return; 
    }

    if (billedDays <= 0) {
      toast.error("Invalid Dates", { description: "Return date must be after the pickup date."});
      return;
    }

    toast.loading("Generating secure digital contract & PDF...");

    try {
      // Temporarily updates local state for UI effect (We will wire Supabase Insert here next)
      setFleet(prevFleet => 
        prevFleet.map(car => 
          car.id === bookingData.carId 
            ? { ...car, status: 'rented', returnDate: bookingData.returnDate, customerName: bookingData.customerName, customerPhone: bookingData.phone } 
            : car
        )
      );

      await generateContractPDF();

      toast.dismiss();
      toast.success("Contract Active & Downloaded!", { description: `${bookingData.customerName} has leased the vehicle for ${billedDays} days.` });
      
      setIsBookingOpen(false);
      setBookingData({ 
        carId: '', customerName: '', phone: '', idNumber: '', destination: '', purpose: 'Personal / Leisure', 
        pickupDate: '', returnDate: '', amountPaid: '', paymentMethod: 'M-Pesa (Direct)',
        idFront: null, idBack: null, dlFront: null, dlBack: null,
        altName: '', altPhone: '', altId: '', altRelationship: '', signature: '' 
      });
      
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate PDF", { description: "Please try again or check browser permissions." });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 lg:pb-0 flex overflow-x-hidden">
      <Toaster position="top-center" richColors />
      
      {/* --- THE OFF-SCREEN PDF RECEIPT TEMPLATE --- */}
      <div id="receipt-pdf-template" className="absolute top-[-9999px] left-[-9999px] bg-white p-10 w-[800px] text-slate-900 border-2 border-slate-900">
        <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Bujatech</h1>
            <p className="text-sm font-bold tracking-widest text-slate-500 uppercase mt-1">Car Hire & Fleet Management</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-blue-600 uppercase">Lease Agreement</h2>
            <p className="font-bold text-slate-500">Date: {isMounted ? new Date().toLocaleDateString() : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-400 mb-4 border-b pb-2">Client Details</h3>
            <p className="font-bold text-lg">{bookingData.customerName}</p>
            <p className="font-semibold text-slate-600">ID: {bookingData.idNumber}</p>
            <p className="font-semibold text-slate-600">Phone: {bookingData.phone}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-400 mb-4 border-b pb-2">Vehicle Details</h3>
            <p className="font-bold text-lg">{selectedCarDetails?.make} {selectedCarDetails?.model}</p>
            <p className="font-semibold text-slate-600">Plate: <span className="bg-slate-200 px-2 py-0.5 rounded">{selectedCarDetails?.plate}</span></p>
            <p className="font-semibold text-slate-600">Daily Rate: KSh {selectedCarDetails?.rate?.toLocaleString()}</p>
          </div>
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-left uppercase text-xs tracking-widest">
              <th className="p-4">Description</th>
              <th className="p-4 text-center">Days</th>
              <th className="p-4 text-right">Amount (KSh)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 text-lg font-bold">
              <td className="p-4">
                Vehicle Hire ({bookingData.pickupDate ? new Date(bookingData.pickupDate).toLocaleDateString() : ''} to {bookingData.returnDate ? new Date(bookingData.returnDate).toLocaleDateString() : ''})<br/>
                <span className="text-sm text-slate-500 font-medium">Destination: {bookingData.destination} | Purpose: {bookingData.purpose}</span>
              </td>
              <td className="p-4 text-center">{billedDays}</td>
              <td className="p-4 text-right">{totalCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Subtotal:</span>
              <span>KSh {totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold border-b border-slate-300 pb-3">
              <span>Amount Paid ({bookingData.paymentMethod}):</span>
              <span className="text-emerald-600">- KSh {(Number(bookingData.amountPaid) || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end bg-slate-100 p-4 rounded-xl border border-slate-300">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Balance Due</span>
              <span className="text-2xl font-black text-red-600">KSh {balanceDue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Client Signature</p>
            {bookingData.signature && <img src={bookingData.signature} alt="Client Signature" className="h-16 mb-2" />}
            <div className="border-t border-slate-400 w-full pt-2">
              <p className="font-bold">{bookingData.customerName}</p>
              <p className="text-xs text-slate-500">I agree to the terms and conditions of Bujatech Car Hire. I am fully liable for the vehicle during the lease period.</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Guarantor / Alt Contact</p>
            <div className="mt-[72px] border-t border-slate-400 w-full pt-2">
              <p className="font-bold">{bookingData.altName} ({bookingData.altRelationship})</p>
              <p className="text-xs text-slate-500">ID: {bookingData.altId} | Phone: {bookingData.altPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col h-screen fixed shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-tight text-white">Bujatech</h1>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Fleet Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('fleet')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition ${activeTab === 'fleet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            Fleet Grid
          </button>
          <button onClick={() => setActiveTab('rentals')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition ${activeTab === 'rentals' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Active Leases
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            Customers
          </button>
        </nav>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 lg:ml-64 relative min-h-screen">
        <header className="bg-slate-900 text-white p-5 sticky top-0 z-30 shadow-md lg:hidden flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight">Bujatech</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Fleet Admin</p>
          </div>
          <button onClick={() => setIsBookingOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </button>
        </header>

        <div className="p-4 sm:p-8">
          <div className="hidden lg:flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Fleet Overview</h2>
              <p className="text-slate-500 font-medium mt-1">Manage vehicles, track leases, and monitor maintenance.</p>
            </div>
            <button onClick={() => setIsBookingOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              New Booking
            </button>
          </div>

          {activeTab === 'fleet' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by model, plate, or customer phone (e.g. 0700)..." 
                  className="w-full pl-14 pr-12 py-5 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-lg font-bold text-slate-900 transition shadow-sm placeholder:font-medium placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>

              {/* --- CLOUD LOADING SPINNER OR GRID --- */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing with Cloud...</p>
                </div>
              ) : filteredFleet.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                     <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">No Matches Found</h2>
                  <p className="text-slate-500 max-w-md">We couldn't find any cars matching "{searchQuery}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                  {filteredFleet.map(car => {
                    const isAvailable = car.status === 'available';
                    const isRented = car.status === 'rented';
                    const isMaintenance = car.status === 'maintenance';

                    return (
                      <div key={car.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                        
                        <div className={`h-1.5 w-full absolute top-0 left-0 ${
                          isAvailable ? 'bg-emerald-500' : isRented ? 'bg-blue-600' : 'bg-red-500'
                        }`}></div>

                        {/* --- CLICKABLE CARD BODY --- */}
                        <div className="p-6 pb-4 flex-1 cursor-pointer hover:bg-slate-50 transition" onClick={() => setViewCarDetails(car)}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-black text-lg text-slate-900 leading-tight">{car.make} {car.model}</h3>
                              <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-md">
                                <p className="text-sm font-bold text-slate-700 tracking-wider">{car.plate}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              isAvailable ? 'bg-emerald-100 text-emerald-800' : 
                              isRented ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {car.status}
                            </span>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100">
                            {isAvailable && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rate</span>
                                <span className="font-black text-slate-800">KSh {car.rate.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/day</span></span>
                              </div>
                            )}
                            
                            {isRented && (
                              <div className="space-y-3">
                                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{car.customerName || 'Client'}</span>
                                  <span className="text-sm font-black text-slate-800">{car.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  <span className="text-sm font-bold truncate">Due: {car.returnDate || 'Pending'}</span>
                                </div>
                              </div>
                            )}

                            {isMaintenance && (
                              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
                                <span className="text-sm font-bold truncate">{car.note}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                          {isAvailable ? (
                            <button onClick={() => { setBookingData({...bookingData, carId: car.id}); setIsBookingOpen(true); }} className="flex-1 bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm transition">Book Car</button>
                          ) : isRented ? (
                            <>
                              <button className="flex-1 bg-white border border-slate-200 hover:border-slate-400 text-slate-800 py-3 rounded-xl font-bold text-sm transition">View Lease</button>
                              <a href={`tel:${car.customerPhone}`} className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex justify-center items-center shadow-md">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                              </a>
                            </>
                          ) : (
                            <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 py-3 rounded-xl font-bold text-sm transition">Update Status</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- NEW: VEHICLE TELEMETRY SIDE PANEL --- */}
      {viewCarDetails && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setViewCarDetails(null)}></div>
          
          <div className="relative w-full max-w-md bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{viewCarDetails.make} {viewCarDetails.model}</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{viewCarDetails.plate}</p>
              </div>
              <button onClick={() => setViewCarDetails(null)} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status & Rate */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${viewCarDetails.status === 'available' ? 'bg-emerald-100 text-emerald-800' : viewCarDetails.status === 'rented' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{viewCarDetails.status}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Base Rate</p>
                  <p className="font-black text-slate-900 text-lg">KSh {viewCarDetails.rate.toLocaleString()}</p>
                </div>
              </div>

              {/* Telemetry */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Vehicle Telemetry
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-slate-600">Current Odometer</span>
                      <span className="font-black text-slate-900">{viewCarDetails.mileage?.toLocaleString() || 0} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-600">Next Service Due</span>
                      <span className="font-black text-red-500">{viewCarDetails.nextServiceMileage?.toLocaleString() || 0} km</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${((viewCarDetails.mileage || 0) / (viewCarDetails.nextServiceMileage || 1)) > 0.9 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(((viewCarDetails.mileage || 0) / (viewCarDetails.nextServiceMileage || 1)) * 100, 100)}%` }}></div>
                  </div>
                  
                  {((viewCarDetails.mileage || 0) / (viewCarDetails.nextServiceMileage || 1)) > 0.9 && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-right">⚠️ Service Approaching</p>
                  )}
                </div>
              </div>

              {/* Rented Status Extra Info */}
              {viewCarDetails.status === 'rented' && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Active Lease Details</h3>
                  <p className="font-bold text-slate-800 text-lg">{viewCarDetails.customerName || 'Client'}</p>
                  <p className="text-sm font-semibold text-slate-500 mb-4">{viewCarDetails.customerPhone}</p>
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100 font-black text-sm text-center tracking-wide">
                     Expected Return:<br/> <span className="text-lg">{viewCarDetails.returnDate || 'Pending'}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200">
               {viewCarDetails.status === 'available' ? (
                 <button onClick={() => { setViewCarDetails(null); setBookingData({...bookingData, carId: viewCarDetails.id}); setIsBookingOpen(true); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg shadow-blue-600/30">Book this Vehicle</button>
               ) : (
                 <button onClick={() => setViewCarDetails(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-4 rounded-xl transition">Close Panel</button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- SMART BOOKING MODAL WIZARD --- */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsBookingOpen(false)}></div>
          
          <div className="relative w-full max-w-xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-right-full duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">New Digital Contract</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Smart Booking</p>
              </div>
              <button onClick={() => setIsBookingOpen(false)} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Step 1: Select Vehicle */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Select Vehicle</label>
                <select 
                  required
                  value={bookingData.carId}
                  onChange={(e) => setBookingData({...bookingData, carId: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-bold mb-4"
                >
                  <option value="" disabled>-- Choose a car --</option>
                  {availableCars.map(car => (
                    <option key={car.id} value={car.id}>{car.make} {car.model} ({car.plate})</option>
                  ))}
                </select>

                {selectedCarDetails && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95">
                     <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Confirmed Base Rate</span>
                     <span className="text-xl font-black text-emerald-700">KSh {selectedCarDetails.rate.toLocaleString()} <span className="text-sm">/ day</span></span>
                  </div>
                )}
              </div>

              {/* Step 2: Trip Logistics & Billing */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">2. Trip & Billing Schedule</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Destination</label>
                    <input type="text" required value={bookingData.destination} onChange={e => setBookingData({...bookingData, destination: e.target.value})} placeholder="e.g. Nairobi CBD" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Purpose</label>
                    <select required value={bookingData.purpose} onChange={e => setBookingData({...bookingData, purpose: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold">
                      <option value="Personal / Leisure">Personal / Leisure</option>
                      <option value="Business / Corporate">Business / Corporate</option>
                      <option value="Event / Wedding">Event / Wedding</option>
                      <option value="Upcountry Travel">Upcountry Travel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Pickup Date & Time</label>
                    <input type="datetime-local" required value={bookingData.pickupDate} onChange={e => setBookingData({...bookingData, pickupDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Return Date & Time</label>
                    <input type="datetime-local" required value={bookingData.returnDate} onChange={e => setBookingData({...bookingData, returnDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                  </div>
                </div>

                {selectedCarDetails && bookingData.pickupDate && bookingData.returnDate && billedDays > 0 ? (
                  <div className="mt-4 p-5 bg-slate-900 rounded-xl text-white shadow-inner animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Rate</span>
                      <span className="font-bold">KSh {selectedCarDetails.rate.toLocaleString()} / day</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billing Cycle</span>
                      <span className="font-bold">{billedDays}x 24-hr blocks</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-black text-blue-400 uppercase tracking-widest">Total Cost</span>
                      <span className="text-3xl font-black text-emerald-400">KSh {totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                ) : selectedCarDetails ? (
                  <div className="mt-4 p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-center text-sm font-bold text-slate-500">
                    Select Pickup and Return dates to calculate total.
                  </div>
                ) : null}
              </div>

              {/* Step 3: PAYMENT DETAILS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">3. Payment Details</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Amount Paid (Full / Partial)</label>
                     <input type="number" required value={bookingData.amountPaid} onChange={e => setBookingData({...bookingData, amountPaid: e.target.value})} placeholder="e.g. 5000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Payment Method</label>
                     <select required value={bookingData.paymentMethod} onChange={e => setBookingData({...bookingData, paymentMethod: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold">
                       <option value="M-Pesa (Direct)">M-Pesa (Direct)</option>
                       <option value="Cash">Cash</option>
                     </select>
                   </div>
                 </div>
              </div>

              {/* Step 4: Client Identity & Alternative Contact */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex justify-between items-end border-b border-slate-100 pb-2 mb-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">4. Identity & Contacts</label>
                  <select onChange={(e) => handleReturningCustomer(e.target.value)} className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 outline-none cursor-pointer">
                    <option value="">+ Load Recurring Client</option>
                    {returningCustomers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Primary Client Name</label>
                  <input type="text" required value={bookingData.customerName} onChange={e => setBookingData({...bookingData, customerName: e.target.value})} placeholder="John Doe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">ID Number</label>
                    <input type="text" required value={bookingData.idNumber} onChange={e => setBookingData({...bookingData, idNumber: e.target.value})} placeholder="e.g. 30123456" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
                    <input type="tel" required value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} placeholder="07XX XXX XXX" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Alternative Contact / Guarantor (Required)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                      <input type="text" required value={bookingData.altName} onChange={e => setBookingData({...bookingData, altName: e.target.value})} placeholder="Jane Doe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Relationship</label>
                      <select required value={bookingData.altRelationship} onChange={e => setBookingData({...bookingData, altRelationship: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold">
                        <option value="" disabled>Select Relationship</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Friend">Friend</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Alt. ID Number</label>
                      <input type="text" required value={bookingData.altId} onChange={e => setBookingData({...bookingData, altId: e.target.value})} placeholder="e.g. 28123456" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Alt. Phone Number</label>
                      <input type="tel" required value={bookingData.altPhone} onChange={e => setBookingData({...bookingData, altPhone: e.target.value})} placeholder="07XX XXX XXX" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: DIGITAL SIGNATURE */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">5. Legal Digital Signature</label>
                <p className="text-xs font-medium text-slate-500 mb-4 mt-2">I agree to the terms of the lease and accept liability for the vehicle during the selected period.</p>
                <SignaturePad onSign={(data) => setBookingData({...bookingData, signature: data})} />
                {bookingData.signature && (
                  <div className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> 
                    Signature Captured Securely
                  </div>
                )}
              </div>

              {/* Step 6: Document Uploads */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-20">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">6. Secure Documents (Front & Back)</label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setBookingData({...bookingData, idFront: e.target.files[0]})
                    }} />
                    {bookingData.idFront ? (
                      <div className="h-20 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">ID Front</span>
                      </div>
                    ) : (
                      <div className="h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-center">ID (Front)</span>
                      </div>
                    )}
                  </label>

                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setBookingData({...bookingData, idBack: e.target.files[0]})
                    }} />
                    {bookingData.idBack ? (
                      <div className="h-20 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">ID Back</span>
                      </div>
                    ) : (
                      <div className="h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-center">ID (Back)</span>
                      </div>
                    )}
                  </label>

                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                       if(e.target.files && e.target.files[0]) setBookingData({...bookingData, dlFront: e.target.files[0]})
                    }} />
                    {bookingData.dlFront ? (
                      <div className="h-20 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">DL Front</span>
                      </div>
                    ) : (
                      <div className="h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-center">DL (Front)</span>
                      </div>
                    )}
                  </label>

                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                       if(e.target.files && e.target.files[0]) setBookingData({...bookingData, dlBack: e.target.files[0]})
                    }} />
                    {bookingData.dlBack ? (
                      <div className="h-20 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">DL Back</span>
                      </div>
                    ) : (
                      <div className="h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-center">DL (Back)</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </form>

            <div className="p-4 sm:p-6 border-t border-slate-200 bg-white z-10 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button onClick={() => setIsBookingOpen(false)} className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl transition hover:bg-slate-200">Cancel</button>
              <button 
                onClick={handleSubmitBooking}
                disabled={
                  !bookingData.carId || !bookingData.customerName || !bookingData.altName || 
                  !bookingData.altId || !bookingData.altPhone || !bookingData.altRelationship || 
                  !bookingData.signature || !bookingData.idFront || !bookingData.idBack || 
                  !bookingData.dlFront || !bookingData.dlBack || !bookingData.amountPaid || billedDays <= 0
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
              >
                {billedDays > 0 && bookingData.signature ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Confirm & Download PDF
                  </>
                ) : 'Complete Form & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('fleet')} className={`flex flex-col items-center p-2 transition w-1/4 ${activeTab === 'fleet' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          <span className="text-[10px] font-black tracking-widest uppercase">Fleet</span>
        </button>
        <button onClick={() => setActiveTab('rentals')} className={`flex flex-col items-center p-2 transition w-1/4 ${activeTab === 'rentals' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span className="text-[10px] font-black tracking-widest uppercase">Leases</span>
        </button>
        <button onClick={() => setActiveTab('customers')} className={`flex flex-col items-center p-2 transition w-1/4 ${activeTab === 'customers' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <span className="text-[10px] font-black tracking-widest uppercase">Clients</span>
        </button>
      </nav>

    </div>
  );
}