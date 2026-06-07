/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParkingSpot, UserProfile, HostProfile, Vehicle, PaymentMethod } from './types';

export const INITIAL_PARKING_SPOTS: ParkingSpot[] = [
  {
    id: 'metro-park-indiranagar',
    name: 'Metro Park, Indiranagar',
    location: '12th Main Rd, Bangalore',
    pricePerHour: 50,
    spotsLeft: 12,
    totalSpots: 45,
    type: 'parking_lot',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaFSL_wT_XOEZKcV5oavURcO-wjoVPYKpXLsdMgUcgxJ8V8q743t3SU-DSB7dZFDKW3_JuIEzQmPCZmwIIGVuayxSau0NYFQgdqqGWzTq04awnioqRn8IpkH_sxCEx3E9R2Me4kwQVe9SaufId42Cq3X5B18lgsH5TNp5D_W93taQ46TrqEheECPGxQr0I4cUoa3-Wt46vgkZsshaNo5G5ASEgKzxhpvDLc844t-Mx8Q-6ZgKs7xZRu7uAYIkSrzcIHnSCYrCcLPg',
    ratings: 4.8,
    reviewCount: 124,
    reviews: [
      {
        author: 'Rahul S.',
        date: '2 days ago',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7zEf_g7ycMi6qtaPF6m93Tn3WpvbnhDQAhJ1BBQbVuLfMQxbrgabW9jYsNhnRpPwcGZD5z3OmfHzu59Txz2AgGYQkAe238PWqE7kAn5pFLf_tUhTu4Z0p82oX2MgNAnxqpSrnNTKgmWBwGZkfe6fZA84wt5owBG_YRsa34miBkXQFEZ2dlOkX5QVkWUd1QYV-w5tky8YKeH_DXhefopZcveYa33nxWT-N8lpnoGzTPoXQQx0psAw1qNJubKNOZve765K39Ql7wWQ',
        text: 'Best spot in Indiranagar. Extremely easy entry and exit. The EV charging points are high-speed and well maintained.',
        stars: 5,
      },
      {
        author: 'Ananya K.',
        date: '1 week ago',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWQmc7tiPwSSIS9_FN6p0WKlaDdBFkl3KdPh4gkdZrkPz4R-kV6qVaEKefio0LEn_IjCjprfoM0JhjjRf5vxxgObKw1X2uBLSWOO1PmYH44oOwTORvN6PqRt4kqxpiyK5i3NTV1Tk7QR6aU8X_Ju5F7WVY-rQLsuHTCqQtc1o481Fjh4KfAr7DdUKnsNDO-WLgpYld5BTvkiqvWOJjZuO8v_ahLfzRXHHAmSuZHzx3SAZYKMOM_btpUNPtBdi8Xch9hF603RPX5LI',
        text: 'The security guards are very helpful with guiding you to vacant spots. A bit tight for larger SUVs but doable.',
        stars: 4,
      }
    ],
    amenities: ['CCTV 24/7', 'EV Charging', 'Covered', 'Accessible'],
    description: 'Centrally located multi-level parking facility offering premium security and easy access to the Indiranagar shopping district. Featuring dedicated spots for SUVs and electric vehicle charging stations on the ground level.',
    lat: 12.9716,
    lng: 77.6412,
    hostName: 'Indiranagar Plaza Management',
    hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC562pwoOSdkgKBi-XYNKeHsh9q0o2wseYr249wvoLpE-ftrFAnrkPpDEQtcUUg1z-IRzVgnU1nPWgHj2UxJnfHFEuuNh6ZpTe0mLqVOuj0KFewhaehtXd2EzVkl1PY706lPJ9Zqfl0e_2QwfxdzuhayO0aDQnxbJ_28uk0L00C9r2mVgh8_pWBzySl4wCZmUB3d6bfINCyDa9_f3rLix2JdiL0wUO-WyGCZZnLsS7P1--8eMQC_E_WZkUly_suaHjqIuPPlEqVJf0',
    status: 'filling_fast'
  },
  {
    id: 'nexus-mall',
    name: 'Nexus Mall',
    location: 'Koramangala, Bangalore',
    pricePerHour: 40,
    spotsLeft: 28,
    totalSpots: 80,
    type: 'garage',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPonyVV-S74yT3bBHnmKJnhZa3kW9BVPSOoNpNReB9OhSqeVLpvUD9eqgdtSIYSaGd8PbReyzUfX7CUs7qVz2rRTrkblY4pjXqCGZsoAqIKPZdaR7VgFnJ3VPgEjF3VIdx96zoBV_BAkwy2JCuLDF3M9BGXIjw19B-aWqKV_5TYo477W7SKpyQakUUWLo3Fta7AunhhsKDepzj6fZT8G3sDj9w0MoJwjAh2wg-5-xBCfOcZLOM76HqTEY0NijdHGwaqMgTLwAt7dk',
    ratings: 4.8,
    reviewCount: 340,
    reviews: [
      {
        author: 'Karan M.',
        date: '3 days ago',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7zEf_g7ycMi6qtaPF6m93Tn3WpvbnhDQAhJ1BBQbVuLfMQxbrgabW9jYsNhnRpPwcGZD5z3OmfHzu59Txz2AgGYQkAe238PWqE7kAn5pFLf_tUhTu4Z0p82oX2MgNAnxqpSrnNTKgmWBwGZkfe6fZA84wt5owBG_YRsa34miBkXQFEZ2dlOkX5QVkWUd1QYV-w5tky8YKeH_DXhefopZcveYa33nxWT-N8lpnoGzTPoXQQx0psAw1qNJubKNOZve765K39Ql7wWQ',
        text: 'Great indoor parking. Automated sensor payment is flawless. High quality lighting.',
        stars: 5,
      }
    ],
    amenities: ['CCTV 24/7', 'Covered', 'Automated Entry'],
    description: 'State of the art automated basement parking garage below Nexus Mall. Easy entrance ramps, fully covered, and high reliability.',
    lat: 12.9344,
    lng: 77.6192,
    hostName: 'Nexus Retail Co.',
    hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk4E7SW-DTwIfcnxNw0lkMwUuos_7o95LNDj5caxzzecWpWtGYdXT97ipb46uNmKBhix1UHuOY6EqQzZg33iwXmw6JIr3u2BMoo4STIBy5FVwlbNiLLholYIp6aUZNTnsWQQh7VrayM6-uKlzNL2Q5QR43IABkQaYEpV-fR-16EL9lffdZM2zJB7jwkyogw9vVHoOJ1hYmAkFGZ9yen_OgWK42JwNt-wi9F9VGsUKGhvnSqa3jNQ0e4KwLQNqQNf5HV8VAdTqPFV0',
    status: 'available'
  },
  {
    id: 'sony-hub',
    name: 'Sony Hub Parking',
    location: '100 Feet Rd, Koramangala',
    pricePerHour: 30,
    spotsLeft: 8,
    totalSpots: 50,
    type: 'parking_lot',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_ohlUvpPvvR42UYLr77qzOXNuZ0ukXjEksBe1OMr3mnfFtR3bvg2ChEpt59dP_lEdU4q8dzzlSUhL2jUU4zassmnxdr49mFyP86yVq09THOYtFlKV98DkCmnTonptVb7s9oD4sJi1G83NajwJLJmL7oMamY6qq1sllTMf3J-smRRJjcO1JsKyl3ARpDPZEQ9v4-qIDnr513SKFBdtPDWWWrNWq3yCrxI2U3VTYRW1P2yj0KjyapsmyN7R6lWLrFt27FDVMpAdQc0',
    ratings: 4.2,
    reviewCount: 92,
    reviews: [
      {
        author: 'Pooja R.',
        date: '5 days ago',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWQmc7tiPwSSIS9_FN6p0WKlaDdBFkl3KdPh4gkdZrkPz4R-kV6qVaEKefio0LEn_IjCjprfoM0JhjjRf5vxxgObKw1X2uBLSWOO1PmYH44oOwTORvN6PqRt4kqxpiyK5i3NTV1Tk7QR6aU8X_Ju5F7WVY-rQLsuHTCqQtc1o481Fjh4KfAr7DdUKnsNDO-WLgpYld5BTvkiqvWOJjZuO8v_ahLfzRXHHAmSuZHzx3SAZYKMOM_btpUNPtBdi8Xch9hF603RPX5LI',
        text: 'Quite affordable and well sized slots. No covered parking, but helpful security staff.',
        stars: 4,
      }
    ],
    amenities: ['CCTV 24/7', 'Easy Exit'],
    description: 'Sizable open-air lot situated right at the major Koramangala Sony Signal junction. Premium convenience for quick stops at nearby restaurants.',
    lat: 12.9366,
    lng: 77.6255,
    hostName: 'Sony Hub Land Trust',
    hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC562pwoOSdkgKBi-XYNKeHsh9q0o2wseYr249wvoLpE-ftrFAnrkPpDEQtcUUg1z-IRzVgnU1nPWgHj2UxJnfHFEuuNh6ZpTe0mLqVOuj0KFewhaehtXd2EzVkl1PY706lPJ9Zqfl0e_2QwfxdzuhayO0aDQnxbJ_28uk0L00C9r2mVgh8_pWBzySl4wCZmUB3d6bfINCyDa9_f3rLix2JdiL0wUO-WyGCZZnLsS7P1--8eMQC_E_WZkUly_suaHjqIuPPlEqVJf0',
    status: 'cheap'
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Alex Harrison',
  email: 'alex.harrison@urbanmail.com',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ',
  verified: true,
  memberSince: '2022',
  vehicles: [
    { id: 'v1', model: 'Tesla Model 3', plate: 'KA-01-MG-1234', isElectric: true },
    { id: 'v2', model: 'BMW i4 M50', plate: 'KA-03-MY-8888', isElectric: true }
  ],
  paymentMethods: [
    { id: 'p1', type: 'card', label: '•••• 8829', isDefault: true, expiry: '09/26' },
    { id: 'p2', type: 'apple_pay', label: 'Apple Pay', isDefault: false }
  ],
  savedPlaces: ['metro-park-indiranagar']
};

export const INITIAL_HOST_PROFILE: HostProfile = {
  totalEarnings: 42850,
  percentageChange: 12,
  pendingBookings: 8,
  listings: [
    {
      id: 'host-garage-1',
      name: 'Home Garage - Indiranagar',
      location: '12th Main, 4th Block, Indiranagar',
      pricePerHour: 150,
      spotsLeft: 1,
      totalSpots: 1,
      type: 'garage',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtRLl077oYdU1fuhltFImo957FylFBZoO2gLA5P2uBqZAF8UjuQ3KMVh0ZihhcKUmj4VNIeSXHQW_aQMFNLIGU4ruICXb_ZNO_ooVtjq0SvdvY7bfjPExd9AfMuW0j4ROzlZL8ff3aQQ-pv3QQbfpMtoCo0oUCoyJHNWj1EdztKCi3CCVGA4_Fmb8Ek3wkTQe98huwyZtKyNpxDqGloAA2Q_dQXlSNqmWFlFEVfMQQtC8guZDJUp3bS-THPhmLx39b-TvlUUNVTNA',
      ratings: 4.9,
      reviewCount: 128,
      reviews: [],
      amenities: ['Covered', 'CCTV 24/7'],
      description: 'Fully protected single-car garage of my personal home in Indiranagar. Extremely secure and lockable.',
      lat: 12.972,
      lng: 77.642,
      hostName: 'Alex Harrison',
      hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ',
      status: 'active'
    },
    {
      id: 'host-driveway-1',
      name: 'Driveway - Koramangala',
      location: 'Koramangala 3rd Block',
      pricePerHour: 80,
      spotsLeft: 1,
      totalSpots: 1,
      type: 'driveway',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_IWiy_SILPKHxY2NQ0ieKROXjGaNGv1ANKngE0uLynhQ3c-H75Ey6RRQsw6T52Cct8TNBTANV4o5pzL92AcnAmVBR3eEwX5W0A9Mv1qZzjJ-iIO49D_rWqKa1uIOi9rdXoMJad33jnz4ePu5EL9f3dtCfMszLHR6GlkDvNB_udjrVyA19fgOKdDrsY4LXZJzQMPbMZWNv7GReFTdsedNwXuPYIgODvIV3Rr4SfwCGK-UlzlhsHxBs5npQlEUmw62cXgSVBbPfTMk',
      ratings: 4.7,
      reviewCount: 45,
      reviews: [],
      amenities: ['CCTV 24/7', 'Electric gate access'],
      description: 'Paved, clean driveway area in high-end Koramangala 3rd Block. Perfect for long or short parking sessions.',
      lat: 12.933,
      lng: 77.62,
      hostName: 'Alex Harrison',
      hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ',
      status: 'active'
    }
  ]
};
