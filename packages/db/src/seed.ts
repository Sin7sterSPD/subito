import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema/index.js"

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db = drizzle(pool, { schema })


//Note : This file is created by claude and errors fixed by me , ignore the emojis


// ─── Helpers ────────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("randomItem received an empty array")
  }
  const item = arr[Math.floor(Math.random() * arr.length)]
  if (item === undefined) {
    throw new Error("randomItem produced undefined")
  }
  return item
}

function requireOne<T>(items: T[], label: string): T {
  if (items.length !== 1 || !items[0]) {
    throw new Error(`${label} expected 1 row, got ${items.length}`)
  }
  return items[0]
}

function requireIndex<T>(items: T[], index: number, label: string): T {
  const value = items[index]
  if (!value) {
    throw new Error(`${label} missing at index ${index}`)
  }
  return value
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min: number, max: number, decimals = 2) {
  return (Math.random() * (max - min) + min).toFixed(decimals)
}

function futureDate(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d
}

function pastDate(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...")

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log("  → users")

  const adminUser = requireOne(
    await db
      .insert(schema.users)
      .values({
        firebaseUid: "firebase-admin-001",
        phone: "+919000000001",
        email: "admin@cleanhome.in",
        firstName: "Arjun",
        lastName: "Sharma",
        role: "admin",
        referralCode: "ADMIN001",
        isActive: true,
        isOnboarded: true,
      })
      .returning(),
    "adminUser"
  )

  const customerData = [
    {
      firebaseUid: "firebase-cust-002",
      phone: "+919000000002",
      email: "priya.mehta@gmail.com",
      firstName: "Priya",
      lastName: "Mehta",
      referralCode: "PRIYA2024",
    },
    {
      firebaseUid: "firebase-cust-003",
      phone: "+919000000003",
      email: "rahul.verma@gmail.com",
      firstName: "Rahul",
      lastName: "Verma",
      referralCode: "RAHUL2024",
    },
    {
      firebaseUid: "firebase-cust-004",
      phone: "+919000000004",
      email: "sneha.patel@gmail.com",
      firstName: "Sneha",
      lastName: "Patel",
      referralCode: "SNEHA2024",
    },
    {
      firebaseUid: "firebase-cust-005",
      phone: "+919000000005",
      email: "amit.kumar@gmail.com",
      firstName: "Amit",
      lastName: "Kumar",
      referralCode: "AMIT2024",
    },
  ]

  const customerUsers = await db
    .insert(schema.users)
    .values(
      customerData.map((c) => ({
        ...c,
        role: "customer" as const,
        isActive: true,
        isOnboarded: true,
      }))
    )
    .returning()

  const partnerUserData = [
    {
      firebaseUid: "firebase-partner-006",
      phone: "+919000000006",
      email: "ravi.cleaner@gmail.com",
      firstName: "Ravi",
      lastName: "Singh",
      referralCode: "RAVI2024",
    },
    {
      firebaseUid: "firebase-partner-007",
      phone: "+919000000007",
      email: "deepa.cleaner@gmail.com",
      firstName: "Deepa",
      lastName: "Nair",
      referralCode: "DEEPA2024",
    },
    {
      firebaseUid: "firebase-partner-008",
      phone: "+919000000008",
      email: "suresh.cleaner@gmail.com",
      firstName: "Suresh",
      lastName: "Yadav",
      referralCode: "SURES2024",
    },
  ]

  const partnerUsers = await db
    .insert(schema.users)
    .values(
      partnerUserData.map((p) => ({
        ...p,
        role: "partner" as const,
        isActive: true,
        isOnboarded: true,
      }))
    )
    .returning()

  const partnerUser1 = requireIndex(partnerUsers, 0, "partnerUsers")
  const partnerUser2 = requireIndex(partnerUsers, 1, "partnerUsers")
  const partnerUser3 = requireIndex(partnerUsers, 2, "partnerUsers")

  const allCustomers = customerUsers
  const customer1 = requireIndex(allCustomers, 0, "customerUsers")
  const customer2 = requireIndex(allCustomers, 1, "customerUsers")
  const customer3 = requireIndex(allCustomers, 2, "customerUsers")
  const customer4 = requireIndex(allCustomers, 3, "customerUsers")

  // ── 2. User Preferences ───────────────────────────────────────────────────
  console.log("  → user_preferences")

  const allUsers = [adminUser, ...customerUsers, ...partnerUsers]
  await db.insert(schema.userPreferences).values(
    allUsers.map((u) => ({
      userId: u.id,
      notificationsEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      language: "en",
    }))
  )

  // ── 3. Hubs & MicroHubs ───────────────────────────────────────────────────
  console.log("  → hubs & micro_hubs")

  const hyderabadHub = requireOne(
    await db
      .insert(schema.hubs)
      .values({
        name: "Hyderabad Central Hub",
        code: "HYD-CENTRAL",
        city: "Hyderabad",
        state: "Telangana",
        latitude: 17.385,
        longitude: 78.4867,
        radius: 25,
        isActive: true,
      })
      .returning(),
    "hyderabadHub"
  )

  const bengaluruHub = requireOne(
    await db
      .insert(schema.hubs)
      .values({
        name: "Bengaluru North Hub",
        code: "BLR-NORTH",
        city: "Bengaluru",
        state: "Karnataka",
        latitude: 13.0827,
        longitude: 77.5877,
        radius: 20,
        isActive: true,
      })
      .returning(),
    "bengaluruHub"
  )

  const microHubsData = [
    {
      hubId: hyderabadHub.id,
      name: "Banjara Hills",
      code: "HYD-BH",
      latitude: 17.4156,
      longitude: 78.4347,
      radius: 5,
      pincodes: ["500034", "500033"],
    },
    {
      hubId: hyderabadHub.id,
      name: "Madhapur",
      code: "HYD-MDP",
      latitude: 17.4486,
      longitude: 78.3908,
      radius: 5,
      pincodes: ["500081", "500084"],
    },
    {
      hubId: bengaluruHub.id,
      name: "Indiranagar",
      code: "BLR-IND",
      latitude: 12.9784,
      longitude: 77.6408,
      radius: 4,
      pincodes: ["560038", "560008"],
    },
  ]

  const microHubs = await db
    .insert(schema.microHubs)
    .values(microHubsData)
    .returning()
  const banjaraHillsMH = requireIndex(microHubs, 0, "microHubs")
  const madhapurMH = requireIndex(microHubs, 1, "microHubs")

  // ── 4. Hub Configs ────────────────────────────────────────────────────────
  console.log("  → hub_configs")

  await db.insert(schema.hubConfigs).values([
    {
      hubId: hyderabadHub.id,
      microHubId: banjaraHillsMH.id,
      dayStartTime: "07:00",
      dayClosingTime: "21:00",
      serviceableEndHour: 21,
      slotDuration: 60,
      bufferTime: 30,
      maxBookingsPerSlot: 8,
      surgeMultiplier: 1.0,
      surgeThreshold: 80,
      isInstantEnabled: true,
      isScheduledEnabled: true,
      isRecurringEnabled: true,
    },
    {
      hubId: hyderabadHub.id,
      microHubId: madhapurMH.id,
      dayStartTime: "07:00",
      dayClosingTime: "21:00",
      serviceableEndHour: 21,
      slotDuration: 60,
      bufferTime: 30,
      maxBookingsPerSlot: 6,
      surgeMultiplier: 1.2,
      surgeThreshold: 75,
      isInstantEnabled: true,
      isScheduledEnabled: true,
      isRecurringEnabled: false,
    },
  ])

  // ── 5. Categories & Listings ──────────────────────────────────────────────
  console.log("  → categories & listings")

  const homeCleaning = requireOne(
    await db
      .insert(schema.categories)
      .values({
        name: "Home Cleaning",
        slug: "home-cleaning",
        description: "Professional home cleaning services",
        icon: "🏠",
        sortOrder: 1,
        isActive: true,
      })
      .returning(),
    "homeCleaning"
  )

  const bathroomCleaning = requireOne(
    await db
      .insert(schema.categories)
      .values({
        name: "Bathroom Cleaning",
        slug: "bathroom-cleaning",
        description: "Deep bathroom & toilet cleaning",
        icon: "🚿",
        parentId: homeCleaning.id,
        sortOrder: 2,
        isActive: true,
      })
      .returning(),
    "bathroomCleaning"
  )

  const kitchenCleaning = requireOne(
    await db
      .insert(schema.categories)
      .values({
        name: "Kitchen Cleaning",
        slug: "kitchen-cleaning",
        description: "Thorough kitchen & appliance cleaning",
        icon: "🍳",
        parentId: homeCleaning.id,
        sortOrder: 3,
        isActive: true,
      })
      .returning(),
    "kitchenCleaning"
  )

  // Listings
  const regularCleaning = requireOne(
    await db
      .insert(schema.listings)
      .values({
        categoryId: homeCleaning.id,
        name: "Regular Home Cleaning",
        slug: "regular-home-cleaning",
        description:
          "Complete home cleaning including all rooms, dusting, mopping and surface sanitisation.",
        shortDescription: "Full home clean by professionals",
        basePrice: "499.00",
        duration: 120,
        isActive: true,
        sortOrder: 1,
        tags: ["popular", "bestseller"],
      })
      .returning(),
    "regularCleaning"
  )

  const deepCleaning = requireOne(
    await db
      .insert(schema.listings)
      .values({
        categoryId: homeCleaning.id,
        name: "Deep Home Cleaning",
        slug: "deep-home-cleaning",
        description:
          "Intensive deep cleaning of every corner including inside cabinets, behind appliances and upholstery.",
        shortDescription: "Intensive deep cleaning session",
        basePrice: "999.00",
        duration: 240,
        isActive: true,
        sortOrder: 2,
        tags: ["deep", "intensive"],
      })
      .returning(),
    "deepCleaning"
  )

  const bathroomListing = requireOne(
    await db
      .insert(schema.listings)
      .values({
        categoryId: bathroomCleaning.id,
        name: "Bathroom Deep Clean",
        slug: "bathroom-deep-clean",
        description:
          "Tile scrubbing, toilet sanitisation, mirror polishing and drain unclogging.",
        shortDescription: "Sparkling bathroom guaranteed",
        basePrice: "299.00",
        duration: 60,
        isActive: true,
        sortOrder: 1,
        tags: ["bathroom", "hygiene"],
      })
      .returning(),
    "bathroomListing"
  )

  const kitchenListing = requireOne(
    await db
      .insert(schema.listings)
      .values({
        categoryId: kitchenCleaning.id,
        name: "Kitchen Deep Clean",
        slug: "kitchen-deep-clean",
        description: "Chimney, stove, counters, sink and cabinet deep clean.",
        shortDescription: "Grease-free kitchen in hours",
        basePrice: "399.00",
        duration: 90,
        isActive: true,
        sortOrder: 1,
        tags: ["kitchen", "grease"],
      })
      .returning(),
    "kitchenListing"
  )

  // ── 6. Catalogs ───────────────────────────────────────────────────────────
  console.log("  → catalogs")

  const catalog1BHK = requireOne(
    await db
      .insert(schema.catalogs)
      .values({
        listingId: regularCleaning.id,
        name: "1 BHK",
        description: "Regular cleaning for 1 BHK apartments",
        price: "499.00",
        discountedPrice: "449.00",
        unit: "session",
        minQuantity: 1,
        maxQuantity: 1,
        isActive: true,
        sortOrder: 1,
      })
      .returning(),
    "catalog1BHK"
  )

  const catalog2BHK = requireOne(
    await db
      .insert(schema.catalogs)
      .values({
        listingId: regularCleaning.id,
        name: "2 BHK",
        description: "Regular cleaning for 2 BHK apartments",
        price: "699.00",
        discountedPrice: "649.00",
        unit: "session",
        minQuantity: 1,
        maxQuantity: 1,
        isActive: true,
        sortOrder: 2,
      })
      .returning(),
    "catalog2BHK"
  )

  const catalog3BHK = requireOne(
    await db
      .insert(schema.catalogs)
      .values({
        listingId: regularCleaning.id,
        name: "3 BHK",
        description: "Regular cleaning for 3 BHK apartments",
        price: "899.00",
        discountedPrice: "849.00",
        unit: "session",
        minQuantity: 1,
        maxQuantity: 1,
        isActive: true,
        sortOrder: 3,
      })
      .returning(),
    "catalog3BHK"
  )

  const catalogDeep2BHK = requireOne(
    await db
      .insert(schema.catalogs)
      .values({
        listingId: deepCleaning.id,
        name: "2 BHK Deep Clean",
        description: "Deep cleaning for 2 BHK apartments",
        price: "1299.00",
        discountedPrice: "1199.00",
        unit: "session",
        minQuantity: 1,
        maxQuantity: 1,
        isActive: true,
        sortOrder: 1,
      })
      .returning(),
    "catalogDeep2BHK"
  )

  const catalogBathroom = requireOne(
    await db
      .insert(schema.catalogs)
      .values({
        listingId: bathroomListing.id,
        name: "1 Bathroom",
        price: "299.00",
        discountedPrice: "279.00",
        unit: "bathroom",
        minQuantity: 1,
        maxQuantity: 5,
        stepQuantity: 1,
        isActive: true,
        sortOrder: 1,
      })
      .returning(),
    "catalogBathroom"
  )

  // Catalog pricing variants
  await db.insert(schema.catalogPricing).values([
    {
      catalogId: catalog1BHK.id,
      dependentOn: "bhk",
      dependentValue: "1",
      price: "499.00",
      discountedPrice: "449.00",
      isActive: true,
    },
    {
      catalogId: catalog2BHK.id,
      dependentOn: "bhk",
      dependentValue: "2",
      price: "699.00",
      discountedPrice: "649.00",
      isActive: true,
    },
  ])

  // Add-ons
  await db.insert(schema.addOns).values([
    {
      listingId: regularCleaning.id,
      name: "Inside Fridge Cleaning",
      description: "Complete interior fridge clean and deodorize",
      price: "149.00",
      isActive: true,
      sortOrder: 1,
    },
    {
      listingId: regularCleaning.id,
      name: "Balcony Cleaning",
      description: "Sweep, mop and clean balcony area",
      price: "99.00",
      isActive: true,
      sortOrder: 2,
    },
    {
      categoryId: homeCleaning.id,
      name: "Eco-Friendly Products",
      description: "Upgrade to 100% eco-friendly cleaning products",
      price: "79.00",
      isActive: true,
      sortOrder: 3,
    },
  ])

  // ── 7. Bundles ────────────────────────────────────────────────────────────
  console.log("  → bundles")

  const comboBundle = requireOne(
    await db
      .insert(schema.bundles)
      .values({
        name: "Home Care Combo",
        slug: "home-care-combo",
        description:
          "Regular home clean + bathroom deep clean at a special price",
        originalPrice: "798.00",
        bundlePrice: "649.00",
        discountPercentage: "18.67",
        validFrom: pastDate(30),
        validTill: futureDate(90),
        maxUsage: 500,
        currentUsage: 42,
        isActive: true,
        sortOrder: 1,
      })
      .returning(),
    "comboBundle"
  )

  await db.insert(schema.bundleItems).values([
    { bundleId: comboBundle.id, catalogId: catalog1BHK.id, quantity: 1 },
    { bundleId: comboBundle.id, catalogId: catalogBathroom.id, quantity: 1 },
  ])

  // ── 8. Coupons ────────────────────────────────────────────────────────────
  console.log("  → coupons")

  const coupon10off = requireOne(
    await db
      .insert(schema.coupons)
      .values({
        code: "WELCOME10",
        name: "Welcome 10% Off",
        description: "10% off on your first booking",
        discountType: "PERCENTAGE",
        discountValue: "10.00",
        maxDiscount: "200.00",
        minCartValue: "300.00",
        maxUsageTotal: 1000,
        maxUsagePerUser: 1,
        currentUsageTotal: 87,
        isFirstTimeOnly: true,
        validFrom: pastDate(60),
        validTill: futureDate(60),
        isActive: true,
      })
      .returning(),
    "coupon10off"
  )

  const couponFlat100 = requireOne(
    await db
      .insert(schema.coupons)
      .values({
        code: "FLAT100",
        name: "Flat ₹100 Off",
        description: "Flat ₹100 off on orders above ₹500",
        discountType: "FLAT",
        discountValue: "100.00",
        minCartValue: "500.00",
        maxUsageTotal: 500,
        maxUsagePerUser: 2,
        currentUsageTotal: 215,
        isFirstTimeOnly: false,
        validFrom: pastDate(15),
        validTill: futureDate(30),
        isActive: true,
      })
      .returning(),
    "couponFlat100"
  )

  const couponSummer = requireOne(
    await db
      .insert(schema.coupons)
      .values({
        code: "SUMMER25",
        name: "Summer Special 25% Off",
        description: "25% off during summer season",
        discountType: "PERCENTAGE",
        discountValue: "25.00",
        maxDiscount: "500.00",
        minCartValue: "600.00",
        maxUsageTotal: 200,
        maxUsagePerUser: 1,
        currentUsageTotal: 33,
        isFirstTimeOnly: false,
        validFrom: pastDate(5),
        validTill: futureDate(25),
        isActive: true,
      })
      .returning(),
    "couponSummer"
  )

  // ── 9. Addresses ──────────────────────────────────────────────────────────
  console.log("  → addresses")

  const addr1 = requireOne(
    await db
      .insert(schema.addresses)
      .values({
        userId: customer1.id,
        name: "Home",
        addressLine1: "Flat 4B, Prestige Towers",
        addressLine2: "Road No. 12",
        landmark: "Near Inorbit Mall",
        area: "Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500034",
        latitude: 17.4156,
        longitude: 78.4347,
        type: "HOME",
        bhk: 2,
        bathroom: 2,
        balcony: 1,
        floor: 4,
        buildingName: "Prestige Towers",
        houseNo: "4B",
        isDefault: true,
        canDelete: false,
      })
      .returning(),
    "addr1"
  )

  const addr2 = requireOne(
    await db
      .insert(schema.addresses)
      .values({
        userId: customer2.id,
        name: "Home",
        addressLine1: "Plot 22, Sri Residency",
        landmark: "Opposite HITEC City Metro",
        area: "Madhapur",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081",
        latitude: 17.4486,
        longitude: 78.3908,
        type: "HOME",
        bhk: 3,
        bathroom: 3,
        balcony: 2,
        floor: 7,
        buildingName: "Sri Residency",
        houseNo: "22",
        isDefault: true,
        canDelete: false,
      })
      .returning(),
    "addr2"
  )

  const addr3 = requireOne(
    await db
      .insert(schema.addresses)
      .values({
        userId: customer3.id,
        name: "Home",
        addressLine1: "305, Aparna Sarovar",
        area: "Nallagandla",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500019",
        latitude: 17.4399,
        longitude: 78.3295,
        type: "HOME",
        bhk: 2,
        bathroom: 2,
        floor: 3,
        buildingName: "Aparna Sarovar",
        houseNo: "305",
        isDefault: true,
        canDelete: false,
      })
      .returning(),
    "addr3"
  )

  const addr4 = requireOne(
    await db
      .insert(schema.addresses)
      .values({
        userId: customer4.id,
        name: "Office",
        addressLine1: "WeWork, Wing A, DivyaSree Orion",
        area: "Gachibowli",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500032",
        latitude: 17.4401,
        longitude: 78.3489,
        type: "OFFICE",
        isDefault: true,
        canDelete: false,
      })
      .returning(),
    "addr4"
  )

  // ── 10. Partners ──────────────────────────────────────────────────────────
  console.log("  → partners")

  const partner1 = requireOne(
    await db
      .insert(schema.partners)
      .values({
        userId: partnerUser1.id,
        status: "approved",
        availabilityStatus: "online",
        aadharNumber: "1234-5678-9012",
        panNumber: "ABCDE1234F",
        bankAccountNumber: "50100123456789",
        bankIfscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        averageRating: "4.85",
        totalRatings: 128,
        totalBookings: 135,
        completedBookings: 130,
        totalEarnings: "58500.00",
        serviceRadius: 10,
      })
      .returning(),
    "partner1"
  )

  const partner2 = requireOne(
    await db
      .insert(schema.partners)
      .values({
        userId: partnerUser2.id,
        status: "approved",
        availabilityStatus: "busy",
        aadharNumber: "9876-5432-1098",
        panNumber: "FGHIJ5678K",
        bankAccountNumber: "50100987654321",
        bankIfscCode: "ICIC0005678",
        bankName: "ICICI Bank",
        averageRating: "4.72",
        totalRatings: 94,
        totalBookings: 98,
        completedBookings: 95,
        totalEarnings: "42750.00",
        serviceRadius: 8,
      })
      .returning(),
    "partner2"
  )

  const partner3 = requireOne(
    await db
      .insert(schema.partners)
      .values({
        userId: partnerUser3.id,
        status: "pending",
        availabilityStatus: "offline",
        averageRating: "0",
        totalRatings: 0,
        totalBookings: 0,
        completedBookings: 0,
        totalEarnings: "0",
        serviceRadius: 10,
      })
      .returning(),
    "partner3"
  )

  // Partner availability schedules
  const days = [1, 2, 3, 4, 5, 6] // Mon–Sat
  await db.insert(schema.partnerAvailability).values(
    days.map((day) => ({
      partnerId: partner1.id,
      dayOfWeek: day,
      startTime: "08:00",
      endTime: "20:00",
      isActive: true,
    }))
  )
  await db.insert(schema.partnerAvailability).values(
    [1, 2, 3, 4, 5].map((day) => ({
      partnerId: partner2.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "19:00",
      isActive: true,
    }))
  )

  // Partner locations (last known)
  await db.insert(schema.partnerLocations).values([
    {
      partnerId: partner1.id,
      latitude: 17.416,
      longitude: 78.435,
      accuracy: 5.2,
      heading: 180,
      speed: 0,
    },
    {
      partnerId: partner2.id,
      latitude: 17.449,
      longitude: 78.391,
      accuracy: 4.8,
      heading: 90,
      speed: 2.1,
    },
  ])

  // Partner payouts
  await db.insert(schema.partnerPayouts).values([
    {
      partnerId: partner1.id,
      amount: "15000.00",
      status: "completed",
      transactionId: "TXN-PAY-20240501-001",
      processedAt: pastDate(30),
    },
    {
      partnerId: partner1.id,
      amount: "12500.00",
      status: "completed",
      transactionId: "TXN-PAY-20240601-001",
      processedAt: pastDate(7),
    },
    {
      partnerId: partner2.id,
      amount: "10000.00",
      status: "pending",
    },
  ])

  // ── 11. Bookings ──────────────────────────────────────────────────────────
  console.log("  → bookings")

  // Completed booking
  const booking1 = requireOne(
    await db
      .insert(schema.bookings)
      .values({
        bookingNumber: "BK-HYD-20240601-0001",
        userId: customer1.id,
        partnerId: partner1.id,
        addressId: addr1.id,
        hubId: hyderabadHub.id,
        microHubId: banjaraHillsMH.id,
        couponId: coupon10off.id,
        status: "COMPLETED",
        bookingType: "SCHEDULED",
        scheduledDate: pastDate(10),
        scheduledStartTime: "10:00",
        scheduledEndTime: "12:00",
        startedAt: pastDate(10),
        completedAt: pastDate(10),
        subtotal: "699.00",
        totalPrice: "699.00",
        discountAmount: "69.90",
        gstAmount: "55.69",
        surgeAmount: "0",
        totalAmount: "684.79",
        finalAmount: "684.79",
        paidAmount: "684.79",
        estimatedDuration: 120,
        actualDuration: 115,
        customerNotes: "Please focus on the kitchen area",
      })
      .returning(),
    "booking1"
  )

  // Pending match booking
  const booking2 = requireOne(
    await db
      .insert(schema.bookings)
      .values({
        bookingNumber: "BK-HYD-20240611-0002",
        userId: customer2.id,
        addressId: addr2.id,
        hubId: hyderabadHub.id,
        microHubId: madhapurMH.id,
        status: "PENDING_MATCH",
        bookingType: "SCHEDULED",
        scheduledDate: futureDate(2),
        scheduledStartTime: "09:00",
        scheduledEndTime: "13:00",
        subtotal: "1299.00",
        totalPrice: "1299.00",
        discountAmount: "0",
        gstAmount: "103.92",
        surgeAmount: "0",
        totalAmount: "1402.92",
        finalAmount: "1402.92",
        paidAmount: "1402.92",
        estimatedDuration: 240,
      })
      .returning(),
    "booking2"
  )

  // Active/started booking
  const booking3 = requireOne(
    await db
      .insert(schema.bookings)
      .values({
        bookingNumber: "BK-HYD-20240611-0003",
        userId: customer3.id,
        partnerId: partner2.id,
        addressId: addr3.id,
        hubId: hyderabadHub.id,
        microHubId: banjaraHillsMH.id,
        couponId: couponFlat100.id,
        status: "STARTED",
        bookingType: "INSTANT",
        scheduledDate: new Date(),
        scheduledStartTime: "14:00",
        scheduledEndTime: "16:00",
        startedAt: new Date(),
        subtotal: "449.00",
        totalPrice: "449.00",
        discountAmount: "100.00",
        gstAmount: "27.92",
        surgeAmount: "0",
        totalAmount: "376.92",
        finalAmount: "376.92",
        paidAmount: "376.92",
        estimatedDuration: 120,
      })
      .returning(),
    "booking3"
  )

  // Cancelled booking
  const booking4 = requireOne(
    await db
      .insert(schema.bookings)
      .values({
        bookingNumber: "BK-HYD-20240605-0004",
        userId: customer4.id,
        addressId: addr4.id,
        hubId: hyderabadHub.id,
        status: "CANCELLED",
        bookingType: "SCHEDULED",
        scheduledDate: pastDate(5),
        scheduledStartTime: "11:00",
        scheduledEndTime: "13:00",
        cancelledAt: pastDate(6),
        cancellationReason: "USER_REQUESTED",
        cancellationNote: "Plans changed",
        subtotal: "699.00",
        totalPrice: "699.00",
        discountAmount: "0",
        gstAmount: "55.92",
        totalAmount: "754.92",
        finalAmount: "754.92",
        paidAmount: "0",
        estimatedDuration: 120,
      })
      .returning(),
    "booking4"
  )

  // Recurring booking
  const recurringBooking = requireOne(
    await db
      .insert(schema.bookings)
      .values({
        bookingNumber: "BK-HYD-20240601-0005",
        userId: customer1.id,
        partnerId: partner1.id,
        addressId: addr1.id,
        hubId: hyderabadHub.id,
        microHubId: banjaraHillsMH.id,
        status: "MATCHED",
        bookingType: "RECURRING",
        recurringType: "WEEKLY",
        scheduledDate: futureDate(5),
        scheduledStartTime: "10:00",
        scheduledEndTime: "12:00",
        subtotal: "449.00",
        totalPrice: "449.00",
        discountAmount: "0",
        gstAmount: "35.92",
        totalAmount: "484.92",
        finalAmount: "484.92",
        paidAmount: "484.92",
        estimatedDuration: 120,
      })
      .returning(),
    "recurringBooking"
  )

  // ── 12. Booking Items ─────────────────────────────────────────────────────
  console.log("  → booking_items")

  await db.insert(schema.bookingItems).values([
    {
      bookingId: booking1.id,
      catalogId: catalog2BHK.id,
      name: "2 BHK Regular Cleaning",
      quantity: 1,
      unitPrice: "699.00",
      totalPrice: "699.00",
    },
    {
      bookingId: booking2.id,
      catalogId: catalogDeep2BHK.id,
      name: "2 BHK Deep Clean",
      quantity: 1,
      unitPrice: "1299.00",
      totalPrice: "1299.00",
    },
    {
      bookingId: booking3.id,
      catalogId: catalog1BHK.id,
      name: "1 BHK Regular Cleaning",
      quantity: 1,
      unitPrice: "449.00",
      totalPrice: "449.00",
    },
    {
      bookingId: booking4.id,
      catalogId: catalog2BHK.id,
      name: "2 BHK Regular Cleaning",
      quantity: 1,
      unitPrice: "699.00",
      totalPrice: "699.00",
    },
    {
      bookingId: recurringBooking.id,
      catalogId: catalog1BHK.id,
      name: "1 BHK Regular Cleaning",
      quantity: 1,
      unitPrice: "449.00",
      totalPrice: "449.00",
    },
  ])

  // ── 13. Booking Status History ────────────────────────────────────────────
  console.log("  → booking_status_history")

  await db.insert(schema.bookingStatusHistory).values([
    {
      bookingId: booking1.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      changedBy: customer1.id,
      reason: "Booking created",
    },
    {
      bookingId: booking1.id,
      fromStatus: "PENDING_PAYMENT",
      toStatus: "PENDING_MATCH",
      changedBy: customer1.id,
      reason: "Payment captured",
    },
    {
      bookingId: booking1.id,
      fromStatus: "PENDING_MATCH",
      toStatus: "MATCHED",
      reason: "Partner assigned",
    },
    {
      bookingId: booking1.id,
      fromStatus: "MATCHED",
      toStatus: "ARRIVING",
      changedBy: partner1.userId,
    },
    {
      bookingId: booking1.id,
      fromStatus: "ARRIVING",
      toStatus: "STARTED",
      changedBy: partner1.userId,
    },
    {
      bookingId: booking1.id,
      fromStatus: "STARTED",
      toStatus: "COMPLETED",
      changedBy: partner1.userId,
    },
    {
      bookingId: booking4.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
    },
    {
      bookingId: booking4.id,
      fromStatus: "PENDING_PAYMENT",
      toStatus: "CANCELLED",
      changedBy: customer4.id,
      reason: "USER_REQUESTED",
    },
  ])

  // ── 14. Recurring Booking Config ──────────────────────────────────────────
  console.log("  → recurring_bookings & instances")

  const recurringConfig = requireOne(
    await db
      .insert(schema.recurringBookings)
      .values({
        bookingId: recurringBooking.id,
        recurringType: "WEEKLY",
        recurringDays: [1], // Every Monday
        startDate: futureDate(5),
        endDate: futureDate(95),
        totalInstances: 13,
        completedInstances: 0,
        cancelledInstances: 0,
        isActive: true,
      })
      .returning(),
    "recurringConfig"
  )

  await db.insert(schema.bookingInstances).values([
    {
      recurringBookingId: recurringConfig.id,
      parentBookingId: recurringBooking.id,
      partnerId: partner1.id,
      instanceNumber: 1,
      status: "SCHEDULED",
      scheduledDate: futureDate(5),
      scheduledTime: "10:00",
    },
    {
      recurringBookingId: recurringConfig.id,
      parentBookingId: recurringBooking.id,
      instanceNumber: 2,
      status: "SCHEDULED",
      scheduledDate: futureDate(12),
      scheduledTime: "10:00",
    },
    {
      recurringBookingId: recurringConfig.id,
      parentBookingId: recurringBooking.id,
      instanceNumber: 3,
      status: "SCHEDULED",
      scheduledDate: futureDate(19),
      scheduledTime: "10:00",
    },
  ])

  // ── 15. Booking Slots ─────────────────────────────────────────────────────
  console.log("  → booking_slots")

  await db.insert(schema.bookingSlots).values([
    {
      hubId: hyderabadHub.id,
      microHubId: banjaraHillsMH.id,
      date: futureDate(1),
      startTime: "09:00",
      endTime: "10:00",
      maxCapacity: 8,
      currentBookings: 3,
      isAvailable: true,
      surgeMultiplier: 1.0,
    },
    {
      hubId: hyderabadHub.id,
      microHubId: banjaraHillsMH.id,
      date: futureDate(1),
      startTime: "10:00",
      endTime: "11:00",
      maxCapacity: 8,
      currentBookings: 7,
      isAvailable: true,
      surgeMultiplier: 1.3,
    },
    {
      hubId: hyderabadHub.id,
      microHubId: madhapurMH.id,
      date: futureDate(1),
      startTime: "11:00",
      endTime: "12:00",
      maxCapacity: 6,
      currentBookings: 2,
      isAvailable: true,
      surgeMultiplier: 1.0,
    },
  ])

  // ── 16. Orders & Payments ─────────────────────────────────────────────────
  console.log("  → orders & payments")

  const order1 = requireOne(
    await db
      .insert(schema.orders)
      .values({
        orderId: "ORD-HYD-20240601-0001",
        bookingId: booking1.id,
        userId: customer1.id,
        status: "COMPLETED",
        amount: "684.79",
        currency: "INR",
        juspayOrderId: "JUSPAY-ORD-001",
        paymentMethod: "UPI",
      })
      .returning(),
    "order1"
  )

  const order2 = requireOne(
    await db
      .insert(schema.orders)
      .values({
        orderId: "ORD-HYD-20240611-0002",
        bookingId: booking2.id,
        userId: customer2.id,
        status: "CAPTURED",
        amount: "1402.92",
        currency: "INR",
        juspayOrderId: "JUSPAY-ORD-002",
        paymentMethod: "CARD",
      })
      .returning(),
    "order2"
  )

  const order3 = requireOne(
    await db
      .insert(schema.orders)
      .values({
        orderId: "ORD-HYD-20240611-0003",
        bookingId: booking3.id,
        userId: customer3.id,
        status: "CAPTURED",
        amount: "376.92",
        currency: "INR",
        juspayOrderId: "JUSPAY-ORD-003",
        paymentMethod: "UPI",
      })
      .returning(),
    "order3"
  )

  await db.insert(schema.payments).values([
    {
      paymentId: "PAY-001",
      orderId: order1.id,
      userId: customer1.id,
      status: "CAPTURED",
      amount: "684.79",
      currency: "INR",
      paymentMethod: "UPI",
      juspayTxnId: "TXN-JUSPAY-001",
      bankReferenceNumber: "BNK-REF-001",
      capturedAt: pastDate(10),
    },
    {
      paymentId: "PAY-002",
      orderId: order2.id,
      userId: customer2.id,
      status: "CAPTURED",
      amount: "1402.92",
      currency: "INR",
      paymentMethod: "CARD",
      juspayTxnId: "TXN-JUSPAY-002",
      capturedAt: pastDate(2),
    },
    {
      paymentId: "PAY-003",
      orderId: order3.id,
      userId: customer3.id,
      status: "CAPTURED",
      amount: "376.92",
      currency: "INR",
      paymentMethod: "UPI",
      juspayTxnId: "TXN-JUSPAY-003",
      capturedAt: new Date(),
    },
  ])

  // Saved payment methods
  await db.insert(schema.savedPaymentMethods).values([
    {
      userId: customer1.id,
      type: "UPI",
      displayName: "priya@okaxis",
      upiId: "priya@okaxis",
      upiProvider: "AXIS",
      isDefault: true,
      isActive: true,
    },
    {
      userId: customer2.id,
      type: "CARD",
      displayName: "HDFC ••••4521",
      cardLastFour: "4521",
      cardBrand: "VISA",
      cardExpiryMonth: "08",
      cardExpiryYear: "2027",
      isDefault: true,
      isActive: true,
    },
    {
      userId: customer3.id,
      type: "UPI",
      displayName: "sneha@paytm",
      upiId: "sneha@paytm",
      upiProvider: "PAYTM",
      isDefault: true,
      isActive: true,
    },
  ])

  // ── 17. Ratings ───────────────────────────────────────────────────────────
  console.log("  → ratings")

  await db.insert(schema.ratings).values([
    {
      bookingId: booking1.id,
      userId: customer1.id,
      partnerId: partner1.id,
      status: "SUBMITTED",
      rating: 5,
      comment:
        "Ravi did an excellent job! The house was sparkling clean. Very professional and punctual.",
      tags: ["punctual", "thorough", "professional"],
      serviceQuality: 5,
      punctuality: 5,
      professionalism: 5,
      cleanliness: 5,
      isAnonymous: false,
    },
    {
      bookingId: booking4.id,
      userId: customer4.id,
      partnerId: null,
      status: "DISCARDED",
      rating: 3,
      comment: "Cancelled before service",
      discardedAt: pastDate(5),
      discardReason: "Booking cancelled before start",
    },
  ])

  // ── 18. Coupon Usage ──────────────────────────────────────────────────────
  console.log("  → coupon_usage")

  await db.insert(schema.couponUsage).values([
    {
      couponId: coupon10off.id,
      userId: customer1.id,
      bookingId: booking1.id,
      discountApplied: "69.90",
    },
    {
      couponId: couponFlat100.id,
      userId: customer3.id,
      bookingId: booking3.id,
      discountApplied: "100.00",
    },
  ])

  // ── 19. Referrals & Credits ───────────────────────────────────────────────
  console.log("  → referrals & credits")

  const referralCode1 = requireOne(
    await db
      .insert(schema.referralCodes)
      .values({
        userId: customer1.id,
        code: "PRIYA2024",
        maxUsage: 10,
        currentUsage: 2,
        rewardType: "CREDIT",
        referrerReward: "200.00",
        refereeReward: "100.00",
        validFrom: pastDate(60),
        validTill: futureDate(305),
        isActive: true,
      })
      .returning(),
    "referralCode1"
  )

  await db.insert(schema.referralRewards).values([
    {
      referralCodeId: referralCode1.id,
      referrerId: customer1.id,
      refereeId: customer2.id,
      referrerRewardStatus: "CREDITED",
      refereeRewardStatus: "CREDITED",
      referrerRewardAmount: "200.00",
      refereeRewardAmount: "100.00",
      referrerCreditedAt: pastDate(20),
      refereeCreditedAt: pastDate(20),
      triggerBookingId: booking1.id,
    },
  ])

  await db.insert(schema.userCredits).values([
    {
      userId: customer1.id,
      balance: "200.00",
      lifetimeEarned: "200.00",
      lifetimeUsed: "0.00",
    },
    {
      userId: customer2.id,
      balance: "100.00",
      lifetimeEarned: "100.00",
      lifetimeUsed: "0.00",
    },
    {
      userId: customer3.id,
      balance: "0.00",
      lifetimeEarned: "0.00",
      lifetimeUsed: "0.00",
    },
    {
      userId: customer4.id,
      balance: "0.00",
      lifetimeEarned: "0.00",
      lifetimeUsed: "0.00",
    },
  ])

  await db.insert(schema.creditTransactions).values([
    {
      userId: customer1.id,
      type: "EARNED",
      amount: "200.00",
      balanceBefore: "0.00",
      balanceAfter: "200.00",
      description: "Referral reward — friend Rahul signed up",
      referenceType: "referral",
    },
    {
      userId: customer2.id,
      type: "EARNED",
      amount: "100.00",
      balanceBefore: "0.00",
      balanceAfter: "100.00",
      description: "Welcome referral credit",
      referenceType: "referral",
    },
  ])

  // ── 20. Notifications ─────────────────────────────────────────────────────
  console.log("  → notifications")

  await db.insert(schema.notifications).values([
    {
      userId: customer1.id,
      title: "Booking Confirmed! 🎉",
      body: "Your cleaning is scheduled for tomorrow at 10:00 AM. Ravi Singh will be your cleaner.",
      type: "BOOKING_CONFIRMED",
      referenceType: "booking",
      referenceId: booking1.id,
      isRead: true,
      readAt: pastDate(9),
    },
    {
      userId: customer1.id,
      title: "Cleaning Completed ✅",
      body: "Your home has been cleaned! Please rate your experience with Ravi.",
      type: "BOOKING_COMPLETED",
      referenceType: "booking",
      referenceId: booking1.id,
      isRead: true,
      readAt: pastDate(10),
    },
    {
      userId: customer2.id,
      title: "Looking for a cleaner... 🔍",
      body: "We're finding the best available cleaner for your booking on Sunday.",
      type: "BOOKING_PENDING_MATCH",
      referenceType: "booking",
      referenceId: booking2.id,
      isRead: false,
    },
    {
      userId: customer1.id,
      title: "₹200 Credits Added! 💰",
      body: "Rahul signed up using your referral code. You've earned ₹200 in credits.",
      type: "CREDITS_EARNED",
      isRead: false,
    },
  ])

  // FCM tokens
  await db.insert(schema.fcmTokens).values([
    {
      userId: customer1.id,
      token: "fcm-token-customer1-android-abc123def456",
      deviceType: "android",
      deviceId: "device-customer1-001",
      isActive: true,
    },
    {
      userId: customer2.id,
      token: "fcm-token-customer2-ios-xyz789uvw012",
      deviceType: "ios",
      deviceId: "device-customer2-001",
      isActive: true,
    },
    {
      userId: partner1.userId,
      token: "fcm-token-partner1-android-pqr345stu678",
      deviceType: "android",
      deviceId: "device-partner1-001",
      isActive: true,
    },
  ])

  // ── 21. Complaints ────────────────────────────────────────────────────────
  console.log("  → complaints")

  const complaint1 = requireOne(
    await db
      .insert(schema.complaints)
      .values({
        ticketNumber: "TKT-20240601-0001",
        userId: customer4.id,
        bookingId: booking4.id,
        category: "refund",
        subject: "Refund not received for cancelled booking",
        description:
          "I cancelled my booking 6 days ago but haven't received a refund yet. Please help.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assignedTo: adminUser.id,
      })
      .returning(),
    "complaint1"
  )

  await db.insert(schema.complaintReplies).values([
    {
      complaintId: complaint1.id,
      userId: adminUser.id,
      message:
        "Hi Amit, we've looked into this. Since you paid via COD and cancelled before the service started, no amount was charged. Please check your payment records. Let us know if you need further help.",
      isInternal: false,
    },
    {
      complaintId: complaint1.id,
      userId: adminUser.id,
      message:
        "Internal note: Customer paid COD, booking auto-cancelled. No actual payment captured. Closing after 48hr wait.",
      isInternal: true,
    },
  ])

  // ── 22. App Settings & Feature Flags ─────────────────────────────────────
  console.log("  → app_settings & feature_flags")

  await db.insert(schema.appSettings).values([
    {
      key: "gst_rate",
      value: { rate: 0.08 },
      description: "GST rate applied to all bookings",
      isPublic: false,
    },
    {
      key: "platform_fee",
      value: { fee: 0, type: "percentage" },
      description: "Platform fee charged on each booking",
      isPublic: false,
    },
    {
      key: "support_contact",
      value: {
        phone: "+918008001234",
        email: "support@cleanhome.in",
        hours: "9AM-9PM",
      },
      description: "Customer support contact details",
      isPublic: true,
    },
    {
      key: "cancellation_policy",
      value: {
        freeWindowMinutes: 60,
        lateFeePct: 50,
        noShowFeePct: 100,
      },
      description: "Cancellation fee policy",
      isPublic: true,
    },
  ])

  await db.insert(schema.featureFlags).values([
    {
      key: "instant_booking",
      name: "Instant Booking",
      description: "Allow customers to book instant cleaning sessions",
      isEnabled: true,
    },
    {
      key: "recurring_booking",
      name: "Recurring Booking",
      description: "Allow weekly/biweekly/monthly recurring bookings",
      isEnabled: true,
    },
    {
      key: "in_app_chat",
      name: "In-App Chat",
      description: "Enable customer-partner chat within the app",
      isEnabled: false,
    },
    {
      key: "surge_pricing",
      name: "Surge Pricing",
      description: "Enable dynamic surge pricing during peak hours",
      isEnabled: true,
    },
    {
      key: "partner_tips",
      name: "Partner Tips",
      description: "Allow customers to tip partners after service",
      isEnabled: false,
      enabledForPercentage: "10",
    },
  ])

  console.log("✅ Seed complete!")
  await pool.end()
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
