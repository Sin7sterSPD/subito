# Schedule & Booking Type Selection — Implementation Plan

## Overview

Add Instant / Scheduled / Recurring tabs to the **Cart screen** so users choose their booking type and configure the required details (time slot, recurrence) before proceeding to checkout.

---

## 1. Where Tabs Live

**Location:** `apps/mobile/app/(tabs)/cart.tsx`
**Position:** Between the **Service Address** section and the **Cart Items** section.

```
Cart Screen
├── Header
├── Service Address
├── Booking Type Tabs (HeroUI Tabs)      ← NEW
├── Cart Items
├── Coupon / Promo
├── Pricing Summary
├── Recommended Add-ons
└── Sticky Footer: Total + "Proceed to Checkout"
```

**Rationale:** User selects booking type and fills in required info (slot/days) on the cart, then proceeds to checkout which just handles summary + payment. The checkout screen already handles `isInstant` branching.

---

## 2. Tab Component

**HeroUI Native `Tabs`** (primary variant).

**Import:**
```tsx
import { Tabs } from "heroui-native"
```

**Tabs anatomy to use:**
```
check native docs on how to implemt tabs api 



---

## 3. Shared Data Flow

### Cart Store
The existing `useCartStore.updateCart()` already accepts:
```ts
updateCart(data: {
  deliveryAddressId?: string
  bookingType?: "INSTANT" | "SCHEDULED" | "RECURRING"
  timeSlot?: { time: { start: string }[] }
  recurringType?: "WEEKLY" | "BIWEEKLY" | "MONTHLY"
})
```

### Booking Slots
The existing `useBookingsStore.fetchSlots(lat, lng, bookingType?, days?)` fetches slot data from `GET /bookings/slots` and stores:
- `slots: Record<string, BookingSlot[]>` — keyed by date string
- `availableDates: string[]`

### `BookingSlot` type:
```ts
interface BookingSlot {
  startTime: string
  isFull: boolean
  isExperiencingSurge: boolean
  surgePrice: number
}
```

### Location / Address
`useUserStore.selectedAddress` provides lat/lng for slot fetching.

---

## 4. Tab: Instant

**Purpose:** No slot needed. User pays and service starts ASAP.

### UI
- A compact info card below the tabs when Instant is selected.
- Content: Icon + text "No time slot needed. Pay now and we'll connect you right away."
- The "Proceed to Checkout" button in the sticky footer works immediately.

### Cart update
- Calls `updateCart({ bookingType: "INSTANT" })` when tab is selected.
- Clears any previously selected `timeSlot` and `recurringType`.

---

## 5. Tab: Scheduled

**Purpose:** User picks a specific date and time slot.

### UI — Card below tabs
When **no slot selected**:  
A card with a clock icon + "Select Slot" text + chevron-right. Tapping opens the Scheduled bottom sheet.

When **slot is selected**:  
A card showing the selected info:
```
🕐 Selected Slot
Wed, 26 May • 10:30 AM
```
Tapping reopens the bottom sheet with previous selections preserved.

### Bottom Sheet: ScheduledSheet

**Trigger:** "Select Slot" card tap → opens `ScheduledSheet`.

**HeroUI BottomSheet imports:**
```tsx
import { BottomSheet } from "heroui-native"
```

**BottomSheet anatomy:**
```tsx
check bottom sheet docs and implemnt
```

**Content layout (inside BottomSheet.Content):**

1. **"Select Date" label** + horizontal chip row
   - Chips: Today, Tomorrow, Wed, Thu, Fri (from `availableDates`, formatted with weekday + day)
   - Using View + TouchableOpacity styled as chips (or HeroUI Chip if available)
   - Default chip: white bg, gray-200 border, gray-12 text
   - Selected chip: blue-03 bg, white text
   - Only one date selectable at a time
   - Horizontal ScrollView

2. **"Select Time" label** + time chip grid
   - Chips for each slot in the selected date's array
   - Each shows formatted time (e.g., "10:30 AM")
   - Grid: flex-wrap, 3-4 columns
   - Default chip: white bg, gray-200 border, gray-12 text
   - Selected chip: blue-03 bg, white text
   - Full slots: disabled, 45% opacity
   - Surge slots: show a small surge indicator badge
   - Only one time selectable at a time

3. **Sticky Footer** (always visible, never scrolls away)
   ```
   ┌──────────────────────────────────┐
   │ Total            ₹899            │
   │ ┌────────────────────────────┐   │
   │ │   Confirm & Proceed       │   │
   │ └────────────────────────────┘   │
   └──────────────────────────────────┘
   ```
   - Total amount: from `cart.finalTotalAmount`
   - Button: full width, blue-03 bg, h-[52], rounded-xl, white text
   - Button **disabled** (50% opacity) until both date AND time are selected
   - On press:
     1. Call `updateCart({ bookingType: "SCHEDULED", timeSlot: { time: [{ start: slot.startTime }] } })`
     2. Close bottom sheet
     3. Update the summary card below tabs with selected date/time

4. **Reopening behavior:**
   - Previously selected date stays selected
   - Previously selected time stays selected
   - Do NOT reset state on close/reopen

**State for scheduled:**
```ts
const [selectedDate, setSelectedDate] = useState<string | null>(existingDate || null)
const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(existingSlot || null)
```

---

## 6. Tab: Recurring

**Purpose:** User sets up a recurring schedule (weekly/biweekly/monthly) with a time slot.

### UI — Card below tabs
When **no schedule selected**:  
A card with a repeat icon + "Set Schedule" text + chevron-right. Tapping opens the Recurring bottom sheet.

When **schedule is selected**:  
A card showing:
```
🔄 Recurring Every Week
Mon, Wed, Fri • 10:30 AM
```
Tapping reopens the bottom sheet with previous selections preserved.

### Bottom Sheet: RecurringSheet

**Trigger:** "Set Schedule" card tap → opens `RecurringSheet`.

**Same bottom sheet pattern** as ScheduledSheet.

**Content layout:**

1. **"Frequency" label** + horizontal chip row
   - Chips: Weekly | Biweekly | Monthly
   - Default chip: white bg, gray-200 border
   - Selected chip: blue-03 bg, white text
   - Only one frequency selectable at a time

2. **"Select Days" label** (only when Weekly is selected)
   - 7 day chips: M T W Th F Sa Su
   - Multi-select allowed
   - Selected chips: blue-03 bg, white text
   - Unselected: white bg, gray-200 border, gray-12 text

3. **"Select Time" label** + time chip grid
   - Same as Scheduled: horizontal date row + time slot chips
   - Single date selection (the first occurrence)
   - Single time selection

4. **Sticky Footer** (same as Scheduled)
   - Total + "Confirm & Proceed" button
   - Disabled until: frequency + days (if weekly) + time are all selected
   - On press:
     1. Call `updateCart({ bookingType: "RECURRING", recurringType, timeSlot: { time: [{ start: slot.startTime }] } })`
     2. Close bottom sheet
     3. Update the summary card

**State for recurring:**
```ts
const [frequency, setFrequency] = useState<RecurringType>(existingFrequency || "WEEKLY")
const [selectedDays, setSelectedDays] = useState<string[]>(existingDays || [])
const [selectedDate, setSelectedDate] = useState<string | null>(existingDate || null)
const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(existingSlot || null)
```

---

## 7. Component File Structure

```
apps/mobile/src/components/booking/
├── scheduled-sheet.tsx       ← Scheduled bottom sheet
├── recurring-sheet.tsx       ← Recurring bottom sheet
├── slot-picker.tsx           ← Shared: date chips + time slot grid (used by both sheets)
└── index.ts                  ← Re-exports
```

### `slot-picker.tsx` (shared)
Props:
```ts
interface SlotPickerProps {
  slots: Record<string, BookingSlot[]>
  availableDates: string[]
  selectedDate: string | null
  selectedSlot: BookingSlot | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: BookingSlot) => void
  label?: string               // e.g., "Select Date & Time"
  showDateLabel?: boolean      // default true (hide for recurring if needed)
}
```

### `scheduled-sheet.tsx`
Props:
```ts
interface ScheduledSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (date: string, slot: BookingSlot) => void
  initialDate?: string | null
  initialSlot?: BookingSlot | null
  totalAmount: string
  addressLat: number
  addressLng: number
}
```

### `recurring-sheet.tsx`
Props:
```ts
interface RecurringSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: {
    recurringType: RecurringType
    days?: string[]
    date: string
    slot: BookingSlot
  }) => void
  initialFrequency?: RecurringType
  initialDays?: string[]
  initialDate?: string | null
  initialSlot?: BookingSlot | null
  totalAmount: string
  addressLat: number
  addressLng: number
}
```

---

## 8. Cart Screen Changes (cart.tsx)

### New state:
```ts
const [bookingType, setBookingType] = useState<BookingType>(
  cart?.bookingType || "INSTANT"
)
const [showScheduledSheet, setShowScheduledSheet] = useState(false)
const [showRecurringSheet, setShowRecurringSheet] = useState(false)
const [selectedDate, setSelectedDate] = useState<string | null>(null)
const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
const [recurringFrequency, setRecurringFrequency] = useState<RecurringType | null>(null)
const [recurringDays, setRecurringDays] = useState<string[]>([])
```

### Tab change handler:
```ts
const handleBookingTypeChange = async (type: string) => {
  const bt = type as BookingType
  setBookingType(bt)
  if (bt === "INSTANT") {
    await updateCart({ bookingType: "INSTANT", timeSlot: undefined, recurringType: undefined })
    setSelectedDate(null)
    setSelectedSlot(null)
  }
  // For SCHEDULED / RECURRING — don't update cart until sheet confirms
}
```

### Slot summary card (below tabs):
Rendered conditionally based on `bookingType`:
- **INSTANT**: info card
- **SCHEDULED**: slot summary or "Select Slot" card
- **RECURRING**: schedule summary or "Set Schedule" card

### Integration points:
1. On mount / when cart loads: restore `bookingType`, `timeSlot`, `recurringType` from `cart` into local state
2. On confirm from ScheduledSheet: call `updateCart(...)`, update local state, close sheet
3. On confirm from RecurringSheet: call `updateCart(...)`, update local state, close sheet

---

## 9. Checkout Screen Impact

**No changes needed.** The checkout screen already reads `cart.bookingType` and conditionally shows/hides the inline `SlotSelector`:

```tsx
const isInstant = cart.bookingType === "INSTANT"

{!isInstant && (
  <View style={styles.section}>
    <SlotSelector ... />
  </View>
)}
```

With the new flow, the slot is already saved on the cart (via `updateCart` from the bottom sheets), so the checkout screen's slot selector becomes redundant. **Option:** Keep it as a fallback/override, or remove it and show a read-only summary of the selected slot. Decision deferred.

---

## 10. API Types Reference

From `apps/mobile/src/types/api.ts`:

```ts
export type BookingType = "INSTANT" | "SCHEDULED" | "RECURRING"
export type RecurringType = "WEEKLY" | "BIWEEKLY" | "MONTHLY"

export interface BookingSlot {
  startTime: string
  isFull: boolean
  isExperiencingSurge: boolean
  surgePrice: number
}

export interface Cart {
  id: string
  items: CartItem[]
  bookingType: BookingType
  recurringType?: RecurringType
  timeSlot?: { time: { start: string }[] }
  totalPrice: string
  finalTotalAmount: string
  // ... other fields
}
```

---

## 11. Theme Tokens to Use

use colors form global.css use blue-03 primary color and check css and use whatever colors that macthes tabs border should be border-[Dee0e3]

---

## 12. Implementation Order

1. Create `slot-picker.tsx` — shared date chip + time slot grid component
2. Create `scheduled-sheet.tsx` — Scheduled bottom sheet
3. Create `recurring-sheet.tsx` — Recurring bottom sheet
4. Update `cart.tsx` — add Tabs, state, summary cards, wire sheets
5. Test all three tabs with slot selection flow
6. (Optional) Clean up checkout screen's inline SlotSelector if now redundant

---

## 13. Edge Cases & Notes

- **Cart is empty:** Tabs should be hidden. Already handled by existing empty state.
- **Address not selected:** Slot fetching needs lat/lng. Show "Select address first" if no address.
- **No slots available:** Show "No slots available for this date" message in the sheet.
- **Slots loading:** Show Spinner inside the sheet while slots are being fetched.
- **IDEMPOTENCY:** Not needed for `updateCart` — it's not a checkout operation.
- **select-slot screen:** The screen registered in `(screens)/_layout.tsx` will NOT be created. The registration can be left as-is or removed.
