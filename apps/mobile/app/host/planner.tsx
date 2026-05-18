import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { Plus, GripVertical, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function ShowPlanner() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Top Header */}
      <View className="w-full bg-darkGreen px-5 pb-5 rounded-b-[32px]">
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-[#1A3A1C] rounded-full justify-center items-center">
            <ChevronLeft size={20} color="#E8D5A3" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-xl flex-row items-center gap-1.5 px-3 py-2">
            <Plus size={16} color="#C9A84C" />
            <Text className="text-[#C9A84C] text-[10px] font-inter font-semibold tracking-wide">
              Add
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-[#E8D5A3] text-2xl font-playfair font-bold">
          Show Planner
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          <Text className="text-[#8FAF91] text-[13px] font-inter">~1h 48m total</Text>
          <Text className="text-[#8FAF91] text-[13px] font-inter">·</Text>
          <Text className="text-[#8FAF91] text-[13px] font-inter">5 segments</Text>
        </View>
      </View>

      <View className="h-[2px] w-full mt-[-1px]">
        <LinearGradient
          colors={["transparent", "#C9A84C", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1"
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View className="gap-3">
          {/* Item 1 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3 shadow-sm shadow-black/5">
            <View className="w-8 h-8 bg-darkGreen rounded-full justify-center items-center">
              <Text className="text-[#C9A84C] text-[13px] font-bold">1</Text>
            </View>
            <Text className="text-darkGreen text-lg font-inter">♠</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Trivia: General Knowledge</Text>
              <Text className="text-gray-500 text-xs font-inter">10 rounds · 25 min · 8 players</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>

          {/* Item 2 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3 shadow-sm shadow-black/5">
            <View className="w-8 h-8 bg-white border border-gray-200 rounded-full justify-center items-center">
              <Text className="text-gray-500 text-[13px] font-bold">2</Text>
            </View>
            <Text className="text-gray-400 text-lg font-inter">🎬</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Cutscene: Halftime Reel</Text>
              <Text className="text-gray-500 text-xs font-inter">Video · 3 min</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>

          {/* Item 3 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3 shadow-sm shadow-black/5">
            <View className="w-8 h-8 bg-white border border-gray-200 rounded-full justify-center items-center">
              <Text className="text-gray-500 text-[13px] font-bold">3</Text>
            </View>
            <Text className="text-[#C9A84C] text-lg font-inter">♦</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Charades: Movies & TV</Text>
              <Text className="text-gray-500 text-xs font-inter">8 rounds · 20 min</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>

          {/* Item 4 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3 shadow-sm shadow-black/5">
            <View className="w-8 h-8 bg-white border border-gray-200 rounded-full justify-center items-center">
              <Text className="text-gray-500 text-[13px] font-bold">4</Text>
            </View>
            <Text className="text-[#2D6A30] text-lg font-inter">♣</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Most Likely To</Text>
              <Text className="text-gray-500 text-xs font-inter">Custom pack · 10 min</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>

        </View>

        <TouchableOpacity className="mt-6 w-full h-14 border border-dashed border-[#8FAF91] rounded-xl justify-center items-center bg-[#FAFAF8] flex-row gap-2">
          <Plus size={18} color="#2D6A30" />
          <Text className="text-[#2D6A30] font-inter font-semibold">Add Custom / Local Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
