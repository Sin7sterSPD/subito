/**
 * ThemePlayground.jsx
 * ─────────────────────────────────────────────────────────────
 * Drop this anywhere in your Expo app to test that your
 * global.css tokens, typography scale, color palette, and
 * HeroUI Native components are all wired up correctly.
 *
 * Usage:
 *   import ThemePlayground from './ThemePlayground';
 *   // In any screen:
 *   export default function TestScreen() {
 *     return <ThemePlayground />;
 *   }
 *
 * What it tests:
 *   ✓ All semantic color tokens (bg-*, text-*, border-*)
 *   ✓ Full primitive palette (gray, blue, green, orange, red)
 *   ✓ Full typography scale (display → caption-s)
 *   ✓ HeroUI Button all variants
 *   ✓ HeroUI Chip / Badge colors
 *   ✓ HeroUI Card anatomy
 *   ✓ Status color rows (success / warning / danger)
 *   ✓ Border & separator tokens
 *   ✓ Surface hierarchy
 *   ✓ Real home-service UI card (booking card preview)
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState } from "react"
import { ScrollView, View, Text, Pressable, SafeAreaView } from "react-native"
import { Link } from "expo-router"

// ─── HeroUI Native components ────────────────────────────────
// Uncomment each import as you confirm it's installed:
// import { Button, Chip, Card, Avatar, Badge } from 'heroui-native';

// ─── Helpers ─────────────────────────────────────────────────

interface SectionProps {
  title: string
  children: React.ReactNode
}

const Section = ({ title, children }: SectionProps) => (
  <View className="mb-8">
    <View className="border-separator mb-3 border-b pb-2">
      <Text className="text-caption-l font-semibold tracking-[1px] text-muted uppercase">
        {title}
      </Text>
    </View>
    {children}
  </View>
)

const Row = ({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) => (
  <View className={`flex-row flex-wrap gap-2 ${className}`}>{children}</View>
)

// A single color swatch tile
const Swatch = ({
  bg,
  label,
  textClass = "text-gray-12",
}: {
  bg: string
  label: string
  textClass?: string
}) => (
  <View className="items-center gap-1" style={{ width: 56 }}>
    <View className={`h-10 w-14 rounded-lg border border-border ${bg}`} />
    <Text className={`text-caption-s ${textClass}`} numberOfLines={1}>
      {label}
    </Text>
  </View>
)

// A semantic token row: background swatch + class name + hex
const TokenRow = ({
  bgClass,
  textClass,
  label,
  hex,
  borderClass = "",
}: {
  bgClass: string
  textClass: string
  label: string
  hex: string
  borderClass?: string
}) => (
  <View className="flex-row items-center gap-3 border-b border-border py-2">
    <View className={`h-8 w-8 rounded-md border ${bgClass} ${borderClass}`} />
    <View className="flex-1">
      <Text className="text-body-s font-medium text-foreground">{label}</Text>
      <Text className="text-caption-m text-muted">{bgClass}</Text>
    </View>
    <Text
      className="text-caption-m font-medium"
      style={{ fontFamily: "monospace" }}
    >
      {hex}
    </Text>
  </View>
)

interface TypeRowProps {
  sizeClass: string
  lineClass: string
  trackClass: string
  label: string
  sizeLabel: string
  weight?: string
}

// Typography specimen row
const TypeRow = ({
  sizeClass,
  lineClass,
  trackClass,
  label,
  sizeLabel,
  weight = "font-normal",
}: TypeRowProps) => (
  <View className="border-b border-border py-3">
    <View className="mb-1 flex-row items-baseline justify-between">
      <Text className="text-caption-m text-muted">{label}</Text>
      <Text className="text-caption-s text-muted">{sizeLabel}</Text>
    </View>
    <Text
      className={`${sizeClass} ${lineClass} ${trackClass} ${weight} text-foreground`}
    >
      Fix your home, fast.
    </Text>
  </View>
)

// ─── Main component ───────────────────────────────────────────
export default function ThemePlayground() {
  const [activeTab, setActiveTab] = useState("tokens")

  const tabs = [
    { id: "tokens", label: "Colors" },
    { id: "type", label: "Type" },
    { id: "components", label: "Components" },
    { id: "preview", label: "Preview" },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ── Header ── */}
      <View className="px-4 pt-4 pb-0">
        <Text className="text-h5 font-bold tracking-[-0.5px] text-foreground">
          Theme Playground
        </Text>
        <Text className="text-body-s mt-0.5 text-muted">
          global.css token verification
        </Text>

        {/* Tab bar */}
        <View className="bg-surface-secondary mt-4 flex-row gap-1 rounded-xl p-1">
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 items-center rounded-lg py-2 ${
                activeTab === tab.id ? "bg-surface shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-caption-l font-medium ${
                  activeTab === tab.id ? "text-accent" : "text-muted"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════
            TAB 1 — COLOR TOKENS
        ════════════════════════════════════════════════════ */}
        {activeTab === "tokens" && (
          <View>
            {/* Semantic tokens */}
            <Section title="Semantic tokens — use these in className">
              <TokenRow
                bgClass="bg-background"
                borderClass="border-border"
                label="background"
                hex="#F7F7F8"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-surface"
                borderClass="border-border"
                label="surface"
                hex="#FFFFFF"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-surface-secondary"
                borderClass="border-border"
                label="surface-secondary"
                hex="#F7F7F8"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-surface-tertiary"
                borderClass="border-border"
                label="surface-tertiary"
                hex="#E9EAEC"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-default"
                borderClass="border-border"
                label="default"
                hex="#E9EAEC"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-accent"
                label="accent"
                hex="#1D54E2"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-muted"
                label="muted (text only)"
                hex="#7E869A"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-success"
                label="success"
                hex="#26BD6C"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-warning"
                label="warning"
                hex="#F48E2F"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-danger"
                label="danger"
                hex="#E6483D"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-border"
                borderClass="border-border"
                label="border"
                hex="#DEE0E3"
                textClass={""}
              />
              <TokenRow
                bgClass="bg-separator"
                borderClass="border-border"
                label="separator"
                hex="#C8CAD0"
                textClass={""}
              />
            </Section>

            {/* Foreground tokens */}
            <Section title="Foreground (text) tokens">
              <View className="bg-gray-12 gap-2 rounded-xl p-4">
                <Text className="text-body-m font-semibold text-foreground">
                  Hmm — text-foreground on bg-foreground? (testing contrast)
                </Text>
              </View>
              <View className="bg-surface mt-2 gap-2 rounded-xl border border-border p-4">
                <Text className="text-body-m font-semibold text-foreground">
                  text-foreground
                </Text>
                <Text className="text-body-s text-muted">
                  text-muted — secondary / hint text
                </Text>
                <Text className="text-body-s text-accent">
                  text-accent — links and CTAs
                </Text>
                <Text className="text-body-s text-success">
                  text-success — confirmations
                </Text>
                <Text className="text-body-s text-warning">
                  text-warning — caution states
                </Text>
                <Text className="text-body-s text-danger">
                  text-danger — errors and alerts
                </Text>
                <Text className="text-body-s text-default-foreground">
                  text-default-foreground
                </Text>
              </View>
            </Section>

            {/* Gray palette */}
            <Section title="Gray palette (01 → 13)">
              <Row>
                {[
                  { bg: "bg-gray-01", label: "01" },
                  { bg: "bg-gray-02", label: "02" },
                  { bg: "bg-gray-03", label: "03" },
                  { bg: "bg-gray-04", label: "04" },
                  { bg: "bg-gray-05", label: "05" },
                  { bg: "bg-gray-06", label: "06" },
                  { bg: "bg-gray-07", label: "07" },
                  { bg: "bg-gray-08", label: "08" },
                  { bg: "bg-gray-09", label: "09" },
                  { bg: "bg-gray-10", label: "10" },
                  { bg: "bg-gray-11", label: "11" },
                  { bg: "bg-gray-12", label: "12" },
                  { bg: "bg-gray-13", label: "13" },
                ].map((s) => (
                  <Swatch key={s.label} bg={s.bg} label={s.label} />
                ))}
              </Row>
            </Section>

            {/* Blue palette */}
            <Section title="Blue palette (01 → 13)">
              <Row>
                {[
                  "bg-blue-01",
                  "bg-blue-02",
                  "bg-blue-03",
                  "bg-blue-04",
                  "bg-blue-05",
                  "bg-blue-06",
                  "bg-blue-07",
                  "bg-blue-08",
                  "bg-blue-09",
                  "bg-blue-10",
                  "bg-blue-11",
                  "bg-blue-12",
                  "bg-blue-13",
                ].map((bg, i) => (
                  <Swatch key={i} bg={bg} label={`0${i + 1}`.slice(-2)} />
                ))}
              </Row>
            </Section>

            {/* Green palette */}
            <Section title="Green palette (01 → 13)">
              <Row>
                {[
                  "bg-green-01",
                  "bg-green-02",
                  "bg-green-03",
                  "bg-green-04",
                  "bg-green-05",
                  "bg-green-06",
                  "bg-green-07",
                  "bg-green-08",
                  "bg-green-09",
                  "bg-green-10",
                  "bg-green-11",
                  "bg-green-12",
                  "bg-green-13",
                ].map((bg, i) => (
                  <Swatch key={i} bg={bg} label={`0${i + 1}`.slice(-2)} />
                ))}
              </Row>
            </Section>

            {/* Orange palette */}
            <Section title="Orange palette (01 → 13)">
              <Row>
                {[
                  "bg-orange-01",
                  "bg-orange-02",
                  "bg-orange-03",
                  "bg-orange-04",
                  "bg-orange-05",
                  "bg-orange-06",
                  "bg-orange-07",
                  "bg-orange-08",
                  "bg-orange-09",
                  "bg-orange-10",
                  "bg-orange-11",
                  "bg-orange-12",
                  "bg-orange-13",
                ].map((bg, i) => (
                  <Swatch key={i} bg={bg} label={`0${i + 1}`.slice(-2)} />
                ))}
              </Row>
            </Section>

            {/* Red palette */}
            <Section title="Red palette (01 → 13)">
              <Row>
                {[
                  "bg-red-01",
                  "bg-red-02",
                  "bg-red-03",
                  "bg-red-04",
                  "bg-red-05",
                  "bg-red-06",
                  "bg-red-07",
                  "bg-red-08",
                  "bg-red-09",
                  "bg-red-10",
                  "bg-red-11",
                  "bg-red-12",
                  "bg-red-13",
                ].map((bg, i) => (
                  <Swatch key={i} bg={bg} label={`0${i + 1}`.slice(-2)} />
                ))}
              </Row>
            </Section>

            {/* Soft color backgrounds (status + tints) */}
            <Section title="Soft status backgrounds">
              <View className="gap-2">
                <View className="bg-green-01 border-green-03 flex-row items-center gap-3 rounded-xl border px-4 py-3">
                  <View className="bg-success h-2 w-2 rounded-full" />
                  <Text className="text-body-s text-green-11 font-medium">
                    Success — booking confirmed
                  </Text>
                </View>
                <View className="bg-orange-01 border-orange-03 flex-row items-center gap-3 rounded-xl border px-4 py-3">
                  <View className="bg-warning h-2 w-2 rounded-full" />
                  <Text className="text-body-s text-orange-11 font-medium">
                    Warning — technician arriving soon
                  </Text>
                </View>
                <View className="bg-red-01 border-red-03 flex-row items-center gap-3 rounded-xl border px-4 py-3">
                  <View className="bg-danger h-2 w-2 rounded-full" />
                  <Text className="text-body-s text-red-11 font-medium">
                    Error — payment failed
                  </Text>
                </View>
                <View className="bg-blue-01 border-blue-03 flex-row items-center gap-3 rounded-xl border px-4 py-3">
                  <View className="h-2 w-2 rounded-full bg-accent" />
                  <Text className="text-body-s text-blue-11 font-medium">
                    Info — new services available in your area
                  </Text>
                </View>
              </View>
            </Section>

            {/* Border tokens */}
            <Section title="Border & separator tokens">
              <View className="gap-3">
                <View className="rounded-xl border border-border p-4">
                  <Text className="text-body-s text-foreground">
                    border-border (--gray-03 #DEE0E3)
                  </Text>
                </View>
                <View className="border-separator rounded-xl border-2 p-4">
                  <Text className="text-body-s text-foreground">
                    border-separator (--gray-04 #C8CAD0)
                  </Text>
                </View>
                <View className="rounded-xl border-2 border-accent p-4">
                  <Text className="text-body-s font-medium text-accent">
                    border-accent (#1D54E2)
                  </Text>
                </View>
                <View className="border-danger rounded-xl border-2 p-4">
                  <Text className="text-body-s text-danger font-medium">
                    border-danger (#E6483D)
                  </Text>
                </View>
                <View className="border-success rounded-xl border-2 p-4">
                  <Text className="text-body-s text-success font-medium">
                    border-success (#26BD6C)
                  </Text>
                </View>
              </View>
            </Section>

            {/* Surface hierarchy */}
            <Section title="Surface hierarchy">
              <View className="rounded-2xl border border-border bg-background p-4">
                <Text className="text-caption-m mb-3 text-muted">
                  bg-background (canvas)
                </Text>
                <View className="bg-surface rounded-xl border border-border p-4">
                  <Text className="text-caption-m mb-2 text-muted">
                    bg-surface (card)
                  </Text>
                  <View className="bg-surface-secondary rounded-lg p-3">
                    <Text className="text-caption-m mb-2 text-muted">
                      bg-surface-secondary
                    </Text>
                    <View className="bg-surface-tertiary rounded-md p-3">
                      <Text className="text-caption-m text-muted">
                        bg-surface-tertiary
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Section>
          </View>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 2 — TYPOGRAPHY
        ════════════════════════════════════════════════════ */}
        {activeTab === "type" && (
          <View>
            <Section title="Type scale — your Figma spec">
              <TypeRow
                label="Display"
                sizeLabel="96px / 100 / -3.6"
                sizeClass="text-display"
                lineClass="leading-[100px]"
                trackClass="tracking-[-3.6px]"
                weight="font-bold"
              />
              <TypeRow
                label="H1"
                sizeLabel="72px / 80 / -2.2"
                sizeClass="text-h1"
                lineClass="leading-[80px]"
                trackClass="tracking-[-2.2px]"
                weight="font-bold"
              />
              <TypeRow
                label="H2"
                sizeLabel="64px / 72 / -1.7"
                sizeClass="text-h2"
                lineClass="leading-[72px]"
                trackClass="tracking-[-1.7px]"
                weight="font-bold"
              />
              <TypeRow
                label="H3"
                sizeLabel="48px / 56 / -1"
                sizeClass="text-h3"
                lineClass="leading-[56px]"
                trackClass="tracking-[-1px]"
                weight="font-semibold"
              />
              <TypeRow
                label="H4"
                sizeLabel="36px / 44 / -0.7"
                sizeClass="text-h4"
                lineClass="leading-[44px]"
                trackClass="tracking-[-0.7px]"
                weight="font-semibold"
              />
              <TypeRow
                label="H5"
                sizeLabel="30px / 36 / -0.5"
                sizeClass="text-h5"
                lineClass="leading-[36px]"
                trackClass="tracking-[-0.5px]"
                weight="font-semibold"
              />
              <TypeRow
                label="H6"
                sizeLabel="24px / 32 / -0.3"
                sizeClass="text-h6"
                lineClass="leading-[32px]"
                trackClass="tracking-[-0.3px]"
                weight="font-medium"
              />
              <TypeRow
                label="Body L"
                sizeLabel="20px / 28 / -0.2"
                sizeClass="text-body-l"
                lineClass="leading-[28px]"
                trackClass="tracking-[-0.2px]"
                weight="font-normal"
              />
              <TypeRow
                label="Body M"
                sizeLabel="18px / 26 / -0.2"
                sizeClass="text-body-m"
                lineClass="leading-[26px]"
                trackClass="tracking-[-0.2px]"
                weight="font-normal"
              />
              <TypeRow
                label="Body S"
                sizeLabel="16px / 24 / -0.3"
                sizeClass="text-body-s"
                lineClass="leading-[24px]"
                trackClass="tracking-[-0.3px]"
                weight="font-normal"
              />
              <TypeRow
                label="Caption L"
                sizeLabel="14px / 20 / -0.1"
                sizeClass="text-caption-l"
                lineClass="leading-[20px]"
                trackClass="tracking-[-0.1px]"
                weight="font-normal"
              />
              <TypeRow
                label="Caption M"
                sizeLabel="12px / 16 / 0"
                sizeClass="text-caption-m"
                lineClass="leading-[16px]"
                trackClass="tracking-[0px]"
                weight="font-normal"
              />
              <TypeRow
                label="Caption S"
                sizeLabel="10px / 14 / 0"
                sizeClass="text-caption-s"
                lineClass="leading-[14px]"
                trackClass="tracking-[0px]"
                weight="font-normal"
              />
            </Section>

            {/* Weight spectrum */}
            <Section title="Font weight spectrum — Body M (18px)">
              <View className="bg-surface gap-3 rounded-xl border border-border p-4">
                {[
                  ["font-light", "300 Light", "Book a service"],
                  ["font-normal", "400 Regular", "Book a service"],
                  ["font-medium", "500 Medium", "Book a service"],
                  ["font-semibold", "600 Semi Bold", "Book a service"],
                  ["font-bold", "700 Bold", "Book a service"],
                  ["font-extrabold", "800 Extra Bold", "Book a service"],
                  ["font-black", "900 Black", "Book a service"],
                ].map(([cls, label, text]) => (
                  <View
                    key={cls}
                    className="flex-row items-center justify-between"
                  >
                    <Text className="text-caption-m w-28 text-muted">
                      {label}
                    </Text>
                    <Text
                      className={`text-body-m tracking-[-0.2px] text-foreground ${cls}`}
                    >
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>

            {/* Real text hierarchy demo */}
            <Section title="Real hierarchy — service listing card copy">
              <View className="bg-surface gap-1 rounded-2xl border border-border p-5">
                <Text className="text-caption-m font-semibold tracking-[0.5px] text-accent uppercase">
                  Most popular
                </Text>
                <Text className="text-h5 mt-1 font-bold tracking-[-0.5px] text-foreground">
                  Deep Home Cleaning
                </Text>
                <Text className="text-body-s mt-1 leading-[22px] text-muted">
                  Professional cleaning for every room. Our trained staff uses
                  eco-friendly products and arrives fully equipped.
                </Text>
                <View className="mt-3 flex-row items-center gap-2">
                  <Text className="text-h6 font-bold tracking-[-0.3px] text-foreground">
                    ₹799
                  </Text>
                  <Text className="text-body-s text-muted line-through">
                    ₹1200
                  </Text>
                  <View className="bg-green-01 rounded-full px-2 py-0.5">
                    <Text className="text-caption-m text-green-10 font-semibold">
                      33% off
                    </Text>
                  </View>
                </View>
                <Text className="text-caption-l mt-1 text-muted">
                  ⏱ 3–4 hrs · ★ 4.8 (2.1k reviews)
                </Text>
              </View>
            </Section>

            {/* Letter spacing reference */}
            <Section title="Letter spacing visual reference">
              <View className="bg-surface gap-4 rounded-xl border border-border p-4">
                {[
                  ["tracking-[-3.6px]", "-3.6px", "Display tight"],
                  ["tracking-[-1px]", "-1px", "H3 tight"],
                  ["tracking-[-0.2px]", "-0.2px", "Body default"],
                  ["tracking-[0px]", "0px", "Caption default"],
                  ["tracking-[0.5px]", "+0.5px", "Label loose"],
                  ["tracking-[1px]", "+1px", "Tag wide"],
                ].map(([cls, val, label]) => (
                  <View key={val} className="gap-0.5">
                    <Text className="text-caption-s text-muted">
                      {label} ({val})
                    </Text>
                    <Text
                      className={`text-body-m font-medium text-foreground ${cls}`}
                    >
                      Home Services Platform
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          </View>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 3 — COMPONENTS
        ════════════════════════════════════════════════════ */}
        {activeTab === "components" && (
          <View>
            {/* ── Buttons (pure Pressable, mirrors HeroUI variants) ── */}
            <Section title="Buttons — all variants">
              {/* Primary */}
              <View className="gap-2">
                <Text className="text-caption-l text-muted">
                  Primary (variant=&quot;primary&quot;)
                </Text>
                <Row>
                  <Pressable className="rounded-xl bg-accent px-6 py-3 active:opacity-80">
                    <Text className="text-body-s font-semibold text-accent-foreground">
                      Book Now
                    </Text>
                  </Pressable>
                  <Pressable className="rounded-xl bg-accent px-4 py-3 active:opacity-80">
                    <Text className="text-body-s font-semibold text-accent-foreground">
                      sm
                    </Text>
                  </Pressable>
                  <Pressable className="rounded-lg bg-accent px-3 py-2 active:opacity-80">
                    <Text className="text-caption-l font-semibold text-accent-foreground">
                      xs
                    </Text>
                  </Pressable>
                </Row>

                {/* Secondary */}
                <Text className="text-caption-l mt-2 text-muted">
                  Secondary (variant=&quot;secondary&quot;)
                </Text>
                <Row>
                  <Pressable className="bg-default rounded-xl border border-border px-6 py-3 active:opacity-80">
                    <Text className="text-body-s font-semibold text-foreground">
                      View Details
                    </Text>
                  </Pressable>
                  <Pressable className="bg-default rounded-xl border border-border px-4 py-3 active:opacity-80">
                    <Text className="text-body-s font-semibold text-foreground">
                      Filter
                    </Text>
                  </Pressable>
                </Row>

                {/* Ghost */}
                <Text className="text-caption-l mt-2 text-muted">
                  Ghost / Tertiary
                </Text>
                <Row>
                  <Pressable className="active:bg-default rounded-xl px-6 py-3">
                    <Text className="text-body-s font-semibold text-accent">
                      Learn more
                    </Text>
                  </Pressable>
                  <Pressable className="active:bg-default rounded-xl px-6 py-3">
                    <Text className="text-body-s font-semibold text-muted">
                      Cancel
                    </Text>
                  </Pressable>
                </Row>

                {/* Danger */}
                <Text className="text-caption-l mt-2 text-muted">Danger</Text>
                <Row>
                  <Pressable className="bg-danger rounded-xl px-6 py-3 active:opacity-80">
                    <Text className="text-body-s text-danger-foreground font-semibold">
                      Cancel Booking
                    </Text>
                  </Pressable>
                  <Pressable className="bg-red-01 border-red-03 rounded-xl border px-6 py-3 active:opacity-80">
                    <Text className="text-body-s text-danger font-semibold">
                      Danger Soft
                    </Text>
                  </Pressable>
                </Row>

                {/* Success */}
                <Text className="text-caption-l mt-2 text-muted">Success</Text>
                <Row>
                  <Pressable className="bg-success rounded-xl px-6 py-3 active:opacity-80">
                    <Text className="text-body-s text-success-foreground font-semibold">
                      Confirm
                    </Text>
                  </Pressable>
                  <Pressable className="bg-green-01 border-green-03 rounded-xl border px-6 py-3 active:opacity-80">
                    <Text className="text-body-s text-success font-semibold">
                      Success Soft
                    </Text>
                  </Pressable>
                </Row>

                {/* Disabled */}
                <Text className="text-caption-l mt-2 text-muted">
                  Disabled state
                </Text>
                <Row>
                  <Pressable
                    className="rounded-xl bg-accent px-6 py-3 opacity-45"
                    disabled
                  >
                    <Text className="text-body-s font-semibold text-accent-foreground">
                      Unavailable
                    </Text>
                  </Pressable>
                  <Pressable
                    className="bg-default rounded-xl border border-border px-6 py-3 opacity-45"
                    disabled
                  >
                    <Text className="text-body-s font-semibold text-foreground">
                      Disabled
                    </Text>
                  </Pressable>
                </Row>

                {/* Full width */}
                <Text className="text-caption-l mt-2 text-muted">
                  Full width
                </Text>
                <Pressable className="items-center rounded-xl bg-accent py-4 active:opacity-80">
                  <Text className="text-body-m font-semibold text-accent-foreground">
                    Confirm Booking — ₹799
                  </Text>
                </Pressable>
              </View>
            </Section>

            {/* ── Chips / Badges / Tags ── */}
            <Section title="Chips & badges">
              <Row className="mb-3">
                <View className="bg-blue-01 border-blue-03 rounded-full border px-3 py-1.5">
                  <Text className="text-caption-l text-blue-10 font-medium">
                    Plumbing
                  </Text>
                </View>
                <View className="bg-green-01 border-green-03 rounded-full border px-3 py-1.5">
                  <Text className="text-caption-l text-green-10 font-medium">
                    Cleaning
                  </Text>
                </View>
                <View className="bg-orange-01 border-orange-03 rounded-full border px-3 py-1.5">
                  <Text className="text-caption-l text-orange-10 font-medium">
                    Electrician
                  </Text>
                </View>
                <View className="bg-red-01 border-red-03 rounded-full border px-3 py-1.5">
                  <Text className="text-caption-l text-red-10 font-medium">
                    Urgent
                  </Text>
                </View>
              </Row>

              {/* Solid chips */}
              <Row className="mb-3">
                <View className="rounded-full bg-accent px-3 py-1.5">
                  <Text className="text-caption-l font-semibold text-accent-foreground">
                    Active
                  </Text>
                </View>
                <View className="bg-success rounded-full px-3 py-1.5">
                  <Text className="text-caption-l text-success-foreground font-semibold">
                    Confirmed
                  </Text>
                </View>
                <View className="bg-warning rounded-full px-3 py-1.5">
                  <Text className="text-caption-l text-warning-foreground font-semibold">
                    Pending
                  </Text>
                </View>
                <View className="bg-danger rounded-full px-3 py-1.5">
                  <Text className="text-caption-l text-danger-foreground font-semibold">
                    Cancelled
                  </Text>
                </View>
              </Row>

              {/* Outline chips */}
              <Row>
                <View className="rounded-full border border-border px-3 py-1.5">
                  <Text className="text-caption-l text-foreground">All</Text>
                </View>
                <View className="rounded-full border border-accent px-3 py-1.5">
                  <Text className="text-caption-l font-medium text-accent">
                    Popular ✓
                  </Text>
                </View>
                <View className="rounded-full border border-border px-3 py-1.5">
                  <Text className="text-caption-l text-muted">Nearby</Text>
                </View>
                <View className="rounded-full border border-border px-3 py-1.5">
                  <Text className="text-caption-l text-muted">Top Rated</Text>
                </View>
              </Row>
            </Section>

            {/* ── Input fields ── */}
            <Section title="Input fields">
              <View className="gap-3">
                {/* Default input */}
                <View>
                  <Text className="text-caption-l mb-1.5 font-medium text-foreground">
                    Address
                  </Text>
                  <View className="bg-field border-field-border rounded-xl border px-4 py-3.5">
                    <Text className="text-body-s text-field-placeholder">
                      Enter your full address
                    </Text>
                  </View>
                </View>

                {/* Focused input (simulated) */}
                <View>
                  <Text className="text-caption-l mb-1.5 font-medium text-foreground">
                    Phone number <Text className="text-danger">*</Text>
                  </Text>
                  <View className="bg-field rounded-xl border-2 border-accent px-4 py-3.5">
                    <Text className="text-body-s text-field-foreground">
                      +91 98765 43210
                    </Text>
                  </View>
                </View>

                {/* Error input */}
                <View>
                  <Text className="text-caption-l mb-1.5 font-medium text-foreground">
                    Pincode
                  </Text>
                  <View className="bg-field border-danger rounded-xl border-2 px-4 py-3.5">
                    <Text className="text-body-s text-field-foreground">
                      560001
                    </Text>
                  </View>
                  <Text className="text-caption-m text-danger mt-1.5">
                    Service not available in this area
                  </Text>
                </View>

                {/* Disabled input */}
                <View className="opacity-45">
                  <Text className="text-caption-l mb-1.5 font-medium text-foreground">
                    City (auto-detected)
                  </Text>
                  <View className="bg-surface-secondary rounded-xl border border-border px-4 py-3.5">
                    <Text className="text-body-s text-muted">Bangalore</Text>
                  </View>
                </View>
              </View>
            </Section>

            {/* ── Radius variants ── */}
            <Section title="Border radius variants">
              <Row>
                {[
                  ["rounded-sm", "4px", "sm"],
                  ["rounded-md", "8px", "md"],
                  ["rounded-lg", "12px", "lg"],
                  ["rounded-xl", "16px", "xl"],
                  ["rounded-2xl", "20px", "2xl"],
                  ["rounded-3xl", "24px", "3xl"],
                  ["rounded-full", "∞", "full"],
                ].map(([cls, px, label]) => (
                  <View key={cls} className="items-center gap-1.5">
                    <View
                      className={`bg-blue-01 border-blue-04 h-10 w-14 border ${cls}`}
                    />
                    <Text className="text-caption-s text-muted">{label}</Text>
                    <Text className="text-caption-s text-muted">{px}</Text>
                  </View>
                ))}
              </Row>
            </Section>

            {/* ── Spacing / gap reference ── */}
            <Section title="Spacing scale reference">
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
                <View key={n} className="flex-row items-center gap-3 py-1">
                  <Text className="text-caption-m w-8 text-muted">{n}</Text>
                  <View
                    className="h-4 rounded-sm bg-accent"
                    style={{ width: n * 4 }}
                  />
                  <Text className="text-caption-m text-muted">{n * 4}px</Text>
                </View>
              ))}
            </Section>

            {/* ── Opacity / disabled reference ── */}
            <Section title="Opacity reference">
              <Row>
                {[100, 80, 60, 45, 30, 10].map((op) => (
                  <View key={op} className="items-center gap-1">
                    <View
                      className="h-12 w-12 rounded-lg bg-accent"
                      style={{ opacity: op / 100 }}
                    />
                    <Text className="text-caption-s text-muted">{op}%</Text>
                  </View>
                ))}
              </Row>
            </Section>

            {/* ── Avatar / user indicators ── */}
            <Section title="Avatar sizes & fallback patterns">
              <Row className="items-center">
                {[
                  ["w-8 h-8", "text-caption-s", "sm"],
                  ["w-10 h-10", "text-caption-m", "md"],
                  ["w-12 h-12", "text-body-s", "lg"],
                  ["w-14 h-14", "text-body-m", "xl"],
                  ["w-16 h-16", "text-h6", "2xl"],
                ].map(([sz, txt, label]) => (
                  <View key={label} className="items-center gap-1">
                    <View
                      className={`${sz} bg-blue-02 border-blue-04 items-center justify-center rounded-full border`}
                    >
                      <Text className={`${txt} text-blue-10 font-semibold`}>
                        RK
                      </Text>
                    </View>
                    <Text className="text-caption-s text-muted">{label}</Text>
                  </View>
                ))}
                {/* Online indicator */}
                <View className="items-center gap-1">
                  <View className="relative h-12 w-12">
                    <View className="bg-gray-03 border-gray-04 h-12 w-12 items-center justify-center rounded-full border">
                      <Text className="text-body-s text-gray-10 font-semibold">
                        JD
                      </Text>
                    </View>
                    <View className="bg-success border-surface absolute right-0 bottom-0 h-3 w-3 rounded-full border-2" />
                  </View>
                  <Text className="text-caption-s text-muted">online</Text>
                </View>
              </Row>
            </Section>
          </View>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 4 — REAL UI PREVIEW
        ════════════════════════════════════════════════════ */}
        {activeTab === "preview" && (
          <View>
            <Section title="Real home service UI — all tokens in use">
              {/* Search bar */}
              <View className="bg-field mb-4 flex-row items-center gap-3 rounded-2xl border border-border px-4 py-3.5">
                <Text className="text-body-m text-muted">🔍</Text>
                <Text className="text-body-s text-field-placeholder flex-1">
                  Search plumber, electrician, AC…
                </Text>
              </View>

              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row className="flex-nowrap pb-4">
                  {[
                    ["⚡", "Electrician", true],
                    ["🔧", "Plumbing", false],
                    ["🧹", "Cleaning", false],
                    ["❄️", "AC Repair", false],
                    ["🎨", "Painting", false],
                    ["🪚", "Carpentry", false],
                  ].map(([icon, label, active]) => (
                    <Pressable
                      key={String(label)}
                      className={`mr-2 flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${
                        active
                          ? "border-accent bg-accent"
                          : "bg-surface border-border"
                      }`}
                    >
                      <Text>{icon}</Text>
                      <Text
                        className={`text-caption-l font-medium ${
                          active ? "text-accent-foreground" : "text-foreground"
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </Row>
              </ScrollView>

              {/* Section header */}
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-h6 font-bold tracking-[-0.3px] text-foreground">
                  Top Services
                </Text>
                <Pressable>
                  <Text className="text-body-s font-medium text-accent">
                    See all
                  </Text>
                </Pressable>
              </View>

              {/* Service cards */}
              {[
                {
                  icon: "⚡",
                  title: "Electrical Wiring",
                  sub: "Fix switches, sockets & more",
                  price: "₹299",
                  old: "₹450",
                  rating: "4.9",
                  reviews: "3.2k",
                  time: "1–2 hrs",
                  tag: "Popular",
                  tagBg: "bg-blue-01",
                  tagText: "text-blue-10",
                  tagBorder: "border-blue-03",
                },
                {
                  icon: "🔧",
                  title: "Pipe Leak Repair",
                  sub: "Emergency plumbing fix",
                  price: "₹199",
                  old: "",
                  rating: "4.7",
                  reviews: "1.8k",
                  time: "30–60 min",
                  tag: "Urgent",
                  tagBg: "bg-orange-01",
                  tagText: "text-orange-11",
                  tagBorder: "border-orange-03",
                },
                {
                  icon: "🧹",
                  title: "Deep Home Cleaning",
                  sub: "Eco-friendly, fully equipped",
                  price: "₹799",
                  old: "₹1200",
                  rating: "4.8",
                  reviews: "2.1k",
                  time: "3–4 hrs",
                  tag: "33% off",
                  tagBg: "bg-green-01",
                  tagText: "text-green-11",
                  tagBorder: "border-green-03",
                },
              ].map((s) => (
                <Pressable
                  key={s.title}
                  className="bg-surface active:bg-surface-secondary mb-3 rounded-2xl border border-border p-4"
                >
                  <View className="flex-row gap-4">
                    {/* Icon */}
                    <View className="bg-surface-secondary h-14 w-14 items-center justify-center rounded-xl">
                      <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-body-s leading-[22px] font-semibold text-foreground">
                            {s.title}
                          </Text>
                          <Text className="text-caption-l mt-0.5 text-muted">
                            {s.sub}
                          </Text>
                        </View>
                        <View
                          className={`rounded-full border px-2 py-1 ${s.tagBg} ${s.tagBorder} ml-2`}
                        >
                          <Text
                            className={`text-caption-s font-semibold ${s.tagText}`}
                          >
                            {s.tag}
                          </Text>
                        </View>
                      </View>

                      {/* Price row */}
                      <View className="mt-2 flex-row items-center gap-2">
                        <Text className="text-body-s font-bold text-foreground">
                          {s.price}
                        </Text>
                        {s.old ? (
                          <Text className="text-caption-l text-muted line-through">
                            {s.old}
                          </Text>
                        ) : null}
                      </View>

                      {/* Meta row */}
                      <View className="mt-1 flex-row items-center gap-1">
                        <Text className="text-caption-m text-muted">
                          ★ {s.rating} ({s.reviews})
                        </Text>
                        <Text className="text-caption-m text-muted">·</Text>
                        <Text className="text-caption-m text-muted">
                          ⏱ {s.time}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* Booking confirmation card */}
              <View className="bg-green-01 border-green-03 mt-2 mb-4 rounded-2xl border p-4">
                <View className="flex-row items-start gap-3">
                  <View className="bg-success h-10 w-10 items-center justify-center rounded-full">
                    <Text className="text-body-m text-success-foreground font-bold">
                      ✓
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-s text-green-12 font-bold tracking-[-0.2px]">
                      Booking Confirmed!
                    </Text>
                    <Text className="text-caption-l text-green-10 mt-0.5">
                      Your electrician arrives today, 2:30 PM
                    </Text>
                    <View className="mt-3 flex-row gap-2">
                      <Pressable className="bg-success rounded-lg px-4 py-2 active:opacity-80">
                        <Text className="text-caption-l text-success-foreground font-semibold">
                          Track
                        </Text>
                      </Pressable>
                      <Pressable className="bg-green-01 border-green-04 rounded-lg border px-4 py-2 active:opacity-80">
                        <Text className="text-caption-l text-green-10 font-medium">
                          Reschedule
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* Error / danger state card */}
              <View className="bg-red-01 border-red-03 mb-4 rounded-2xl border p-4">
                <View className="flex-row items-start gap-3">
                  <View className="bg-danger h-10 w-10 items-center justify-center rounded-full">
                    <Text className="text-body-m text-danger-foreground font-bold">
                      !
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-s text-red-12 font-bold">
                      Payment Failed
                    </Text>
                    <Text className="text-caption-l text-red-10 mt-0.5">
                      Your card was declined. Please try another payment method.
                    </Text>
                    <Pressable className="bg-danger mt-3 self-start rounded-lg px-4 py-2 active:opacity-80">
                      <Text className="text-caption-l text-danger-foreground font-semibold">
                        Retry Payment
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Technician profile card */}
              <View className="bg-surface mb-4 rounded-2xl border border-border p-4">
                <Text className="text-caption-l mb-3 font-semibold tracking-[0.5px] text-muted uppercase">
                  Your Technician
                </Text>
                <View className="flex-row items-center gap-4">
                  <View className="relative">
                    <View className="bg-blue-02 border-blue-04 h-16 w-16 items-center justify-center rounded-full border">
                      <Text className="text-h6 text-blue-10 font-bold">RK</Text>
                    </View>
                    <View className="bg-success border-surface absolute right-0.5 bottom-0.5 h-3.5 w-3.5 rounded-full border-2" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-s font-bold text-foreground">
                      Rajesh Kumar
                    </Text>
                    <Text className="text-caption-l text-muted">
                      Electrician · 8 yrs exp
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Text className="text-caption-m text-warning">★★★★★</Text>
                      <Text className="text-caption-m text-muted">
                        4.9 (847 jobs)
                      </Text>
                    </View>
                  </View>
                  <View className="gap-2">
                    <Pressable className="bg-blue-01 border-blue-03 h-10 w-10 items-center justify-center rounded-xl border active:opacity-80">
                      <Text>📞</Text>
                    </Pressable>
                    <Pressable className="bg-surface-secondary h-10 w-10 items-center justify-center rounded-xl border border-border active:opacity-80">
                      <Text>💬</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Progress steps */}
                <View className="mt-4 flex-row items-center">
                  {[
                    ["Booked", true, true],
                    ["Confirmed", true, true],
                    ["En route", true, false],
                    ["Arrived", false, false],
                    ["Done", false, false],
                  ].map(([label, done, past], i, arr) => (
                    <React.Fragment key={String(label)}>
                      <View className="items-center gap-1">
                        <View
                          className={`h-6 w-6 items-center justify-center rounded-full ${
                            done
                              ? "bg-accent"
                              : "bg-gray-03 border border-border"
                          }`}
                        >
                          {done && (
                            <Text className="text-caption-s font-bold text-accent-foreground">
                              ✓
                            </Text>
                          )}
                        </View>
                        <Text
                          className={`text-caption-s ${done ? "font-semibold text-accent" : "text-muted"}`}
                        >
                          {label}
                        </Text>
                      </View>
                      {i < arr.length - 1 && (
                        <View
                          className={`mb-4 h-0.5 flex-1 ${past ? "bg-accent" : "bg-border"}`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* CTA bottom bar */}
              <View className="bg-surface mt-2 rounded-2xl border border-border p-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-caption-l text-muted">
                      Total payable
                    </Text>
                    <Text className="text-h5 font-bold tracking-[-0.5px] text-foreground">
                      ₹799
                    </Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center gap-1.5">
                      <View className="bg-green-01 border-green-03 h-5 w-5 items-center justify-center rounded-full border">
                        <Text className="text-caption-s text-success">✓</Text>
                      </View>
                      <Text className="text-caption-l text-success font-medium">
                        Coupon applied
                      </Text>
                    </View>
                    <Text className="text-caption-m mt-0.5 text-muted">
                      Saved ₹401
                    </Text>
                  </View>
                </View>
                <Pressable className="items-center rounded-xl bg-accent py-4 active:opacity-80">
                  <Text className="text-body-s font-bold text-accent-foreground">
                    Proceed to Pay ₹799
                  </Text>
                </Pressable>
                <Text className="text-caption-m mt-2 text-center text-muted">
                  Secured by Razorpay · No hidden charges
                </Text>
              </View>
              <Link href="/">home</Link>
            </Section>
          </View>
        )}

        {/* Bottom padding */}
        <View className="h-16" />
      </ScrollView>
    </SafeAreaView>
  )
}
