// /**
//  * GradientButton.jsx
//  * ─────────────────────────────────────────────────────────────
//  * Matches Figma spec exactly:
//  *   - Linear gradient: #6199FF (0%) → #045CFB (100%)
//  *   - Pill shape (rounded-full)
//  *   - Left icon + label + right arrow
//  *   - Shadow/xs elevation
//  *   - Sizes: sm | md | lg | xl (XL = Figma default)
//  *   - Pressed state: slight opacity + scale feedback
//  *   - Disabled state: opacity-45
//  *
//  * Usage:
//  *   import GradientButton from '@/components/GradientButton';
//  *
//  *   <GradientButton
//  *     label="I'm new here"
//  *     leftIcon={<ClockIcon />}    ← your icon component
//  *     showArrow
//  *     size="xl"
//  *     onPress={() => {}}
//  *   />
//  *
//  * ─────────────────────────────────────────────────────────────
//  * IMPORTANT — React Native can't use CSS gradients.
//  * We use expo-linear-gradient which is already included
//  * in Expo SDK. No extra install needed for managed workflow.
//  *
//  * If bare workflow:  npx expo install expo-linear-gradient
//  * ─────────────────────────────────────────────────────────────
//  */

// import React from "react"
// import {
//   ActivityIndicator,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   Text,
//   View,
// } from "react-native"
// import { LinearGradient } from "expo-linear-gradient"

// // ─── Drop shadows per size ────────────────────────────────────
// // React Native shadows need style prop — can't use className here.
// const shadows = {
//   sm: {
//     shadowColor: "#045CFB",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   md: {
//     shadowColor: "#045CFB",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.28,
//     shadowRadius: 6,
//     elevation: 5,
//   },
//   lg: {
//     shadowColor: "#045CFB",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 7,
//   },
//   xl: {
//     // Figma: Shadows/xs — colored glow matching the gradient
//     shadowColor: "#1A5CF8",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//     elevation: 8,
//   },
// }

// type ButtonSize = keyof typeof SIZES

// // ─── Size tokens (matches your Figma XL as default) ──────────
// const SIZES = {
//   sm: {
//     px: 16,
//     py: 10,
//     gap: 6,
//     text: "text-body-s",
//     fontWeight: "font-semibold",
//     tracking: "tracking-[-0.2px]",
//     iconSize: 14,
//     arrowSize: "text-body-s",
//     shadow: shadows.sm,
//   },
//   md: {
//     px: 20,
//     py: 12,
//     gap: 7,
//     text: "text-body-m",
//     fontWeight: "font-semibold",
//     tracking: "tracking-[-0.2px]",
//     iconSize: 16,
//     arrowSize: "text-body-m",
//     shadow: shadows.md,
//   },
//   lg: {
//     px: 24,
//     py: 14,
//     gap: 8,
//     text: "text-body-l",
//     fontWeight: "font-semibold",
//     tracking: "tracking-[-0.2px]",
//     iconSize: 18,
//     arrowSize: "text-body-l",
//     shadow: shadows.lg,
//   },
//   xl: {
//     px: 28,
//     py: 16,
//     gap: 8,
//     text: "text-body-l",
//     fontWeight: "font-semibold",
//     tracking: "tracking-[-0.2px]",
//     iconSize: 20,
//     arrowSize: "text-body-l",
//     shadow: shadows.xl,
//   },
// }

// // ─── Gradient stops (from your Figma) ────────────────────────
// const GRADIENT = {
//   colors: ["#6199FF", "#045CFB"] as const,
//   start: { x: 0, y: 0.5 },
//   end: { x: 1, y: 0.5 },
// }

// // ─── Default icons (simple, no extra dep needed) ─────────────
// // Replace these with your icon library (e.g. @expo/vector-icons)
// const DefaultClockIcon = ({ size = 18, color = "#fff" }) => (
//   <View
//     style={{
//       width: size,
//       height: size,
//       borderRadius: size / 2,
//       borderWidth: 1.5,
//       borderColor: color,
//       alignItems: "center",
//       justifyContent: "center",
//     }}
//   >
//     {/* Clock hands */}
//     <View
//       style={{
//         position: "absolute",
//         width: 1.5,
//         height: size * 0.3,
//         backgroundColor: color,
//         bottom: "50%",
//         left: "50%",
//         marginLeft: -0.75,
//       }}
//     />
//     <View
//       style={{
//         position: "absolute",
//         width: size * 0.28,
//         height: 1.5,
//         backgroundColor: color,
//         left: "50%",
//         top: "50%",
//         marginTop: -0.75,
//       }}
//     />
//   </View>
// )

// const ArrowRight = ({ size = 16, color = "#fff" }) => (
//   <Text
//     style={{ color, fontSize: size, fontWeight: "600", lineHeight: size + 2 }}
//   >
//     →
//   </Text>
// )

// // ─── Main component ───────────────────────────────────────────
// export default function GradientButton({
//   label = "I'm new here",
//   size = "xl",
//   leftIcon,
//   rightIcon,
//   showArrow = true,
//   onPress,
//   disabled = false,
//   loading = false,
//   fullWidth = false,
//   style,
// }) {
//   const s = SIZES[size as ButtonSize] ?? SIZES.xl

//   return (
//     <Pressable
//       onPress={onPress}
//       disabled={disabled || loading}
//       style={({ pressed }) => [
//         {
//           alignSelf: fullWidth ? "stretch" : "flex-start",
//           borderRadius: 9999,
//           opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
//           transform: [{ scale: pressed && !disabled ? 0.975 : 1 }],
//           ...s.shadow,
//         },
//         style,
//       ]}
//     >
//       <LinearGradient
//         colors={GRADIENT.colors}
//         start={GRADIENT.start}
//         end={GRADIENT.end}
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "center",
//           gap: s.gap,
//           paddingHorizontal: s.px,
//           paddingVertical: s.py,
//           borderRadius: 9999,
//         }}
//       >
//         {/* Left icon or loading spinner */}
//         {loading ? (
//           <ActivityIndicator size="small" color="#fff" />
//         ) : leftIcon ? (
//           <View
//             style={{
//               width: s.iconSize,
//               height: s.iconSize,
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             {leftIcon}
//           </View>
//         ) : (
//           <DefaultClockIcon size={s.iconSize} color="#fff" />
//         )}

//         {/* Label */}
//         <Text
//           className={`${s.text} ${s.fontWeight} ${s.tracking}`}
//           style={{ color: "#ffffff", includeFontPadding: false }}
//           numberOfLines={1}
//         >
//           {loading ? "Loading..." : label}
//         </Text>

//         {/* Right icon / arrow */}
//         {!loading &&
//           (showArrow || rightIcon) &&
//           (rightIcon ?? <ArrowRight size={s.iconSize - 2} color="#fff" />)}
//       </LinearGradient>
//     </Pressable>
//   )
// }

// // ─────────────────────────────────────────────────────────────
// // VARIANT: Outline gradient border button
// // Shows gradient border with transparent fill
// // ─────────────────────────────────────────────────────────────
// export function GradientOutlineButton({
//   label = "I'm new here",
//   size = "xl",
//   leftIcon,
//   showArrow = true,
//   onPress,
//   disabled = false,
//   style,
// }) {
//   const s = SIZES[size as ButtonSize] ?? SIZES.xl

//   return (
//     <Pressable
//       onPress={onPress}
//       disabled={disabled}
//       style={({ pressed }) => [
//         {
//           alignSelf: "flex-start",
//           borderRadius: 9999,
//           opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
//           transform: [{ scale: pressed && !disabled ? 0.975 : 1 }],
//           padding: 2, // border thickness
//         },
//         style,
//       ]}
//     >
//       {/* Gradient border layer */}
//       <LinearGradient
//         colors={GRADIENT.colors}
//         start={GRADIENT.start}
//         end={GRADIENT.end}
//         style={{ borderRadius: 9999, padding: 2 }}
//       >
//         {/* White inner fill */}
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "center",
//             gap: s.gap,
//             paddingHorizontal: s.px - 2,
//             paddingVertical: s.py - 2,
//             borderRadius: 9999,
//             backgroundColor: "#ffffff",
//           }}
//         >
//           {leftIcon ?? <DefaultClockIcon size={s.iconSize} color="#045CFB" />}
//           <Text
//             className={`${s.text} ${s.fontWeight} ${s.tracking}`}
//             style={{ color: "#045CFB", includeFontPadding: false }}
//             numberOfLines={1}
//           >
//             {label}
//           </Text>
//           {showArrow && <ArrowRight size={s.iconSize - 2} color="#045CFB" />}
//         </View>
//       </LinearGradient>
//     </Pressable>
//   )
// }

// export function GradientButtonPlayground() {
//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <ScrollView
//         contentContainerStyle={{ padding: 24, gap: 32 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ── Figma exact match ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             Figma exact — XL solid
//           </Text>
//           <GradientButton label="I'm new here" size="xl" showArrow />
//         </View>

//         {/* ── All sizes ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             All sizes
//           </Text>
//           <GradientButton label="Small button" size="sm" showArrow />
//           <GradientButton label="Medium button" size="md" showArrow />
//           <GradientButton label="Large button" size="lg" showArrow />
//           <GradientButton label="XL button" size="xl" showArrow />
//         </View>

//         {/* ── Full width ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             Full width
//           </Text>
//           <GradientButton
//             label="Book your first service"
//             size="xl"
//             showArrow
//             fullWidth
//           />
//         </View>

//         {/* ── States ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             States
//           </Text>
//           <GradientButton label="Normal" size="xl" showArrow />
//           <GradientButton label="Loading…" size="xl" loading />
//           <GradientButton label="Disabled" size="xl" showArrow disabled />
//         </View>

//         {/* ── Label-only variants ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             No icon / no arrow
//           </Text>
//           <GradientButton
//             label="Get started"
//             size="xl"
//             leftIcon={null}
//             showArrow={false}
//           />
//           <GradientButton
//             label="Continue"
//             size="xl"
//             leftIcon={<View />}
//             showArrow
//           />
//         </View>

//         {/* ── Outline variant ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             Outline / ghost variant
//           </Text>
//           <GradientOutlineButton label="I'm new here" size="xl" showArrow />
//           <GradientOutlineButton label="Explore services" size="lg" showArrow />
//         </View>

//         {/* ── Side by side comparison ── */}
//         <View className="gap-3">
//           <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
//             Side by side
//           </Text>
//           <View className="flex-row flex-wrap gap-3">
//             <GradientButton label="I'm new" size="md" showArrow />
//             <GradientOutlineButton
//               label="Sign in"
//               size="md"
//               showArrow={false}
//               leftIcon={<View />}
//             />
//           </View>
//         </View>

//         {/* ── Real usage context ── */}
//         <View className="bg-surface gap-4 rounded-3xl border border-border p-6">
//           <Text className="text-h5 font-bold tracking-[-0.5px] text-foreground">
//             Welcome to HomeServe
//           </Text>
//           <Text className="text-body-s leading-[24px] text-muted">
//             Book trusted professionals for plumbing, electrical, cleaning and
//             more.
//           </Text>
//           <GradientButton label="I'm new here" size="xl" showArrow fullWidth />
//           <GradientOutlineButton
//             label="Sign in to my account"
//             size="xl"
//             showArrow={false}
//             leftIcon={<View />}
//           />
//         </View>

//         <View className="h-8" />
//       </ScrollView>
//     </SafeAreaView>
//   )
// }

import React from "react"
import { Pressable, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

function GradientButton({ label = "I'm new here", onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <LinearGradient
        colors={["#6199FF", "#045CFB"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 28,
          paddingVertical: 16,
          borderRadius: 9999,
          shadowColor: "#1A5CF8",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
          ⏱ {label} →
        </Text>
      </LinearGradient>
    </Pressable>
  )
}

// Any screen

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <GradientButton
        label="I'm new here"
        onPress={() => console.log("pressed")}
      />
    </View>
  )
}
