"use client";

import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';

// --- MOCK FLEET DATA ---
const initialFleet = [
  { id: '1', make: 'Toyota', model: 'Land Cruiser Prado', plate: 'KDC 123A', status: 'available', rate: 12000 },
  { id: '2', make: 'Mazda', model: 'CX-5', plate: 'KDG 456B', status: 'rented', rate: 8000, returnDate: 'Today, 4:00 PM', customerName: 'Jane Doe', customerPhone: '0700123456' },
  { id: '3', make: 'Toyota', model: 'Axio', plate: 'KCW 789C', status: 'rented', rate: 3500, returnDate: 'Apr 28, 10:00 AM', customerName: 'Brian K.', customerPhone: '0722000000' },
  { id: '4', make: 'Nissan', model: 'Demio', plate: 'KDE 321D', status: 'maintenance', rate: 2500, note: 'Oil Change due in 150 km' },
  { id: '5', make: 'Subaru', model: 'CX-3', plate: 'KDD 654E', status: 'available', rate: 4500 },
  { id: '6', make: 'Toyota', model: 'Harrier', plate: 'KDF 987F', status: 'available', rate: 6000 },
];

export default function BujatechAdmin() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'rentals' | 'customers' | 'reports'>('fleet');
  const [searchQuery, setSearchQuery] = useState('');
  const [fleet, setFleet] = useState(initialFleet);

  // --- SMART BOOKING WIZARD STATES ---
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    carId: '',
    customerName: '',
    phone: '',
    emergencyPhone: '',
    idNumber: '',
    destination: '',
    purpose: 'Personal / Leisure',
    pickupDate: '',
    returnDate: '',
    idImage: null as File | null,
    dlImage: null as File | null,
  });

  // --- LIVE MATH: 24-HOUR BILLING CYCLE CALCULATOR ---
  const availableCars = fleet.filter(c => c.status === 'available');
  const selectedCarDetails = availableCars.find(c => c.id === bookingData.carId);
  
  let billedDays = 0;
  let totalCost = 0;
  
  if (bookingData.pickupDate && bookingData.returnDate && selectedCarDetails) {
    const pickupTime = new Date(bookingData.pickupDate).getTime();
    const returnTime = new Date(bookingData.returnDate).getTime();
    
    if (returnTime > pickupTime) {
      // Calculate difference in hours
      const diffInHours = (returnTime - pickupTime) / (1000 * 60 * 60);
      // Divide by 24 and round UP to the nearest whole day
      billedDays = Math.ceil(diffInHours / 24);
      totalCost = billedDays * selectedCarDetails.rate;
    }
  }

  // --- FILTER LOGIC ---
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

  // --- ACTIONS ---
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.idImage || !bookingData.dlImage) {
      toast.error("Missing Documents", { description: "Please upload both the ID and Driver's License."});
      return;
    }

    if (billedDays <= 0) {
      toast.error("Invalid Dates", { description: "Return date must be after the pickup date."});
      return;
    }

    toast.loading("Generating secure digital contract...");

    setTimeout(() => {
      setFleet(prevFleet => 
        prevFleet.map(car => 
          car.id === bookingData.carId 
            ? { ...car, status: 'rented', returnDate: bookingData.returnDate, customerName: bookingData.customerName, customerPhone: bookingData.phone } 
            : car
        )
      );

      toast.dismiss();
      toast.success("Contract Active!", { description: `${bookingData.customerName} has leased the vehicle for ${billedDays} days.` });
      
      setIsBookingOpen(false);
      setBookingData({ carId: '', customerName: '', phone: '', emergencyPhone: '', idNumber: '', destination: '', purpose: 'Personal / Leisure', pickupDate: '', returnDate: '', idImage: null, dlImage: null });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 lg:pb-0 flex">
      <Toaster position="top-center" richColors />
      
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
        
        {/* MOBILE HEADER */}
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
              
              {/* --- SEARCH BAR --- */}
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

              {/* THE FLEET GRID */}
              {filteredFleet.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                     <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">No Matches Found</h2>
                  <p className="text-slate-500 max-w-md">We couldn't find any cars or customers matching "{searchQuery}".</p>
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

                        <div className="p-6 pb-4 flex-1">
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
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{car.customerName}</span>
                                  <span className="text-sm font-black text-slate-800">{car.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  <span className="text-sm font-bold truncate">Due: {car.returnDate}</span>
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
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-bold"
                >
                  <option value="" disabled>-- Choose a car --</option>
                  {availableCars.map(car => (
                    <option key={car.id} value={car.id}>{car.make} {car.model} ({car.plate})</option>
                  ))}
                </select>
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

                {/* --- SMART RECEIPT PREVIEW --- */}
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

              {/* Step 3: Client Identity & Emergency Contact */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">3. Identity & Contact</label>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Full Name</label>
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

                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 ml-1">🚨 Emergency Contact (Required)</label>
                  <input type="tel" required value={bookingData.emergencyPhone} onChange={e => setBookingData({...bookingData, emergencyPhone: e.target.value})} placeholder="Relative or Spouse Number" className="w-full p-4 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 font-bold placeholder:text-red-300" />
                </div>
              </div>

              {/* Step 4: Document Uploads */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-20">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">4. Secure Documents</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* ID Upload */}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setBookingData({...bookingData, idImage: e.target.files[0]})
                    }} />
                    {bookingData.idImage ? (
                      <div className="h-24 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">ID Attached</span>
                      </div>
                    ) : (
                      <div className="h-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">National ID<br/>(Front)</span>
                      </div>
                    )}
                  </label>

                  {/* DL Upload */}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                       if(e.target.files && e.target.files[0]) setBookingData({...bookingData, dlImage: e.target.files[0]})
                    }} />
                    {bookingData.dlImage ? (
                      <div className="h-24 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center text-emerald-600 transition animate-in zoom-in">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">DL Attached</span>
                      </div>
                    ) : (
                      <div className="h-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">Driver's<br/>License</span>
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
                disabled={!bookingData.carId || !bookingData.customerName || !bookingData.emergencyPhone || billedDays <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none"
              >
                {billedDays > 0 ? `Confirm (KSh ${totalCost.toLocaleString()})` : 'Select Dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('fleet')} className={`flex flex-col items-center p-2 transition w-1/4 ${activeTab === 'fleet' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
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