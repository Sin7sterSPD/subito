import React from "react"
import { TouchableOpacity, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Spinner } from "heroui-native"
import { Text } from "react-native"

interface GradientButtonProps {
  title: string
  onPress: () => void
  isLoading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}

export function GradientButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled || isLoading}
      onPress={onPress}
      className={fullWidth ? "w-full" : ""}
    >
      <LinearGradient
        colors={
          disabled
            ? ["#BFC7D9", "#AAB3C8"]
            : ["#6199FF", "#045CFB"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: disabled ? "#BFC7D9" : "#4778F5",
          minHeight: 52,
        }}
      >
        <View className="flex-row items-center justify-center gap-2 px-5 py-3">
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <>
              {leftIcon}
              <Text className="font-inter-semibold text-base text-white">
                {title}
              </Text>
            </>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}