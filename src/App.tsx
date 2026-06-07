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
import DriveBackupCenter from './components/DriveBackupCenter';

// Firebase imports
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  db,
  auth,
  initAuth,
  googleSignIn,
  handleFirestoreError,
  OperationType
} from './firebase';

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
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showDriveBackup, setShowDriveBackup] = useState(false);

  // Firestore metadata for hosts
  const [hostMeta, setHostMeta] = useState({
    totalEarnings: 42850,
    percentageChange: 12,
    pendingBookings: 8,
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Computed Host Profile
  const hostProfile: HostProfile = {
    ...hostMeta,
    listings: spots.filter((s) => s.hostId === (auth.currentUser?.uid || 'system_host')),
  };

  // Google authentication session setup & dynamic profile syncing
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const unsubscribe = initAuth(
      async (currentUser) => {
        setFirebaseUser(currentUser);
        // Load user profile from Firebase
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser(userSnap.data() as UserProfile);
            setCurrentScreen((prev) => (prev === 'splash' || prev === 'onboarding' ? 'driver_discovery' : prev));
          } else {
            // Seed a new Firestore profile from Google Account info and standard presets
            const newProfile: UserProfile = {
              name: currentUser.displayName || 'Alex Harrison',
              email: currentUser.email || 'alex@urbanmail.com',
              avatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              verified: true,
              memberSince: new Date().getFullYear().toString(),
              vehicles: [
                { id: 'v1', model: 'Tesla Model 3', plate: 'KA-01-MG-1234', isElectric: true }
              ],
              paymentMethods: [
                { id: 'p1', type: 'card', label: '•••• 8829', isDefault: true, expiry: '09/26' },
                { id: 'p2', type: 'apple_pay', label: 'Apple Pay', isDefault: false }
              ],
              savedPlaces: ['metro-park-indiranagar']
            };
            await setDoc(userRef, newProfile);
            setUser(newProfile);
            setCurrentScreen((prev) => (prev === 'splash' || prev === 'onboarding' ? 'driver_discovery' : prev));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      },
      () => {
        setFirebaseUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of parking spots
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'parkingSpots'),
      async (snapshot) => {
        if (snapshot.empty) {
          // Set initial fallback spots in case we are seeding or seeding fails
          setSpots(INITIAL_PARKING_SPOTS);
          // Seed Firestore with original sample spots if database is fresh
          try {
            const batch = writeBatch(db);
            INITIAL_PARKING_SPOTS.forEach((spot) => {
              const spotRef = doc(db, 'parkingSpots', spot.id);
              batch.set(spotRef, { ...spot, hostId: 'system_host' });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('Error seeding parking spots list:', seedErr);
          }
        } else {
          const parsedSpots: ParkingSpot[] = [];
          snapshot.forEach((doc) => {
            parsedSpots.push(doc.data() as ParkingSpot);
          });
          setSpots(parsedSpots);
        }
      },
      (error) => {
        console.warn('Firestore subscription failed, falling back to local spots:', error);
        setSpots(INITIAL_PARKING_SPOTS);
        handleFirestoreError(error, OperationType.LIST, 'parkingSpots');
      }
    );
    return () => unsub();
  }, []);

  // Real-time synchronization of active booking reservations
  useEffect(() => {
    if (!firebaseUser) {
      setActiveBooking(null);
      return;
    }
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', firebaseUser.uid),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          setActiveBooking(snapshot.docs[0].data() as Booking);
        } else {
          setActiveBooking(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // Handle direct file imports & recovery operations from Google Drive
  const handleRestoreUser = async (restored: UserProfile) => {
    setUser(restored);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), restored);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handleRestoreHost = async (restoredHost: HostProfile) => {
    setHostMeta({
      totalEarnings: restoredHost.totalEarnings,
      percentageChange: restoredHost.percentageChange,
      pendingBookings: restoredHost.pendingBookings,
    });
    if (auth.currentUser) {
      try {
        const batch = writeBatch(db);
        restoredHost.listings.forEach((spot) => {
          const spotRef = doc(db, 'parkingSpots', spot.id);
          batch.set(spotRef, {
            ...spot,
            hostId: auth.currentUser?.uid || 'system_host',
          });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'batch/parkingSpots');
      }
    }
  };

  const handleCreateProfileOnboarding = async (data: { name: string; phone: string; plate: string }) => {
    const updatedUser: UserProfile = {
      ...user,
      name: data.name,
      email: auth.currentUser?.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@urbanmail.com`,
      avatar: auth.currentUser?.photoURL || user.avatar,
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
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }
    setCurrentScreen('driver_discovery');
  };

  const handleAddVehicle = async (newVehicle: Vehicle) => {
    const updatedUser = {
      ...user,
      vehicles: [...user.vehicles, newVehicle],
    };
    setUser(updatedUser);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handlePublishNewSpace = async (newSpot: ParkingSpot) => {
    const spotWithHost: ParkingSpot = {
      ...newSpot,
      hostId: auth.currentUser?.uid || 'system_host',
      hostName: auth.currentUser?.displayName || newSpot.hostName,
      hostAvatar: auth.currentUser?.photoURL || newSpot.hostAvatar,
    };

    try {
      await setDoc(doc(db, 'parkingSpots', newSpot.id), spotWithHost);
      setCurrentScreen('host_hub_dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `parkingSpots/${newSpot.id}`);
    }
  };

  const handleToggleListingStatus = async (spotId: string) => {
    const curSpot = spots.find((s) => s.id === spotId);
    if (!curSpot) return;
    const nextStatus = curSpot.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'parkingSpots', spotId), { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parkingSpots/${spotId}`);
    }
  };

  const handleReserveSpot = async (spot: ParkingSpot, totalRate: number, durationHours: number = 3) => {
    const hostPlate = user.vehicles[0]?.plate || 'KA-01-MG-1234';
    const bookingId = `booking-${Date.now()}`;
    const newBooking: Booking = {
      id: bookingId,
      spotId: spot.id,
      spotName: spot.name,
      startTime: new Date().toISOString(),
      vehiclePlate: hostPlate,
      locationDetails: spot.location,
      pricePerHour: spot.pricePerHour,
      status: 'active',
      userId: auth.currentUser?.uid || 'guest_user',
      hostId: spot.hostId || 'system_host',
      durationHours: durationHours,
    };

    try {
      await setDoc(doc(db, 'bookings', bookingId), newBooking);
      await updateDoc(doc(db, 'parkingSpots', spot.id), {
        spotsLeft: Math.max(0, spot.spotsLeft - 1),
      });
      setActiveBooking(newBooking);
      setCurrentScreen('active_session_pass');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `bookings/${bookingId}`);
    }
  };

  const handleEndBookingSession = async () => {
    if (activeBooking) {
      try {
        await updateDoc(doc(db, 'bookings', activeBooking.id), { status: 'completed' });
        alert(
          `Successfully completed active parking reservation pass at ${activeBooking.spotName}! Thank you for choosing Parkzone services.`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${activeBooking.id}`);
      }
    }
    setActiveBooking(null);
    setCurrentScreen('driver_discovery');
  };

  const handleToggleSavedPlace = async (spotId: string) => {
    const isSaved = user.savedPlaces.includes(spotId);
    const updatedPlaces = isSaved
      ? user.savedPlaces.filter((id) => id !== spotId)
      : [...user.savedPlaces, spotId];

    const updatedUser = {
      ...user,
      savedPlaces: updatedPlaces,
    };

    setUser(updatedUser);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handleUpdateAvatar = async (newUrl: string) => {
    const updatedUser = {
      ...user,
      avatar: newUrl,
    };
    setUser(updatedUser);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
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
          onGoogleSignIn={googleSignIn}
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
              alert(
                'You do not have any active booking sessions at the moment! Search near Indiranagar below to book one.'
              );
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
          onOpenDriveBackup={() => setShowDriveBackup(true)}
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
          onOpenDriveBackup={() => setShowDriveBackup(true)}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      {showDriveBackup && (
        <DriveBackupCenter
          userProfile={user}
          hostProfile={hostProfile}
          onRestoreUser={handleRestoreUser}
          onRestoreHost={handleRestoreHost}
          onClose={() => setShowDriveBackup(false)}
        />
      )}
    </div>
  );
}
