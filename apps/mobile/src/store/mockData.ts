import { Category, Listing } from "../types/api"

export interface CategoryWithListings extends Category {
  listings: Listing[]
}

export const MOCK_CATEGORIES: CategoryWithListings[] = [
  {
    id: "cat-cleaning",
    name: "Cleaning",
    slug: "cleaning",
    sortOrder: 1,
    isActive: true,
    listings: [
      {
        id: "listing-floor-cleaning",
        name: "Floor Cleaning & Polishing",
        slug: "floor-cleaning",
        description: "Professional deep cleaning, scrubbing, and polishing of all floor types to remove deep stains and restore shine.",
        shortDescription: "Deep scrubbing, stain removal & polishing",
        basePrice: "599",
        duration: 90,
        tags: ["Floor", "Polishing", "Scrubbing"],
        image: "floor.png",
        images: ["floor.png", "roomclieaning.png"],
        catalogs: [
          {
            id: "cat-floor-cleaning-std",
            name: "Standard Floor Scrubbing (up to 2 BHK)",
            price: "899",
            discountedPrice: "599",
            unit: "sq ft",
            minQuantity: 1,
            maxQuantity: 5,
            stepQuantity: 1
          }
        ],
        addOns: [
          {
            id: "floor-add-1",
            name: "Balcony Floor Deep Clean",
            price: "199"
          }
        ]
      },
      {
        id: "listing-bathroom-cleaning",
        name: "Bathroom Deep Cleaning",
        slug: "bathroom-cleaning",
        description: "Tackle tough water stains, descale chrome fixtures, sanitize toilet bowl & tiles, and deep clean windows & ventilation exhaust.",
        shortDescription: "Descaling, tiles scrubbing & disinfection",
        basePrice: "499",
        duration: 75,
        tags: ["Bathroom", "Sanitization", "Descaling"],
        image: "bathroom.png",
        images: ["bathroom.png", "toiletcleaning.png"],
        catalogs: [
          {
            id: "cat-bathroom-cleaning-1",
            name: "1 Bathroom Deep Cleaning",
            price: "699",
            discountedPrice: "499",
            unit: "room",
            minQuantity: 1,
            maxQuantity: 4,
            stepQuantity: 1
          }
        ],
        addOns: [
          {
            id: "bathroom-add-1",
            name: "Anti-fog Mirror Treatment",
            price: "79"
          }
        ]
      },
      {
        id: "listing-cupboard-cleaning",
        name: "Cupboard & Organising",
        slug: "cupboard-cleaning",
        description: "Thorough dusting of shelves, cabinet wiping, and neat organization of clothes, linen, or kitchen pantry items.",
        shortDescription: "Organize shelves, dust and wipe cabinets",
        basePrice: "399",
        duration: 60,
        tags: ["Cupboard", "Organization", "Dusting"],
        image: "cupboard-cleaning.png",
        images: ["cupboard-cleaning.png", "roomclieaning.png"],
        catalogs: [
          {
            id: "cat-cupboard-cleaning-std",
            name: "3 Door Wardrobe Cleaning",
            price: "599",
            discountedPrice: "399",
            unit: "wardrobe",
            minQuantity: 1,
            maxQuantity: 3,
            stepQuantity: 1
          }
        ],
        addOns: [
          {
            id: "cupboard-add-1",
            name: "Scented drawer liners",
            price: "49"
          }
        ]
      },
      {
        id: "listing-utensils-cleaning",
        name: "Utensils & Sink Scrubbing",
        slug: "utensils-cleaning",
        description: "Scrubbing and washing of all kitchen utensils, pots, and pans, along with deep cleaning and sanitization of the sink area.",
        shortDescription: "Wash, scrub & sanitize sink area",
        basePrice: "299",
        duration: 45,
        tags: ["Kitchen", "Utensils", "Dishes"],
        image: "utensils.png",
        images: ["utensils.png", "roomclieaning.png"],
        catalogs: [
          {
            id: "cat-utensils-cleaning-std",
            name: "Daily Sink Washing (Up to 30 utensils)",
            price: "399",
            discountedPrice: "299",
            unit: "load",
            minQuantity: 1,
            maxQuantity: 5,
            stepQuantity: 1
          }
        ],
        addOns: [
          {
            id: "utensils-add-1",
            name: "Exotic Cookware Polishing",
            price: "99"
          }
        ]
      },
      {
        id: "listing-deep-home-cleaning",
        name: "Deep Home Cleaning",
        slug: "deep-home-cleaning",
        description: "Full house deep cleaning including bedrooms, bathrooms, kitchen, living area, windows, and floors.",
        shortDescription: "Complete deep cleaning for your entire house",
        basePrice: "1899",
        duration: 240,
        tags: ["Full House", "Deep Clean", "Sanitization"],
        image: "roomclieaning.png",
        images: ["roomclieaning.png"],
        catalogs: [
          {
            id: "cat-deep-home-1bhk",
            name: "1 BHK Deep Cleaning",
            price: "2499",
            discountedPrice: "1899",
            unit: "service",
            minQuantity: 1,
            maxQuantity: 2,
            stepQuantity: 1
          }
        ],
        addOns: []
      }
    ]
  },
  {
    id: "cat-plumbing",
    name: "Plumbing",
    slug: "plumbing",
    sortOrder: 2,
    isActive: true,
    listings: [
      {
        id: "listing-tap-repair",
        name: "Tap Repair & Leakage Fix",
        slug: "tap-repair",
        description: "Fixing leaking faucets, replacement of tap spindles, or installation of new taps and bathroom fixtures.",
        shortDescription: "Fix dripping taps & new installations",
        basePrice: "149",
        duration: 30,
        tags: ["Plumbing", "Tap Repair", "Leakage"],
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-tap-repair-std",
            name: "Standard Tap Repair / Replacement",
            price: "199",
            discountedPrice: "149",
            unit: "tap",
            minQuantity: 1,
            maxQuantity: 10,
            stepQuantity: 1
          }
        ],
        addOns: []
      },
      {
        id: "listing-toilet-blockage",
        name: "Toilet Blockage Removal",
        slug: "toilet-blockage",
        description: "Removal of toilet, sink, or shower drain clogs using specialized plumbing tools and chemicals.",
        shortDescription: "Clear clogged toilet bowls, sinks and drains",
        basePrice: "299",
        duration: 45,
        tags: ["Plumbing", "Blockage", "Drainage"],
        image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-toilet-blockage-std",
            name: "Standard Drain Blockage Removal",
            price: "399",
            discountedPrice: "299",
            unit: "drain",
            minQuantity: 1,
            maxQuantity: 3,
            stepQuantity: 1
          }
        ],
        addOns: []
      }
    ]
  },
  {
    id: "cat-electrical",
    name: "Electrical",
    slug: "electrical",
    sortOrder: 3,
    isActive: true,
    listings: [
      {
        id: "listing-switchboard-repair",
        name: "Switchboard Installation & Repair",
        slug: "switchboard-repair",
        description: "Complete diagnostic and repair of broken switches, wiring problems, or replacement with a brand new modular switchboard.",
        shortDescription: "Fix broken switches, sockets & modular plates",
        basePrice: "99",
        duration: 30,
        tags: ["Electrical", "Switchboard", "Repair"],
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-switch-repair-std",
            name: "Single Switch / Socket Diagnostic & Fix",
            price: "149",
            discountedPrice: "99",
            unit: "item",
            minQuantity: 1,
            maxQuantity: 20,
            stepQuantity: 1
          }
        ],
        addOns: []
      },
      {
        id: "listing-ac-filter-service",
        name: "AC Service & Jet Wash",
        slug: "ac-filter-service",
        description: "Jet pressure water wash for AC indoor/outdoor units, clean filter screens, inspect coolant levels, and fix coil leakages.",
        shortDescription: "Premium AC cleaning, cooling fix & filter wash",
        basePrice: "499",
        duration: 60,
        tags: ["AC", "Service", "Cooling"],
        image: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1527689368864-3a821dbccc34?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-ac-jet-wash-split",
            name: "Split AC Jet Service",
            price: "699",
            discountedPrice: "499",
            unit: "unit",
            minQuantity: 1,
            maxQuantity: 5,
            stepQuantity: 1
          }
        ],
        addOns: []
      }
    ]
  },
  {
    id: "cat-painting",
    name: "Painting",
    slug: "painting",
    sortOrder: 4,
    isActive: true,
    listings: [
      {
        id: "listing-accent-painting",
        name: "Accent Wall Painting",
        slug: "accent-painting",
        description: "Transform your bedroom or living room with a premium accent wall. Includes masking, wall prep, sanding, and two coats of premium paint.",
        shortDescription: "Transform your space with a custom accent wall",
        basePrice: "1999",
        duration: 180,
        tags: ["Painting", "Wall Accent", "Decor"],
        image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-painting-accent-std",
            name: "Standard Accent Wall (up to 120 sq ft)",
            price: "2499",
            discountedPrice: "1999",
            unit: "wall",
            minQuantity: 1,
            maxQuantity: 3,
            stepQuantity: 1
          }
        ],
        addOns: []
      }
    ]
  },
  {
    id: "cat-appliance-repair",
    name: "Appliance Repair",
    slug: "appliance-repair",
    sortOrder: 5,
    isActive: true,
    listings: [
      {
        id: "listing-washing-machine",
        name: "Washing Machine Repair",
        slug: "washing-machine-repair",
        description: "Diagnose spin issues, drainage issues, excessive vibration or drum failures in both front-load and top-load washing machines.",
        shortDescription: "Fix spin errors, drainage clogs & drum noise",
        basePrice: "399",
        duration: 90,
        tags: ["Appliance", "Washing Machine", "Repair"],
        image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=350&auto=format&fit=crop",
        images: ["https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=800&auto=format&fit=crop"],
        catalogs: [
          {
            id: "cat-wm-visit-diagnostic",
            name: "Diagnostics & Inspection Visit",
            price: "499",
            discountedPrice: "399",
            unit: "visit",
            minQuantity: 1,
            maxQuantity: 1,
            stepQuantity: 1
          }
        ],
        addOns: []
      }
    ]
  }
]

export const ALL_MOCK_LISTINGS: Listing[] = MOCK_CATEGORIES.flatMap((c) => {
  return c.listings.map((l) => ({
    ...l,
    category: {
      id: c.id,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive
    }
  }))
})

// MOCK metadata for distance, rating, reviews (since backend schema doesn't have them)
export const MOCK_METADATA: Record<
  string,
  { distance: string; rating: number; reviewsCount: number }
> = {
  "listing-floor-cleaning": { distance: "0.8 km", rating: 4.85, reviewsCount: 148 },
  "listing-bathroom-cleaning": { distance: "1.2 km", rating: 4.90, reviewsCount: 215 },
  "listing-cupboard-cleaning": { distance: "2.1 km", rating: 4.72, reviewsCount: 92 },
  "listing-utensils-cleaning": { distance: "1.5 km", rating: 4.80, reviewsCount: 84 },
  "listing-deep-home-cleaning": { distance: "0.5 km", rating: 4.95, reviewsCount: 512 },
  "listing-tap-repair": { distance: "1.7 km", rating: 4.76, reviewsCount: 112 },
  "listing-toilet-blockage": { distance: "1.4 km", rating: 4.82, reviewsCount: 96 },
  "listing-switchboard-repair": { distance: "0.9 km", rating: 4.92, reviewsCount: 340 },
  "listing-ac-filter-service": { distance: "1.1 km", rating: 4.87, reviewsCount: 280 },
  "listing-accent-painting": { distance: "2.3 km", rating: 4.80, reviewsCount: 45 },
  "listing-washing-machine": { distance: "1.6 km", rating: 4.74, reviewsCount: 180 }
}

export function getListingMockMeta(id: string) {
  return (
    MOCK_METADATA[id] || {
      distance: `${(1 + Math.random() * 2).toFixed(1)} km`,
      rating: +(4.5 + Math.random() * 0.5).toFixed(2),
      reviewsCount: Math.floor(20 + Math.random() * 180)
    }
  )
}
