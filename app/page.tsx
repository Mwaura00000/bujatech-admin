"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { supabase } from '../lib/supabase';
import { Car } from '../types';

// --- CUSTOM TOUCH SIGNATURE PAD ---
const SignaturePad = ({ onSign, signatureData }: { onSign: (data: string) => void, signatureData: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <div className="space-y-3">
      <div className="border-[1.5px] border-dashed border-slate-300 rounded-xl overflow-hidden relative bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        />
        {!signatureData && !isDrawing && (
          <div className="absolute bottom-3 left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">Sign Here X</div>
        )}
      </div>
      
      <div className="flex flex-col items-start gap-2">
        <button type="button" onClick={clear} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-700 transition">CLEAR SIGNATURE</button>
        {signatureData && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
            Signature Captured Securely
          </div>
        )}
      </div>
    </div>
  );
};

export default function BujatechAdmin() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'leases' | 'customers' | 'analytics' | 'notifications'>('fleet');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fleet, setFleet] = useState<Car[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customersList, setCustomersList] = useState<any[]>([]); 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Vehicle Dossier State
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [vehicleDossierTab, setVehicleDossierTab] = useState<'status' | 'leases' | 'maint'>('status');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [carMaintenanceLogs, setCarMaintenanceLogs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [carLeaseHistory, setCarLeaseHistory] = useState<any[]>([]);
  const [isUpdatingBaseRate, setIsUpdatingBaseRate] = useState(false);
  const [newBaseRate, setNewBaseRate] = useState('');
  
  const [extendingLeaseId, setExtendingLeaseId] = useState<string | null>(null);
  const [extendLeaseDate, setExtendLeaseDate] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [amendmentData, setAmendmentData] = useState<any>(null);
  
  // Maint Form
  const [newMaintLog, setNewMaintLog] = useState({ description: '', cost: '', mileage: '' });
  
  // Drawer & Form State
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [newCarData, setNewCarData] = useState({ make: '', model: '', plate: '', rate: '', mileage: '', nextServiceMileage: '' });

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [bookingData, setBookingData] = useState({
    isCloudClient: false,
    cloudIdFront: null as string | null,
    cloudIdBack: null as string | null,
    cloudDlFront: null as string | null,
    cloudDlBack: null as string | null,
    carId: '', destination: '', purpose: 'Personal / Leisure', pickupDate: '', returnDate: '', amountPaid: '', paymentMethod: 'M-Pesa (Direct)',
    customerName: '', phone: '', idNumber: '', altName: '', altPhone: '', altId: '', altRelationship: '', signature: '',
    idFront: null as File | null, idBack: null as File | null, dlFront: null as File | null, dlBack: null as File | null
  });

  // Fetch cars & customers
  const fetchCars = async () => {
    setIsLoading(true);
    const [carsRes, customersRes, leasesRes] = await Promise.all([
      supabase.from('cars').select(`*, leases(return_date, status, customers(full_name, phone))`).order('make'),
      supabase.from('customers').select('*, leases(*, cars(make, model, plate))').order('full_name'),
      supabase.from('leases').select('*, cars(make, model, plate, rate), customers(full_name, phone)').eq('status', 'active').order('pickup_date', { ascending: false })
    ]);

    if (!carsRes.error && carsRes.data) {
      const formattedCars: Car[] = carsRes.data.map(car => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeLease = car.leases?.find((l: any) => l.status === 'active');
        return {
          id: car.id, make: car.make, model: car.model, plate: car.plate, status: car.status, rate: Number(car.rate), note: car.note,
          customerName: activeLease?.customers?.full_name, returnDate: activeLease ? new Date(activeLease.return_date).toLocaleDateString() : undefined
        };
      });
      setFleet(formattedCars);
    }

    if (!customersRes.error && customersRes.data) {
      setCustomersList(customersRes.data);
    }
    if (!leasesRes.error && leasesRes.data) {
      setLeasesList(leasesRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => { setIsMounted(true); fetchCars(); }, []);

  // Auto-download amendment PDF when amendmentData is set
  useEffect(() => {
    if (!amendmentData) return;
    const timer = setTimeout(async () => {
      try {
        await generateAmendmentPDF();
      } catch (e) {
        console.error('Amendment PDF failed:', e);
      }
      setAmendmentData(null);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amendmentData]);

  const fetchCarDetails = async (carId: string) => {
    const [maintRes, leasesRes] = await Promise.all([
      supabase.from('maintenance_logs').select('*').eq('car_id', carId).order('service_date', { ascending: false }),
      supabase.from('leases').select('*, customers(full_name)').eq('car_id', carId).order('pickup_date', { ascending: false })
    ]);
    if (maintRes.data) setCarMaintenanceLogs(maintRes.data);
    if (leasesRes.data) setCarLeaseHistory(leasesRes.data);
  };

  // Filter Fleet
  const filteredFleet = fleet.filter(car => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return car.make.toLowerCase().includes(q) || car.model.toLowerCase().includes(q) || car.plate.toLowerCase().includes(q);
  });

  // Booking Calculations
  const availableCars = fleet.filter(c => c.status === 'available');
  const selectedCarDetails = availableCars.find(c => c.id === bookingData.carId);
  
  let billedDays = 0; let totalCost = 0; let balanceDue = 0;
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

  // Generate PDF
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

  const generateAmendmentPDF = async () => {
    const element = document.getElementById('amendment-pdf-template');
    if (!element) throw new Error("Amendment template not found");
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bujatech_Amendment_${amendmentData?.clientName?.replace(/\s+/g, '_') || 'Lease'}.pdf`);
  };

  // Load Cloud Client Logic
  const handleReturningCustomer = (customerId: string) => {
    const customer = customersList.find(c => c.id === customerId);
    if (customer) {
      setBookingData(prev => ({
        ...prev,
        isCloudClient: true,
        cloudIdFront: customer.id_front_url || null,
        cloudIdBack: customer.id_back_url || null,
        cloudDlFront: customer.dl_front_url || null,
        cloudDlBack: customer.dl_back_url || null,
        customerName: customer.full_name || '',
        phone: customer.phone || '',
        idNumber: customer.id_number || '',
        altName: customer.alt_name || '',
        altPhone: customer.alt_phone || '',
        altId: customer.alt_id || '',
        altRelationship: customer.alt_relationship || ''
      }));
      toast.success("Client Data & Documents Loaded");
    }
  };

  // Add Vehicle Logic
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarData.make || !newCarData.model || !newCarData.plate || !newCarData.rate) {
      toast.error("Please fill all required fields.");
      return;
    }

    toast.loading("Adding vehicle...", { id: 'add-car' });
    try {
      const { error } = await supabase.from('cars').insert({
        make: newCarData.make,
        model: newCarData.model,
        plate: newCarData.plate.toUpperCase(),
        status: 'available',
        rate: Number(newCarData.rate),
        mileage: Number(newCarData.mileage) || 0,
        next_service_mileage: Number(newCarData.nextServiceMileage) || 5000
      });
      
      if (error) throw error;
      
      toast.dismiss('add-car');
      toast.success("Vehicle Added!");
      setIsAddCarOpen(false);
      setNewCarData({ make: '', model: '', plate: '', rate: '', mileage: '', nextServiceMileage: '' });
      fetchCars();
    } catch (error) {
      toast.dismiss('add-car');
      toast.error("Failed to add vehicle");
    }
  };

  // Submit Logic
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.signature) { toast.error("Signature Required"); return; }
    if (billedDays <= 0) { toast.error("Invalid Dates"); return; }

    setIsSubmitting(true);
    toast.loading("Uploading documents & saving lease...", { id: 'save-booking' });

    try {
      const { data: customerData, error: customerError } = await supabase.from('customers').upsert({
        full_name: bookingData.customerName, phone: bookingData.phone, id_number: bookingData.idNumber,
        alt_name: bookingData.altName, alt_phone: bookingData.altPhone, alt_id: bookingData.altId, alt_relationship: bookingData.altRelationship
      }, { onConflict: 'id_number' }).select().single();
      
      if (customerError) throw customerError;

      const { error: leaseError } = await supabase.from('leases').insert({
        car_id: bookingData.carId, customer_id: customerData.id,
        pickup_date: new Date(bookingData.pickupDate).toISOString(), return_date: new Date(bookingData.returnDate).toISOString(),
        destination: bookingData.destination, purpose: bookingData.purpose, total_cost: totalCost, 
        amount_paid: Number(bookingData.amountPaid) || 0, balance_due: balanceDue,
        payment_method: bookingData.paymentMethod, status: 'active'
      });
      if (leaseError) throw leaseError;

      await supabase.from('cars').update({ status: 'rented' }).eq('id', bookingData.carId);

      await generateContractPDF();
      await fetchCars();

      toast.dismiss('save-booking');
      toast.success("Contract Saved & Downloaded!");
      setIsBookingOpen(false);
      
    } catch (error) {
      toast.dismiss('save-booking');
      toast.error("Cloud Sync Failed", { description: "Please check your database." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Return Vehicle
  const handleReturnVehicle = async (leaseId: string, carId: string) => {
    if (!confirm("Are you sure you want to return this vehicle?")) return;
    toast.loading("Processing return...", { id: 'return-car' });
    try {
      const { error: leaseError } = await supabase.from('leases').update({ status: 'completed' }).eq('id', leaseId);
      if (leaseError) throw leaseError;
      
      const { error: carError } = await supabase.from('cars').update({ status: 'available' }).eq('id', carId);
      if (carError) throw carError;
      
      toast.dismiss('return-car');
      toast.success("Vehicle returned successfully!");
      fetchCars();
    } catch (error) {
      toast.dismiss('return-car');
      toast.error("Failed to return vehicle.");
    }
  };

  // Helper to compute extension preview
  const getExtendPreview = (lease: any) => {
    if (!extendLeaseDate || !lease) return null;
    const newReturn = new Date(extendLeaseDate);
    const oldReturn = new Date(lease.return_date);
    if (newReturn <= oldReturn) return null;
    const diffTime = newReturn.getTime() - oldReturn.getTime();
    const extraDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const rate = lease.cars?.rate || 0;
    const extraCost = extraDays * rate;
    const newTotal = (lease.total_cost || 0) + extraCost;
    const newBalance = (lease.balance_due || 0) + extraCost;
    return { extraDays, rate, extraCost, newTotal, newBalance };
  };

  const handleExtendLease = async (leaseId: string, carRate: number, currentReturnDate: string) => {
    if (!extendLeaseDate) { toast.error("Select a new return date"); return; }
    const newReturn = new Date(extendLeaseDate);
    const oldReturn = new Date(currentReturnDate);
    if (newReturn <= oldReturn) { toast.error("New date must be after current return date."); return; }
    
    const diffTime = newReturn.getTime() - oldReturn.getTime();
    const extraDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const extraCost = extraDays * carRate;

    if (!confirm(`Extend by ${extraDays} day(s)?\n\nExtra charge: KSh ${extraCost.toLocaleString()}\nRate: KSh ${carRate.toLocaleString()} / day\n\nClick OK to confirm.`)) return;

    toast.loading("Extending lease...", { id: 'extend-lease' });
    try {
      const lease = leasesList.find(l => l.id === leaseId);
      if (!lease) throw new Error("Lease not found");
      const newTotal = (lease.total_cost || 0) + extraCost;
      const newBalance = (lease.balance_due || 0) + extraCost;

      const { error } = await supabase.from('leases').update({
        return_date: extendLeaseDate,
        total_cost: newTotal,
        balance_due: newBalance
      }).eq('id', leaseId);

      if (error) throw error;
      toast.dismiss('extend-lease');
      toast.success(`Lease extended by ${extraDays} day(s). Extra: KSh ${extraCost.toLocaleString()}`);
      
      // Set amendment data for the PDF then auto-download
      setAmendmentData({
        clientName: lease.customers?.full_name || 'N/A',
        clientPhone: lease.customers?.phone || 'N/A',
        carMake: lease.cars?.make || '',
        carModel: lease.cars?.model || '',
        carPlate: lease.cars?.plate || '',
        dailyRate: carRate,
        oldReturnDate: currentReturnDate,
        newReturnDate: extendLeaseDate,
        extraDays,
        extraCost,
        originalTotal: lease.total_cost || 0,
        newTotal,
        newBalance,
        date: new Date().toLocaleDateString()
      });

      setExtendingLeaseId(null);
      setExtendLeaseDate('');
      fetchCars();
      if (selectedCar) fetchCarDetails(selectedCar.id);
    } catch (e) {
      toast.dismiss('extend-lease');
      toast.error("Failed to extend lease.");
    }
  };

  // Handle Update Maintenance
  const handleUpdateMaintenance = async (carId: string) => {
    if (!confirm("Has the maintenance been completed? This will make the vehicle available for booking.")) return;
    toast.loading("Updating status...", { id: 'update-car' });
    try {
      const { error } = await supabase.from('cars').update({ status: 'available' }).eq('id', carId);
      if (error) throw error;
      
      toast.dismiss('update-car');
      toast.success("Vehicle is now available!");
      fetchCars();
    } catch (error) {
      toast.dismiss('update-car');
      toast.error("Failed to update status.");
    }
  };

  // Handle Toggle Blacklist Client
  const handleToggleBlacklist = async (customerId: string, customerName: string, isCurrentlyBlacklisted: boolean) => {
    const action = isCurrentlyBlacklisted ? 'unblacklist' : 'blacklist';
    if (!confirm(`Are you sure you want to ${action} ${customerName}?`)) return;
    toast.loading(`${isCurrentlyBlacklisted ? 'Unblacklisting' : 'Blacklisting'} client...`, { id: 'blacklist' });
    try {
      const { error } = await supabase.from('customers').update({ is_blacklisted: !isCurrentlyBlacklisted }).eq('id', customerId);
      if (error) throw error;
      
      toast.dismiss('blacklist');
      toast.success(`${customerName} has been ${isCurrentlyBlacklisted ? 'unblacklisted' : 'blacklisted'}.`);
      fetchCars();
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer((prev: any) => ({ ...prev, is_blacklisted: !isCurrentlyBlacklisted }));
      }
    } catch (error) {
      toast.dismiss('blacklist');
      toast.error(`Failed to ${action} client.`);
    }
  };

  // Vehicle Dossier Handlers
  const handleUpdateBaseRate = async () => {
    if (!selectedCar || !newBaseRate) return;
    const rate = Number(newBaseRate);
    if (isNaN(rate) || rate <= 0) { toast.error("Invalid base rate."); return; }
    
    toast.loading("Updating base rate...", { id: 'update-rate' });
    try {
      const { error } = await supabase.from('cars').update({ rate }).eq('id', selectedCar.id);
      if (error) throw error;
      toast.dismiss('update-rate');
      toast.success("Base rate updated successfully.");
      setSelectedCar({ ...selectedCar, rate });
      setIsUpdatingBaseRate(false);
      fetchCars();
    } catch (e) {
      toast.dismiss('update-rate');
      toast.error("Failed to update base rate.");
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar) return;
    if (!newMaintLog.description || !newMaintLog.cost) { toast.error("Description and Cost are required."); return; }

    toast.loading("Logging maintenance...", { id: 'log-maint' });
    try {
      const cost = Number(newMaintLog.cost);
      const mileage = newMaintLog.mileage ? Number(newMaintLog.mileage) : selectedCar.mileage || 0;
      
      const { error: insertError } = await supabase.from('maintenance_logs').insert({
        car_id: selectedCar.id,
        service_date: new Date().toISOString().split('T')[0],
        description: newMaintLog.description,
        cost,
        mileage_at_service: mileage
      });
      if (insertError) throw insertError;
      
      // Update car mileage and status
      const { error: updateError } = await supabase.from('cars').update({ 
        ...(newMaintLog.mileage && { mileage }),
        status: 'maintenance'
      }).eq('id', selectedCar.id);
      
      toast.dismiss('log-maint');
      toast.success("Maintenance logged successfully.");
      setNewMaintLog({ description: '', cost: '', mileage: '' });
      fetchCarDetails(selectedCar.id);
      fetchCars();
      setSelectedCar(prev => prev ? { ...prev, status: 'maintenance', mileage: newMaintLog.mileage ? mileage : prev.mileage } : null);
    } catch (e) {
      toast.dismiss('log-maint');
      toast.error("Failed to log maintenance.");
    }
  };

  const handleRemoveVehicle = async () => {
    if (!selectedCar) return;
    if (!confirm(`Are you absolutely sure you want to remove ${selectedCar.make} ${selectedCar.model} (${selectedCar.plate}) from the fleet? This action cannot be undone.`)) return;
    
    toast.loading("Removing vehicle...", { id: 'remove-car' });
    try {
      const { error } = await supabase.from('cars').delete().eq('id', selectedCar.id);
      if (error) throw error;
      toast.dismiss('remove-car');
      toast.success("Vehicle removed from fleet.");
      setSelectedCar(null);
      fetchCars();
    } catch (e) {
      toast.dismiss('remove-car');
      toast.error("Failed to remove vehicle. It may be tied to existing leases.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans relative overflow-x-hidden">
      <Toaster position="top-center" richColors />
      
      {/* --- HIDDEN PDF TEMPLATE --- */}
      <div id="receipt-pdf-template" className="absolute top-[-9999px] left-[-9999px] bg-white p-12 w-[850px] text-slate-900 font-sans">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-slate-300 pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">BUJATECH</h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">CAR HIRE & FLEET MANAGEMENT</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-blue-600 uppercase tracking-wide">LEASE AGREEMENT</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">Date: {isMounted ? new Date().toLocaleDateString() : ''}</p>
          </div>
        </div>

        {/* Details Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 border-t-4 border-t-blue-100">
            <h3 className="font-black uppercase tracking-widest text-[9px] text-blue-400 mb-3 border-b border-slate-200 pb-2">CLIENT DETAILS</h3>
            <p className="font-bold text-sm mb-1">{bookingData.customerName}</p>
            <p className="text-xs font-medium text-slate-500">ID: {bookingData.idNumber}</p>
            <p className="text-xs font-medium text-slate-500">Phone: {bookingData.phone}</p>
          </div>
          <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 border-t-4 border-t-blue-100">
            <h3 className="font-black uppercase tracking-widest text-[9px] text-blue-400 mb-3 border-b border-slate-200 pb-2">VEHICLE DETAILS</h3>
            <p className="font-bold text-sm mb-1">{selectedCarDetails?.make} {selectedCarDetails?.model}</p>
            <p className="text-xs font-medium text-slate-500">Plate: {selectedCarDetails?.plate}</p>
            <p className="text-xs font-medium text-slate-500">Daily Rate: KSh {selectedCarDetails?.rate?.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="bg-[#0f172a] text-white text-left uppercase text-[9px] tracking-widest">
              <th className="px-4 py-3 rounded-l-md">DESCRIPTION</th>
              <th className="px-4 py-3 text-center">DAYS</th>
              <th className="px-4 py-3 text-right rounded-r-md">AMOUNT (KSH)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-6">
                <p className="font-bold text-sm mb-1">Vehicle Hire ({bookingData.pickupDate ? new Date(bookingData.pickupDate).toLocaleDateString() : ''} to {bookingData.returnDate ? new Date(bookingData.returnDate).toLocaleDateString() : ''})</p>
                <p className="text-[10px] text-slate-400">Destination: {bookingData.destination} | Purpose: {bookingData.purpose}</p>
              </td>
              <td className="px-4 py-6 text-center font-bold text-sm">{billedDays}</td>
              <td className="px-4 py-6 text-right font-black text-sm">{totalCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-600 px-4">
              <span>Subtotal:</span>
              <span>KSh {totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-emerald-600 px-4">
              <span>Amount Paid ({bookingData.paymentMethod}):</span>
              <span>- KSh {(Number(bookingData.amountPaid) || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black border border-red-100 bg-red-50/30 p-4 rounded-lg mt-2 text-slate-700">
              <span className="text-[10px] tracking-widest text-slate-400 uppercase">BALANCE DUE</span>
              <span className="text-red-600 text-lg">KSh {Math.max(0, balanceDue).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">CLIENT SIGNATURE</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="h-16 mb-2 flex items-end">
              {bookingData.signature && <img src={bookingData.signature} alt="Client Signature" className="max-h-full" />}
            </div>
            <div className="border-t border-slate-300 w-full pt-2">
              <p className="font-bold text-sm">{bookingData.customerName}</p>
              <p className="text-[8px] text-slate-400 mt-1 leading-tight">I agree to the terms and conditions of Bujatech Car Hire. I am fully liable for the vehicle during the lease period.</p>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">GUARANTOR / ALT CONTACT</p>
            <div className="h-16 mb-2"></div>
            <div className="border-t border-slate-300 w-full pt-2">
              <p className="font-bold text-sm">{bookingData.altName || 'N/A'} <span className="text-xs font-medium text-slate-500">({bookingData.altRelationship || 'N/A'})</span></p>
              <p className="text-[10px] text-slate-500 mt-0.5">ID: {bookingData.altId || 'N/A'} | Phone: {bookingData.altPhone || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- HIDDEN AMENDMENT PDF TEMPLATE --- */}
      {amendmentData && (
        <div id="amendment-pdf-template" className="absolute top-[-9999px] left-[-9999px] bg-white p-12 w-[850px] text-slate-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-end border-b-2 border-slate-300 pb-4 mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">BUJATECH</h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">CAR HIRE & FLEET MANAGEMENT</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-black text-amber-600 uppercase tracking-wide">LEASE AMENDMENT</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">Date Issued: {amendmentData.date}</p>
            </div>
          </div>

          {/* Amendment Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-xs font-bold text-amber-700">This document amends the original Lease Agreement. The return date has been extended and additional charges have been applied as outlined below.</p>
          </div>

          {/* Details Cards */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 border-t-4 border-t-amber-200">
              <h3 className="font-black uppercase tracking-widest text-[9px] text-amber-500 mb-3 border-b border-slate-200 pb-2">CLIENT DETAILS</h3>
              <p className="font-bold text-sm mb-1">{amendmentData.clientName}</p>
              <p className="text-xs font-medium text-slate-500">Phone: {amendmentData.clientPhone}</p>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 border-t-4 border-t-amber-200">
              <h3 className="font-black uppercase tracking-widest text-[9px] text-amber-500 mb-3 border-b border-slate-200 pb-2">VEHICLE DETAILS</h3>
              <p className="font-bold text-sm mb-1">{amendmentData.carMake} {amendmentData.carModel}</p>
              <p className="text-xs font-medium text-slate-500">Plate: {amendmentData.carPlate}</p>
              <p className="text-xs font-medium text-slate-500">Daily Rate: KSh {amendmentData.dailyRate?.toLocaleString()}</p>
            </div>
          </div>

          {/* Amendment Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-[#0f172a] text-white text-left uppercase text-[9px] tracking-widest">
                <th className="px-4 py-3 rounded-l-md">DESCRIPTION</th>
                <th className="px-4 py-3 text-center">DAYS</th>
                <th className="px-4 py-3 text-right rounded-r-md">AMOUNT (KSH)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-5">
                  <p className="font-bold text-sm mb-1">Lease Extension</p>
                  <p className="text-[10px] text-slate-400">Original Return: {new Date(amendmentData.oldReturnDate).toLocaleDateString()} → New Return: {new Date(amendmentData.newReturnDate).toLocaleDateString()}</p>
                </td>
                <td className="px-4 py-5 text-center font-bold text-sm">{amendmentData.extraDays}</td>
                <td className="px-4 py-5 text-right font-black text-sm">{amendmentData.extraCost?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="flex justify-end mb-12">
            <div className="w-80 space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-600 px-4">
                <span>Original Total:</span>
                <span>KSh {amendmentData.originalTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-amber-600 px-4">
                <span>Extension Charge ({amendmentData.extraDays} days × KSh {amendmentData.dailyRate?.toLocaleString()}):</span>
                <span>+ KSh {amendmentData.extraCost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-slate-800 px-4 border-t border-slate-200 pt-3">
                <span>Amended Total:</span>
                <span>KSh {amendmentData.newTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border border-red-100 bg-red-50/30 p-4 rounded-lg mt-2 text-slate-700">
                <span className="text-[10px] tracking-widest text-slate-400 uppercase">BALANCE DUE</span>
                <span className="text-red-600 text-lg">KSh {amendmentData.newBalance?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">CLIENT ACKNOWLEDGEMENT</p>
              <div className="h-16 mb-2"></div>
              <div className="border-t border-slate-300 w-full pt-2">
                <p className="font-bold text-sm">{amendmentData.clientName}</p>
                <p className="text-[8px] text-slate-400 mt-1 leading-tight">I acknowledge the lease extension and the additional charges outlined in this amendment.</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">AUTHORIZED BY</p>
              <div className="h-16 mb-2"></div>
              <div className="border-t border-slate-300 w-full pt-2">
                <p className="font-bold text-sm">Bujatech Admin</p>
                <p className="text-[8px] text-slate-400 mt-1 leading-tight">Authorized representative of Bujatech Car Hire & Fleet Management.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className={`hidden lg:flex bg-[#0B1120] text-white flex-col h-screen fixed z-20 border-r border-slate-800/50 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 pb-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Bujatech</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fleet Admin</p>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-slate-400 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarCollapsed ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <button onClick={() => setActiveTab('fleet')} className={`w-full flex items-center p-3 rounded-xl font-bold transition group ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'fleet' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`} title="Fleet Grid">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            {!isSidebarCollapsed && <span>Fleet Grid</span>}
          </button>
          <button onClick={() => setActiveTab('leases')} className={`w-full flex items-center p-3 rounded-xl font-bold transition group ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'leases' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`} title="Active Leases">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {!isSidebarCollapsed && <span>Active Leases</span>}
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center p-3 rounded-xl font-bold transition group ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`} title="Customers">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            {!isSidebarCollapsed && <span>Customers</span>}
          </button>
          <div className="pt-4 mt-4 border-t border-slate-800/50"></div>
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center p-3 rounded-xl font-bold transition group ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`} title="Analytics">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            {!isSidebarCollapsed && <span>Analytics</span>}
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center p-3 rounded-xl font-bold transition group ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} ${activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`} title="Notifications">
            <div className="relative">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#0B1120]"></span>
            </div>
            {!isSidebarCollapsed && <span>Notifications</span>}
          </button>
        </nav>
        
        <div className={`p-6 border-t border-slate-800/50 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">AD</div>
          {!isSidebarCollapsed && (
            <div>
              <p className="font-bold text-sm">Admin User</p>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Online</p>
            </div>
          )}
        </div>
      </aside>


      {/* --- MOBILE TOP HEADER --- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#0f172a] text-white z-40 p-4 pt-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight">Bujatech</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Fleet Admin</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('analytics')} className={`${activeTab === 'analytics' ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`relative ${activeTab === 'notifications' ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} p-4 lg:p-8 pt-24 lg:pt-8 w-full bg-slate-50 min-h-screen`}>
        
        {/* Header & Search */}
        <div className="mb-8 flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 order-2 md:order-1">
            {/* Title is hidden on mobile screens per screenshot */}
            <div className="hidden md:block">
              {activeTab === 'fleet' && (
                <>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Fleet Overview</h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm">Manage vehicles, track leases, and monitor maintenance.</p>
                </>
              )}
              {activeTab === 'leases' && (
                <>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Active Leases</h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm">Monitor ongoing rentals and expected returns.</p>
                </>
              )}
              {activeTab === 'customers' && (
                <>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Client Directory</h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm">Database of all recurring clients and their contact details.</p>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              {activeTab === 'fleet' && (
                <button onClick={() => setIsAddCarOpen(true)} className="flex-1 md:flex-none px-4 lg:px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg> Add Vehicle
                </button>
              )}
              <button onClick={() => setIsBookingOpen(true)} className="flex-1 md:flex-none px-4 lg:px-5 py-3 bg-[#2563eb] text-white font-bold text-sm rounded-xl shadow-md hover:bg-blue-700 flex items-center justify-center gap-2 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                <span className="hidden md:inline">New Booking</span>
                <span className="md:hidden">Book Car</span>
              </button>
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder={activeTab === 'fleet' ? "Search vehicles, plates..." : activeTab === 'leases' ? "Search active leases or vehicles..." : "Search clients by name, ID, or phone..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition shadow-sm font-medium text-slate-700"/>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center py-20 text-slate-500 font-bold">Syncing Database...</div>
          ) : activeTab === 'fleet' ? (
            filteredFleet.length === 0 ? (
               <div className="text-center py-20 text-slate-500 font-bold">No vehicles found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFleet.map((car) => {
                const isRented = car.status === 'rented';
                const isMaintenance = car.status === 'maintenance';
                const isAvailable = car.status === 'available';

                return (
                  <div key={car.id} onClick={() => { setSelectedCar(car); setVehicleDossierTab('status'); fetchCarDetails(car.id); }} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-md transition cursor-pointer">
                    <div className={`h-1.5 w-full ${isRented ? 'bg-blue-600' : isMaintenance ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-black text-lg text-slate-900">{car.make} {car.model}</h3>
                          <div className="inline-block mt-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md">
                            <p className="text-xs font-bold text-slate-600 tracking-wider">{car.plate}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isRented ? 'bg-blue-50 text-blue-700' : isMaintenance ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {car.status}
                        </span>
                      </div>
                      
                      {isRented && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-400 text-xs uppercase tracking-widest">Client</span>
                            <span className="text-slate-900 truncate pl-2">{car.customerName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-600 text-sm font-bold">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> 
                            Due: {car.returnDate || 'Pending'}
                          </div>
                        </div>
                      )}

                      {isMaintenance && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold mt-4">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> 
                          {car.note || 'Service Required'}
                        </div>
                      )}
                      
                      {isAvailable && (
                        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</span>
                          <span className="font-black text-slate-900 text-lg">KSh {car.rate?.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/day</span></span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                      {isRented && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setActiveTab('leases'); setSearchQuery(car.plate); }} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition">View Lease</button>
                          <a href={`tel:${car.customerPhone}`} onClick={(e) => e.stopPropagation()} className="w-12 h-12 bg-[#2563eb] text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                          </a>
                        </>
                      )}
                      {isMaintenance && (
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateMaintenance(car.id); }} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition">Update Status</button>
                      )}
                      {isAvailable && (
                        <button onClick={(e) => { e.stopPropagation(); setBookingData({...bookingData, carId: car.id}); setIsBookingOpen(true); }} className="flex-1 py-3 bg-[#0f172a] text-white rounded-xl font-bold text-sm hover:bg-black transition">
                          Book Car
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )
          ) : activeTab === 'leases' ? (
            <div className="bg-transparent md:bg-white md:border border-slate-200 md:rounded-2xl md:shadow-sm overflow-hidden">
              <div className="hidden md:grid grid-cols-4 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest">
                <div className="p-5">Client & Vehicle</div>
                <div className="p-5">Timeline</div>
                <div className="p-5">Financials</div>
                <div className="p-5 text-right">Actions</div>
              </div>
              <div className="flex flex-col space-y-4 md:space-y-0">
                {leasesList.filter(lease => !searchQuery || lease.customers?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || lease.cars?.plate?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-10 text-center text-slate-500 font-bold bg-white md:bg-transparent rounded-2xl md:rounded-none border border-slate-200 md:border-0 shadow-sm md:shadow-none">No active leases found.</div>
                ) : leasesList.filter(lease => !searchQuery || lease.customers?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || lease.cars?.plate?.toLowerCase().includes(searchQuery.toLowerCase())).map((lease) => (
                  <div key={lease.id} className="bg-white md:bg-transparent border border-slate-200 md:border-0 md:border-b md:border-slate-100 rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50 transition grid grid-cols-1 md:grid-cols-4 gap-4 p-5 md:items-center">
                    <div className="mb-2 md:mb-0">
                      <p className="font-bold text-slate-900 text-lg md:text-base">{lease.customers?.full_name}</p>
                      <p className="font-medium text-blue-600 text-sm mt-0.5">{lease.cars?.make} {lease.cars?.model} <span className="text-slate-400">({lease.cars?.plate})</span></p>
                    </div>
                    <div className="space-y-1 mb-2 md:mb-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] uppercase tracking-widest">Out:</span> {new Date(lease.pickup_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span className="text-[10px] uppercase tracking-widest text-blue-600">Due:</span> {new Date(lease.return_date).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Dest: <span className="text-slate-500">{lease.destination || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Purpose: <span className="text-slate-500">{lease.purpose || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mb-2 md:mb-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Total: <span className="text-slate-900 text-sm">KSh {lease.total_cost?.toLocaleString()}</span>
                      </div>
                      {lease.balance_due > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-widest">Bal: KSh {lease.balance_due.toLocaleString()}</span>
                      ) : (
                        <span className="px-2 py-1 bg-[#dcfce7] text-[#047857] rounded text-[9px] font-black uppercase tracking-widest">Fully Paid</span>
                      )}
                    </div>
                    <div className="flex md:justify-end mt-4 md:mt-0 gap-2 flex-col md:flex-row">
                      {extendingLeaseId === lease.id ? (
                        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3 w-full md:w-auto md:min-w-[320px]">
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Extend Lease</p>
                          <input type="date" value={extendLeaseDate} onChange={(e) => setExtendLeaseDate(e.target.value)} className="w-full p-2.5 border border-blue-200 bg-white rounded-lg text-sm outline-none focus:border-blue-500 font-medium text-slate-700 shadow-sm" />
                          {(() => {
                            const preview = getExtendPreview(lease);
                            if (!preview) return <p className="text-xs text-slate-400 font-medium">Pick a date after {new Date(lease.return_date).toLocaleDateString()}</p>;
                            return (
                              <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm space-y-2">
                                <div className="flex justify-between text-xs"><span className="text-slate-500 font-medium">Extra Days</span><span className="font-bold text-slate-900">{preview.extraDays}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-500 font-medium">Rate</span><span className="font-bold text-slate-900">KSh {preview.rate.toLocaleString()} /day</span></div>
                                <div className="border-t border-blue-100 pt-2 flex justify-between text-xs"><span className="text-blue-600 font-bold">Extra Charge</span><span className="font-black text-blue-600">+ KSh {preview.extraCost.toLocaleString()}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-500 font-medium">New Total</span><span className="font-bold text-slate-900">KSh {preview.newTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-red-500 font-bold">New Balance</span><span className="font-black text-red-600">KSh {preview.newBalance.toLocaleString()}</span></div>
                              </div>
                            );
                          })()}
                          <div className="flex gap-2">
                            <button onClick={() => handleExtendLease(lease.id, lease.cars?.rate || 0, lease.return_date)} disabled={!getExtendPreview(lease)} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed">Confirm Extension</button>
                            <button onClick={() => { setExtendingLeaseId(null); setExtendLeaseDate(''); }} className="px-4 py-2.5 bg-white text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 border border-slate-200 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setExtendingLeaseId(lease.id)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition w-full md:w-auto">
                            Extend
                          </button>
                          <button onClick={() => handleReturnVehicle(lease.id, lease.car_id)} className="px-4 py-2 bg-[#0f172a] text-white rounded-lg font-bold text-sm hover:bg-black transition w-full md:w-auto">
                            Return
                            <span className="hidden md:inline"> Vehicle</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'customers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {customersList.filter(c => !searchQuery || c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.id_number?.includes(searchQuery) || c.phone?.includes(searchQuery)).length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-500 font-bold">No customers found.</div>
              ) : customersList.filter(c => !searchQuery || c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.id_number?.includes(searchQuery) || c.phone?.includes(searchQuery)).map((customer) => (
                <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl flex-shrink-0">
                      {customer.full_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{customer.full_name}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: {customer.id_number}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-600 font-bold mb-6 pb-6 border-b border-slate-100">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {customer.phone}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 mb-6 flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guarantor</p>
                    <p className="font-bold text-slate-900 text-sm">{customer.alt_name || 'N/A'} <span className="text-slate-500 font-medium">({customer.alt_relationship || 'Unknown'})</span></p>
                    {customer.alt_phone && <p className="text-sm font-bold text-blue-600 mt-1">{customer.alt_phone}</p>}
                  </div>

                  <div className="flex justify-end mt-auto pt-4">
                    {customer.is_blacklisted ? (
                      <button onClick={(e) => { e.stopPropagation(); handleToggleBlacklist(customer.id, customer.full_name, true); }} className="text-[10px] font-black text-red-600 hover:text-red-800 uppercase tracking-widest transition">
                        Blacklisted (Click to Unban)
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleToggleBlacklist(customer.id, customer.full_name, false); }} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition">
                        Blacklist Client
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'analytics' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl border border-blue-500 shadow-xl shadow-blue-900/10 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 p-6 opacity-10"><svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>
                  <p className="text-[11px] font-black text-blue-200 uppercase tracking-widest mb-2 relative z-10">Total Revenue</p>
                  <p className="text-4xl font-black text-white relative z-10">KSh {leasesList.reduce((acc, curr) => acc + (curr.total_cost || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Trips</p>
                  </div>
                  <p className="text-4xl font-black text-slate-900">{leasesList.filter(l => l.status === 'active').length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fleet Utilization</p>
                  </div>
                  <p className="text-4xl font-black text-slate-900">{fleet.length > 0 ? Math.round((fleet.filter(c => c.status === 'rented').length / fleet.length) * 100) : 0}%</p>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden shadow-inner">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${fleet.length > 0 ? Math.round((fleet.filter(c => c.status === 'rented').length / fleet.length) * 100) : 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50">
                <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-3"><svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Recent Activity</h3>
                <div className="space-y-4">
                  {leasesList.slice(0, 5).map(lease => (
                    <div key={lease.id} className="flex justify-between items-center border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{lease.customers?.full_name}</p>
                        <p className="text-xs text-slate-500 font-medium">{lease.cars?.make} {lease.cars?.model} ({lease.cars?.plate})</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${lease.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{lease.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'notifications' ? (
            <div className="space-y-6">
              <h3 className="font-black text-lg text-slate-900 mb-2">Needs Attention</h3>
              <div className="space-y-4">
                {leasesList.filter(l => l.status === 'active' && new Date(l.return_date) < new Date(Date.now() + 86400000)).map(lease => {
                  const isOverdue = new Date(lease.return_date) < new Date();
                  return (
                    <div key={lease.id} onClick={() => { const car = fleet.find(c => c.id === lease.car_id); if (car) { setSelectedCar(car); setVehicleDossierTab('leases'); fetchCarDetails(car.id); } }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{isOverdue ? 'Overdue Lease' : 'Lease Ending Soon'}</p>
                        <p className="text-sm font-medium text-slate-500">{lease.customers?.full_name} is scheduled to return {lease.cars?.make} {lease.cars?.model} on {new Date(lease.return_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
                
                {fleet.filter(c => (c.mileage || 0) >= (c.nextServiceMileage || 5000) * 0.95).map(car => (
                  <div key={car.id} onClick={() => { setSelectedCar(car); setVehicleDossierTab('maint'); fetchCarDetails(car.id); }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">Service Due</p>
                      <p className="text-sm font-medium text-slate-500">{car.make} {car.model} ({car.plate}) has reached {car.mileage?.toLocaleString()} km. Next service at {car.nextServiceMileage?.toLocaleString()} km.</p>
                    </div>
                  </div>
                ))}
                
                {leasesList.filter(l => l.status === 'active' && new Date(l.return_date) < new Date(Date.now() + 86400000)).length === 0 && fleet.filter(c => (c.mileage || 0) >= (c.nextServiceMileage || 5000) * 0.95).length === 0 && (
                  <div className="p-10 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-sm">You are all caught up! No notifications.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        <button onClick={() => setActiveTab('fleet')} className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === 'fleet' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg> <span className="text-[10px] font-bold uppercase tracking-wider">Fleet</span>
        </button>
        <button onClick={() => setActiveTab('leases')} className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === 'leases' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> <span className="text-[10px] font-bold uppercase tracking-wider">Leases</span>
        </button>
        <button onClick={() => setActiveTab('customers')} className={`flex flex-col items-center justify-center w-full py-3 transition ${activeTab === 'customers' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> <span className="text-[10px] font-bold uppercase tracking-wider">Clients</span>
        </button>
      </div>

      {/* =========================================
          ADD NEW VEHICLE DRAWER
      ========================================= */}
      {isAddCarOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddCarOpen(false)}></div>
          <div className="fixed top-0 right-0 z-[100] h-screen w-full md:w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex-none flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Add New Vehicle</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Fleet Expansion</p>
              </div>
              <button onClick={() => setIsAddCarOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form id="addCarForm" onSubmit={handleAddVehicle} className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Vehicle Details</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Make</label>
                      <input type="text" required value={newCarData.make} onChange={e => setNewCarData({...newCarData, make: e.target.value})} placeholder="e.g. Toyota" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Model</label>
                      <input type="text" required value={newCarData.model} onChange={e => setNewCarData({...newCarData, model: e.target.value})} placeholder="e.g. Fielder" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">License Plate</label>
                    <input type="text" required value={newCarData.plate} onChange={e => setNewCarData({...newCarData, plate: e.target.value})} placeholder="e.g. KDH 123A" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium uppercase"/>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Financials & Telemetry</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Daily Rental Rate (KSh)</label>
                    <input type="number" required value={newCarData.rate} onChange={e => setNewCarData({...newCarData, rate: e.target.value})} placeholder="e.g. 3500" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Current Mileage</label>
                      <input type="number" value={newCarData.mileage} onChange={e => setNewCarData({...newCarData, mileage: e.target.value})} placeholder="e.g. 85000" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Next Service At</label>
                      <input type="number" value={newCarData.nextServiceMileage} onChange={e => setNewCarData({...newCarData, nextServiceMileage: e.target.value})} placeholder="e.g. 90000" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex-none p-6 bg-white border-t border-slate-100 flex gap-4 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <button type="button" onClick={() => setIsAddCarOpen(false)} className="px-6 py-4 bg-slate-50 border-[1.5px] border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition">
                Cancel
              </button>
              <button 
                form="addCarForm"
                type="submit"
                className="flex-1 bg-[#64748b] hover:bg-[#475569] text-white font-black py-4 rounded-xl text-sm transition shadow-md"
              >
                Save Vehicle to Fleet
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================
          SMART BOOKING DRAWER
      ========================================= */}
      {isBookingOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsBookingOpen(false)}></div>
          
          <div className="fixed top-0 right-0 z-[100] h-screen w-full md:w-[600px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="flex-none flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">New Digital Contract</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Smart Booking</p>
              </div>
              <button onClick={() => setIsBookingOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">1. Select Vehicle</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm">
                  <select required value={bookingData.carId} onChange={(e) => setBookingData({...bookingData, carId: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 bg-transparent font-bold text-slate-800 outline-none text-sm cursor-pointer rounded-lg focus:border-blue-400 transition">
                    <option value="" disabled>-- Choose a car --</option>
                    {availableCars.map(car => <option key={car.id} value={car.id}>{car.make} {car.model} ({car.plate})</option>)}
                  </select>

                  {selectedCarDetails && (
                    <div className="bg-[#f0fdf4] border-[1.5px] border-[#bbf7d0] p-4 rounded-xl flex justify-between items-center mt-4">
                      <span className="text-[10px] font-black text-[#166534] uppercase tracking-widest">Confirmed Base Rate</span>
                      <span className="text-lg font-black text-[#15803d]">KSh {selectedCarDetails.rate.toLocaleString()} <span className="text-xs font-bold text-[#166534]">/ day</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">2. Trip & Billing Schedule</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Destination</label>
                      <input type="text" required value={bookingData.destination} onChange={e => setBookingData({...bookingData, destination: e.target.value})} placeholder="e.g. Nairobi CBD" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Purpose</label>
                      <select required value={bookingData.purpose} onChange={e => setBookingData({...bookingData, purpose: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition bg-white">
                        <option value="Personal / Leisure">Personal / Leisure</option>
                        <option value="Business / Corporate">Business / Corporate</option>
                        <option value="Event / Wedding">Event / Wedding</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Pickup Date & Time</label>
                      <input type="datetime-local" required value={bookingData.pickupDate} onChange={e => setBookingData({...bookingData, pickupDate: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition bg-white"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Return Date & Time</label>
                      <input type="datetime-local" required value={bookingData.returnDate} onChange={e => setBookingData({...bookingData, returnDate: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition bg-white"/>
                    </div>
                  </div>

                  {billedDays > 0 && selectedCarDetails && (
                    <div className="mt-5 p-5 bg-[#0f172a] rounded-xl text-white shadow-inner">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</span>
                        <span className="font-bold text-sm">KSh {selectedCarDetails.rate.toLocaleString()} / day</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Cycle</span>
                        <span className="font-bold text-sm">{billedDays}x 24-hr blocks</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Total Cost</span>
                        <span className="text-3xl font-black text-[#34d399]">KSh {totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">3. Payment Details</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                   <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Amount Paid (Full / Partial)</label>
                      <input type="number" required value={bookingData.amountPaid} onChange={e => setBookingData({...bookingData, amountPaid: e.target.value})} placeholder="e.g. 5000" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Payment Method</label>
                      <select required value={bookingData.paymentMethod} onChange={e => setBookingData({...bookingData, paymentMethod: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition bg-white">
                        <option value="M-Pesa (Direct)">M-Pesa (Direct)</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">4. Identity & Contacts</h3>
                  <select defaultValue="" onChange={(e) => handleReturningCustomer(e.target.value)} className="text-[10px] font-bold text-blue-500 border-[1.5px] border-blue-200 bg-blue-50 px-2 py-1 rounded cursor-pointer max-w-[150px] truncate outline-none">
                    <option value="" disabled>+ Load Cloud Client</option>
                    {customersList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Primary Client Name</label>
                    <input type="text" required value={bookingData.customerName} onChange={e => setBookingData({...bookingData, customerName: e.target.value})} placeholder="John Doe" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">ID Number</label>
                      <input type="text" required value={bookingData.idNumber} onChange={e => setBookingData({...bookingData, idNumber: e.target.value})} placeholder="e.g. 30123456" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Phone Number</label>
                      <input type="tel" required value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} placeholder="07XX XXX XXX" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                  </div>
                  
                  <hr className="border-slate-100" />
                  
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Alternative Contact / Guarantor (Required)</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Full Name</label>
                      <input type="text" required value={bookingData.altName} onChange={e => setBookingData({...bookingData, altName: e.target.value})} placeholder="Jane Doe" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Relationship</label>
                      <select required value={bookingData.altRelationship} onChange={e => setBookingData({...bookingData, altRelationship: e.target.value})} className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition bg-white">
                        <option value="" disabled>Select Relationship</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Friend">Friend</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Alt. ID Number</label>
                      <input type="text" required value={bookingData.altId} onChange={e => setBookingData({...bookingData, altId: e.target.value})} placeholder="e.g. 28123456" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Alt. Phone Number</label>
                      <input type="tel" required value={bookingData.altPhone} onChange={e => setBookingData({...bookingData, altPhone: e.target.value})} placeholder="07XX XXX XXX" className="w-full p-3 border-[1.5px] border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition placeholder:text-slate-400 placeholder:font-medium"/>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">5. Legal Digital Signature</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 mb-4">I agree to the terms of the lease and accept liability for the vehicle during the selected period.</p>
                  <SignaturePad onSign={(data) => setBookingData({...bookingData, signature: data})} signatureData={bookingData.signature} />
                </div>
              </div>

              <div className="pb-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">6. Secure Documents (Front & Back)</h3>
                <div className="border-[1.5px] border-slate-200 rounded-xl p-5 shadow-sm">
                  
                  {bookingData.isCloudClient ? (
                    <div className="grid grid-cols-2 gap-4">
                      {bookingData.cloudIdFront ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={bookingData.cloudIdFront} alt="ID Front" className="h-24 w-full object-cover rounded-xl border-[1.5px] border-slate-200 shadow-sm" />
                      ) : (
                        <div className="h-24 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400"><span className="text-[10px] font-bold">NO ID FRONT</span></div>
                      )}
                      
                      {bookingData.cloudIdBack ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={bookingData.cloudIdBack} alt="ID Back" className="h-24 w-full object-cover rounded-xl border-[1.5px] border-slate-200 shadow-sm" />
                      ) : (
                        <div className="h-24 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400"><span className="text-[10px] font-bold">NO ID BACK</span></div>
                      )}

                      {bookingData.cloudDlFront ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={bookingData.cloudDlFront} alt="DL Front" className="h-24 w-full object-cover rounded-xl border-[1.5px] border-slate-200 shadow-sm" />
                      ) : (
                        <div className="h-24 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400"><span className="text-[10px] font-bold">NO DL FRONT</span></div>
                      )}

                      {bookingData.cloudDlBack ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={bookingData.cloudDlBack} alt="DL Back" className="h-24 w-full object-cover rounded-xl border-[1.5px] border-slate-200 shadow-sm" />
                      ) : (
                        <div className="h-24 bg-slate-50 border-[1.5px] border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400"><span className="text-[10px] font-bold">NO DL BACK</span></div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`border-[1.5px] border-dashed rounded-xl h-20 flex items-center justify-center cursor-pointer transition ${bookingData.idFront ? 'border-blue-400 text-blue-500 bg-blue-50/30' : 'border-slate-300 text-slate-400 hover:bg-slate-50'}`}>
                        <input type="file" className="hidden" onChange={(e) => { if(e.target.files) setBookingData({...bookingData, idFront: e.target.files[0]}) }} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{bookingData.idFront ? '✓ ID (FRONT)' : 'ID (FRONT)'}</span>
                      </label>
                      <label className={`border-[1.5px] border-dashed rounded-xl h-20 flex items-center justify-center cursor-pointer transition ${bookingData.idBack ? 'border-blue-400 text-blue-500 bg-blue-50/30' : 'border-slate-300 text-slate-400 hover:bg-slate-50'}`}>
                        <input type="file" className="hidden" onChange={(e) => { if(e.target.files) setBookingData({...bookingData, idBack: e.target.files[0]}) }} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{bookingData.idBack ? '✓ ID (BACK)' : 'ID (BACK)'}</span>
                      </label>
                      <label className={`border-[1.5px] border-dashed rounded-xl h-20 flex items-center justify-center cursor-pointer transition ${bookingData.dlFront ? 'border-blue-400 text-blue-500 bg-blue-50/30' : 'border-slate-300 text-slate-400 hover:bg-slate-50'}`}>
                        <input type="file" className="hidden" onChange={(e) => { if(e.target.files) setBookingData({...bookingData, dlFront: e.target.files[0]}) }} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{bookingData.dlFront ? '✓ DL (FRONT)' : 'DL (FRONT)'}</span>
                      </label>
                      <label className={`border-[1.5px] border-dashed rounded-xl h-20 flex items-center justify-center cursor-pointer transition ${bookingData.dlBack ? 'border-blue-400 text-blue-500 bg-blue-50/30' : 'border-slate-300 text-slate-400 hover:bg-slate-50'}`}>
                        <input type="file" className="hidden" onChange={(e) => { if(e.target.files) setBookingData({...bookingData, dlBack: e.target.files[0]}) }} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{bookingData.dlBack ? '✓ DL (BACK)' : 'DL (BACK)'}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

            </form>

            <div className="flex-none p-6 bg-white border-t border-slate-100 flex gap-4 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <button type="button" onClick={() => setIsBookingOpen(false)} className="px-6 py-4 bg-slate-50 border-[1.5px] border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition">
                Cancel
              </button>
              <button 
                onClick={handleSubmitBooking}
                disabled={isSubmitting}
                className="flex-1 bg-[#8ba5ff] hover:bg-[#7a96f5] text-white font-black py-4 rounded-xl text-sm transition shadow-md shadow-blue-200/50 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? 'Saving Contract...' : 
                 (billedDays > 0 && bookingData.signature) ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Confirm & Upload
                  </div>
                 ) : 'Complete Form & Sign'
                }
              </button>
            </div>

          </div>
        </>
      )}

      {/* =========================================
          VEHICLE DOSSIER DRAWER
      ========================================= */}
      {selectedCar && (
        <>
          <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCar(null)}></div>
          <div className="fixed top-0 right-0 z-[100] h-screen w-full md:w-[450px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex-none p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCar.make} {selectedCar.model}</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedCar.plate}</p>
              </div>
              <button onClick={() => setSelectedCar(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex border-b border-slate-100 px-6 mt-4">
              <button onClick={() => setVehicleDossierTab('status')} className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${vehicleDossierTab === 'status' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Status</button>
              <button onClick={() => setVehicleDossierTab('leases')} className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${vehicleDossierTab === 'leases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Leases</button>
              <button onClick={() => setVehicleDossierTab('maint')} className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${vehicleDossierTab === 'maint' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Maint.</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {vehicleDossierTab === 'status' && (
                <div className="space-y-6">
                  <div className="border-[1.5px] border-slate-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Status</p>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedCar.status === 'rented' ? 'bg-blue-50 text-blue-700' : selectedCar.status === 'maintenance' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selectedCar.status}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Base Rate</p>
                      {isUpdatingBaseRate ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">KSh</span>
                            <input type="number" value={newBaseRate} onChange={(e) => setNewBaseRate(e.target.value)} className="w-32 pl-10 pr-3 py-2 text-right font-black text-slate-900 bg-white border-2 border-blue-400 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 transition shadow-sm" autoFocus />
                          </div>
                          <button onClick={handleUpdateBaseRate} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3 group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-xl transition" onClick={() => { setNewBaseRate(selectedCar.rate.toString()); setIsUpdatingBaseRate(true); }}>
                          <p className="font-black text-xl text-slate-900">KSh {selectedCar.rate?.toLocaleString()}</p>
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-[1.5px] border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vehicle Telemetry</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Current Odometer</span>
                        <span className="font-black text-slate-900">{selectedCar.mileage?.toLocaleString() || 0} km</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Next Service Due</span>
                        <span className="font-black text-slate-900">{selectedCar.nextServiceMileage?.toLocaleString() || 5000} km</span>
                      </div>
                      
                      {/* Telemetry Bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                        {(() => {
                          const mileage = selectedCar.mileage || 0;
                          const nextService = selectedCar.nextServiceMileage || 5000;
                          const progress = Math.min(100, Math.max(0, (mileage / nextService) * 100));
                          const color = progress > 90 ? 'bg-red-500' : progress > 75 ? 'bg-amber-400' : 'bg-emerald-500';
                          return <div className={`h-full ${color}`} style={{ width: `${progress}%` }}></div>;
                        })()}
                      </div>
                      
                      {((selectedCar.mileage || 0) >= (selectedCar.nextServiceMileage || 5000) * 0.9) && (
                        <p className="text-[9px] font-black text-red-500 text-center uppercase tracking-widest flex items-center justify-center gap-1 mt-2">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                           Service Approaching
                        </p>
                      )}
                    </div>
                  </div>

                  <button onClick={handleRemoveVehicle} className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition mt-6">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Remove Vehicle From Fleet
                  </button>
                </div>
              )}

              {vehicleDossierTab === 'leases' && (
                <div className="space-y-4">
                  {carLeaseHistory.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-bold text-sm">No lease history found for this vehicle.</div>
                  ) : (
                    carLeaseHistory.map((lease: any) => (
                      <div key={lease.id} className="border-[1.5px] border-slate-100 p-4 rounded-xl relative">
                        <span className={`absolute top-4 right-4 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${lease.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{lease.status}</span>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Client</p>
                        <p className="font-bold text-slate-900 mb-3">{lease.customers?.full_name}</p>
                        <p className="text-xs font-bold text-blue-600 bg-blue-50 py-2 px-3 rounded-lg flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] text-blue-400 mb-0.5">Expected Return:</span>
                          {new Date(lease.return_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {vehicleDossierTab === 'maint' && (
                <div className="space-y-6">
                  <div className="bg-[#0f172a] text-white p-5 rounded-2xl shadow-xl shadow-slate-200">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-4">Log New Service</h3>
                    <form onSubmit={handleLogMaintenance} className="space-y-3">
                      <input type="text" placeholder="e.g. Oil Change, New Tires" value={newMaintLog.description} onChange={(e) => setNewMaintLog({...newMaintLog, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Cost (KSh)" value={newMaintLog.cost} onChange={(e) => setNewMaintLog({...newMaintLog, cost: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
                        <input type="number" placeholder="Mileage (Optional)" value={newMaintLog.mileage} onChange={(e) => setNewMaintLog({...newMaintLog, mileage: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-2 transition">Save Record</button>
                    </form>
                  </div>
                  
                  <div className="space-y-3">
                    {carMaintenanceLogs.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-bold text-sm">No maintenance logged yet.</div>
                    ) : (
                      carMaintenanceLogs.map((log: any) => (
                        <div key={log.id} className="border-b border-slate-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-sm text-slate-900">{log.description}</p>
                            <span className="font-black text-slate-900">KSh {log.cost?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                            <span>{new Date(log.service_date).toLocaleDateString()}</span>
                            <span>{log.mileage_at_service?.toLocaleString()} km</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-none p-6 bg-white border-t border-slate-100 pb-safe">
              <button onClick={() => setSelectedCar(null)} className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-900 font-black rounded-xl hover:bg-slate-100 transition">
                Close Panel
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================
          CLIENT DOSSIER DRAWER
      ========================================= */}
      {selectedCustomer && (
        <>
          <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCustomer(null)}></div>
          <div className="fixed top-0 right-0 z-[100] h-screen w-full md:w-[450px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex-none flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCustomer.full_name}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {selectedCustomer.id_number}</p>
                <div className="flex gap-2 mt-3">
                  <a href={`tel:${selectedCustomer.phone}`} className="px-3 py-1.5 border border-blue-100 bg-white text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-blue-50 hover:border-blue-200 transition">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> Call
                  </a>
                  <button onClick={() => handleToggleBlacklist(selectedCustomer.id, selectedCustomer.full_name, !!selectedCustomer.is_blacklisted)} className={`px-3 py-1.5 border bg-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition ${selectedCustomer.is_blacklisted ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200'}`}>
                    {selectedCustomer.is_blacklisted ? 'Unblacklist' : 'Blacklist'}
                  </button>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Guarantor</p>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-900 text-sm">{selectedCustomer.alt_name || 'N/A'} <span className="text-slate-500 font-medium">({selectedCustomer.alt_relationship || 'Unknown'})</span></p>
                  {selectedCustomer.alt_phone && (
                    <a href={`tel:${selectedCustomer.alt_phone}`} className="text-xs font-bold text-blue-600 hover:underline">{selectedCustomer.alt_phone}</a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border-[1.5px] border-slate-200 p-4 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
                  <p className="text-xl font-black text-emerald-600">KSh {selectedCustomer.leases?.reduce((sum: number, l: any) => sum + (l.total_cost || 0), 0).toLocaleString()}</p>
                </div>
                <div className="border-[1.5px] border-slate-200 p-4 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Rentals</p>
                  <p className="text-xl font-black text-blue-600">{selectedCustomer.leases?.length || 0} <span className="text-sm font-bold">Trips</span></p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Cloud Document Vault</p>
                {/* eslint-disable @next/next/no-img-element */}
                <div className="border-[1.5px] border-slate-200 p-4 rounded-xl grid grid-cols-2 gap-3">
                  {selectedCustomer.id_front_url ? (
                    <img src={selectedCustomer.id_front_url} alt="ID Front" className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-[9px] font-bold text-slate-400">NO ID FRONT</div>
                  )}
                  {selectedCustomer.id_back_url ? (
                    <img src={selectedCustomer.id_back_url} alt="ID Back" className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-[9px] font-bold text-slate-400">NO ID BACK</div>
                  )}
                  {selectedCustomer.dl_front_url ? (
                    <img src={selectedCustomer.dl_front_url} alt="DL Front" className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-[9px] font-bold text-slate-400">NO DL FRONT</div>
                  )}
                  {selectedCustomer.dl_back_url ? (
                    <img src={selectedCustomer.dl_back_url} alt="DL Back" className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-[9px] font-bold text-slate-400">NO DL BACK</div>
                  )}
                </div>
                {/* eslint-enable @next/next/no-img-element */}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Rental Timeline</p>
                <div className="space-y-4">
                  {(!selectedCustomer.leases || selectedCustomer.leases.length === 0) ? (
                    <p className="text-sm text-slate-500 font-medium">No rentals on record.</p>
                  ) : (
                    selectedCustomer.leases.sort((a: any, b: any) => new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime()).map((lease: any) => (
                      <div key={lease.id} className="border-[1.5px] border-slate-200 p-4 rounded-xl relative">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-slate-900">{lease.cars?.make} {lease.cars?.model} <span className="text-slate-400 text-xs">({lease.cars?.plate})</span></p>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${lease.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{lease.status}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mb-4">{new Date(lease.pickup_date).toLocaleDateString()} &rarr; {new Date(lease.return_date).toLocaleDateString()}</p>
                        <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost</span>
                          <span className="font-black text-slate-900">KSh {lease.total_cost?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex-none p-6 bg-white border-t border-slate-100 pb-safe">
              <button onClick={() => setSelectedCustomer(null)} className="w-full bg-[#0f172a] hover:bg-black text-white font-bold py-4 rounded-xl text-sm transition">
                Close Dossier
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}