/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Review {
  author: string;
  date: string;
  avatar: string;
  text: string;
  stars: number;
}

export interface ParkingSpot {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  spotsLeft: number;
  totalSpots: number;
  type: 'garage' | 'driveway' | 'parking_lot';
  image: string;
  ratings: number;
  reviewCount: number;
  reviews: Review[];
  amenities: string[];
  description: string;
  lat: number;
  lng: number;
  hostName: string;
  hostAvatar: string;
  status: 'active' | 'inactive' | 'filling_fast' | 'available' | 'cheap';
  hostId?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  isElectric: boolean;
}

export interface Booking {
  id: string;
  spotId: string;
  spotName: string;
  startTime: string;
  vehiclePlate: string;
  locationDetails: string;
  pricePerHour: number;
  status: 'active' | 'completed' | 'pending';
  userId?: string;
  hostId?: string;
  durationHours?: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay';
  label: string;
  isDefault: boolean;
  expiry?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  verified: boolean;
  memberSince: string;
  vehicles: Vehicle[];
  paymentMethods: PaymentMethod[];
  savedPlaces: string[]; // ParkingSpot IDs
}

export interface HostProfile {
  totalEarnings: number;
  percentageChange: number;
  pendingBookings: number;
  listings: ParkingSpot[];
  bookings?: Booking[];
}
