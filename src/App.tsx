/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParkingSpot, UserProfile, HostProfile, Booking, Vehicle } from './types';
import {
  INITIAL_PARKING_SPOTS,
  INITIAL_USER_PROFILE,
  INITIAL_HOST_PROFILE,
} from './data';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import HostWelcome from './components/HostWelcome';
import ListSpaceWizard from './components/ListSpaceWizard';
import DriverDiscovery from './components/DriverDiscovery';
import SpotDetails from './components/SpotDetails';
import ActiveSessionPass from './components/ActiveSessionPass';
import HostHubDashboard from './components/HostHubDashboard';
import DriverProfile from './components/DriverProfile';

type ScreenType =
  | 'splash'
  | 'onboarding'
  | 'host_welcome'
  | 'list_space_wizard'
  | 'driver_discovery'
  | 'spot_details'
  | 'active_session_pass'
  | 'host_hub_dashboard'
  | 'driver_profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [spots, setSpots] = useState<ParkingSpot[]>(INITIAL_PARKING_SPOTS);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [hostProfile, setHostProfile] = useState<HostProfile>(INITIAL_HOST_PROFILE);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  // Synchronize dynamic listing state changes inside Host & Driver spot registries
  useEffect(() => {
    // Add default host listings inside general spots list on startup if not already there
    const combined = [...spots];
    hostProfile.listings.forEach((hostSpot) => {
      if (!combined.some((s) => s.id === hostSpot.id)) {
        combined.push(hostSpot);
      }
    });
    if (combined.length !== spots.length) {
      setSpots(combined);
    }
  }, [hostProfile.listings]);

  const handleCreateProfileOnboarding = (data: { name: string; phone: string; plate: string }) => {
    const updatedUser: UserProfile = {
      ...user,
      name: data.name,
      email: `${data.name.toLowerCase().replace(/\s+/g, '.')}@urbanmail.com`,
      vehicles: [
        {
          id: `v-${Date.now()}`,
          model: 'Tesla Model 3',
          plate: data.plate.toUpperCase(),
          isElectric: true,
        },
        ...user.vehicles,
      ],
    };
    setUser(updatedUser);
    setCurrentScreen('driver_discovery');
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setUser((prevUser) => ({
      ...prevUser,
      vehicles: [...prevUser.vehicles, newVehicle],
    }));
  };

  const handlePublishNewSpace = (newSpot: ParkingSpot) => {
    // 1. Add to host listings
    setHostProfile((prev) => ({
      ...prev,
      listings: [newSpot, ...prev.listings],
    }));
    // 2. Add to active parking spots map
    setSpots((prevSpots) => [newSpot, ...prevSpots]);
    // 3. Return to Host dashboard overview
    setCurrentScreen('host_hub_dashboard');
  };

  const handleToggleListingStatus = (spotId: string) => {
    setHostProfile((prev) => ({
      ...prev,
      listings: prev.listings.map((spot) =>
        spot.id === spotId
          ? { ...spot, status: spot.status === 'active' ? 'inactive' : 'active' }
          : spot
      ),
    }));

    setSpots((prev) =>
      prev.map((spot) =>
        spot.id === spotId
          ? { ...spot, status: spot.status === 'active' ? 'inactive' : 'active' }
          : spot
      )
    );
  };

  const handleReserveSpot = (spot: ParkingSpot, totalRate: number) => {
    // Active primary plate fallback for entry pass
    const hostPlate = user.vehicles[0]?.plate || 'KA-01-MG-1234';
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      spotId: spot.id,
      spotName: spot.name,
      startTime: new Date().toISOString(),
      vehiclePlate: hostPlate,
      locationDetails: spot.location,
      pricePerHour: spot.pricePerHour,
      status: 'active',
    };

    setActiveBooking(newBooking);
    setCurrentScreen('active_session_pass');
  };

  const handleEndBookingSession = () => {
    if (activeBooking) {
      alert(`Successfully completed active parking reservation pass at ${activeBooking.spotName}! Thank you for choosing Parkit services.`);
    }
    setActiveBooking(null);
    setCurrentScreen('driver_discovery');
  };

  const handleToggleSavedPlace = (spotId: string) => {
    setUser((prevUser) => {
      const isSaved = prevUser.savedPlaces.includes(spotId);
      const updated = isSaved
        ? prevUser.savedPlaces.filter((id) => id !== spotId)
        : [...prevUser.savedPlaces, spotId];
      return {
        ...prevUser,
        savedPlaces: updated,
      };
    });
  };

  const handleLogout = () => {
    setUser(INITIAL_USER_PROFILE);
    setActiveBooking(null);
    setCurrentScreen('splash');
  };

  return (
    <div className="min-h-screen bg-[#050508]">
      {currentScreen === 'splash' && (
        <Splash
          onFindParking={() => setCurrentScreen('driver_discovery')}
          onLogin={() => setCurrentScreen('onboarding')}
          onCreateAccount={() => setCurrentScreen('onboarding')}
          onExplore={() => setCurrentScreen('driver_discovery')}
          onBeHost={() => setCurrentScreen('host_welcome')}
        />
      )}

      {currentScreen === 'onboarding' && (
        <Onboarding
          onBack={() => setCurrentScreen('splash')}
          onSubmit={handleCreateProfileOnboarding}
        />
      )}

      {currentScreen === 'host_welcome' && (
        <HostWelcome
          onBack={() => setCurrentScreen('splash')}
          onListSpace={() => setCurrentScreen('list_space_wizard')}
          onMaybeLater={() => setCurrentScreen('driver_discovery')}
        />
      )}

      {currentScreen === 'list_space_wizard' && (
        <ListSpaceWizard
          onBack={() => setCurrentScreen('host_welcome')}
          onPublish={handlePublishNewSpace}
        />
      )}

      {currentScreen === 'driver_discovery' && (
        <DriverDiscovery
          user={user}
          spots={spots}
          onSelectSpot={(spot) => {
            setSelectedSpot(spot);
            setCurrentScreen('spot_details');
          }}
          onOpenProfile={() => setCurrentScreen('driver_profile')}
          onOpenBookings={() => {
            if (activeBooking) {
              setCurrentScreen('active_session_pass');
            } else {
              alert('You do not have any active booking sessions at the moment! Search near Indiranagar below to book one.');
            }
          }}
          activeSessionId={activeBooking ? activeBooking.id : null}
        />
      )}

      {currentScreen === 'spot_details' && selectedSpot && (
        <SpotDetails
          spot={selectedSpot}
          onBack={() => setCurrentScreen('driver_discovery')}
          onReserve={handleReserveSpot}
          isSaved={user.savedPlaces.includes(selectedSpot.id)}
          onToggleSaved={handleToggleSavedPlace}
        />
      )}

      {currentScreen === 'active_session_pass' && activeBooking && (
        <ActiveSessionPass
          user={user}
          booking={activeBooking}
          onEndSession={handleEndBookingSession}
          onOpenFind={() => setCurrentScreen('driver_discovery')}
          onOpenProfile={() => setCurrentScreen('driver_profile')}
        />
      )}

      {currentScreen === 'host_hub_dashboard' && (
        <HostHubDashboard
          hostProfile={hostProfile}
          onListNewSpace={() => setCurrentScreen('list_space_wizard')}
          onToggleListingStatus={handleToggleListingStatus}
          onBackToDriver={() => setCurrentScreen('driver_discovery')}
        />
      )}

      {currentScreen === 'driver_profile' && (
        <DriverProfile
          user={user}
          onAddVehicle={handleAddVehicle}
          onBackToFind={() => setCurrentScreen('driver_discovery')}
          onBackToBookings={() => {
            if (activeBooking) {
              setCurrentScreen('active_session_pass');
            } else {
              alert('You do not have any active booking sessions. Find a parking spot near Indiranagar first!');
              setCurrentScreen('driver_discovery');
            }
          }}
          onBecomeHost={() => setCurrentScreen('host_hub_dashboard')}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
