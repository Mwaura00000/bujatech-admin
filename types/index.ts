export interface Car {
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

export interface LeaseRecord {
  id: string;
  car_id: string;
  pickup_date: string;
  return_date: string;
  destination: string;
  purpose: string;
  total_cost: number;
  balance_due: number;
  status: string;
  cars: { id: string; make: string; model: string; plate: string };
  customers: { full_name: string; phone: string };
}

export interface CustomerRecord {
  id: string; 
  full_name: string; 
  phone: string; 
  id_number: string;
  alt_name: string; 
  alt_phone: string; 
  alt_id: string;
  alt_relationship: string;
  is_blacklisted?: boolean;
  id_front_url?: string;
  id_back_url?: string;
  dl_front_url?: string;
  dl_back_url?: string;
}

export interface MaintenanceLogRecord {
  id: string;
  service_date: string;
  description: string;
  cost: number;
  mileage_at_service: number;
}