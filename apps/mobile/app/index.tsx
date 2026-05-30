import { Button, Text, View } from "react-native"

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button
        colorClassName="accent-blue-500 dark:accent-blue-400 ios:accent-indigo-500"
        title="Press me"
      />

      <View className="bg-{{ error ? 'red' : 'green' }}-600" />
      <Text className="bg-red-600 text-xl font-bold text-gray-900 dark:text-white">
        Uniwind working!
      </Text>
    </View>
  )
}
