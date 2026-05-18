import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { Cast, ListOrdered, Users, GripVertical } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function HostDashboard() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Top Header */}
      <View className="w-full bg-darkGreen px-5 pb-5 rounded-b-[32px]">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-[#4ADE80]" />
            <Text className="text-[#8FAF91] text-[11px] font-inter font-semibold tracking-wider">
              ROOM OPEN · GN-2025
            </Text>
          </View>
          <TouchableOpacity className="bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-xl flex-row items-center gap-1.5 px-3 py-2">
            <Cast size={16} color="#C9A84C" />
            <Text className="text-[#C9A84C] text-[10px] font-inter font-semibold tracking-wide">
              Cast
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-[#E8D5A3] text-2xl font-playfair font-bold">
          Host Dashboard
        </Text>
      </View>

      <View className="h-[2px] w-full mt-[-1px]">
        <LinearGradient
          colors={["transparent", "#C9A84C", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1"
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Stats Row */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-darkGreen rounded-2xl p-3.5 gap-1">
            <Text className="text-[#C9A84C] text-2xl font-bold tracking-widest">8</Text>
            <Text className="text-[#8FAF91] text-xs font-inter">Players</Text>
          </View>
          <View className="flex-1 bg-darkGreen rounded-2xl p-3.5 gap-1">
            <Text className="text-[#C9A84C] text-2xl font-bold tracking-widest">5</Text>
            <Text className="text-[#8FAF91] text-xs font-inter">Games</Text>
          </View>
          <View className="flex-1 bg-darkGreen rounded-2xl p-3.5 gap-1">
            <Text className="text-[#C9A84C] text-2xl font-bold tracking-widest">~2h</Text>
            <Text className="text-[#8FAF91] text-xs font-inter">Est. Time</Text>
          </View>
        </View>

        {/* Action Row */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity className="flex-1 h-12 bg-darkGreen rounded-xl flex-row justify-center items-center gap-2">
            <ListOrdered size={16} color="#C9A84C" />
            <Text className="text-[#E8D5A3] text-sm font-inter font-semibold">Show Planner</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 h-12 bg-white rounded-xl border border-gray-200 flex-row justify-center items-center gap-2">
            <Users size={16} color="#0D1F0F" />
            <Text className="text-darkGreen text-sm font-inter font-semibold">Manage Players</Text>
          </TouchableOpacity>
        </View>

        {/* Queue Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-darkGreen text-[15px] font-playfair font-semibold">Tonight's Queue</Text>
          <TouchableOpacity>
            <Text className="text-[#2D6A30] text-[13px] font-inter">Edit order</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {/* Q1 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3">
            <View className="w-8 h-8 bg-darkGreen rounded-full justify-center items-center">
              <Text className="text-[#C9A84C] text-[13px] font-bold">1</Text>
            </View>
            <Text className="text-darkGreen text-lg font-inter">♠</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Trivia: General Knowledge</Text>
              <Text className="text-gray-500 text-xs font-inter">10 rounds · 25 min</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>

          {/* Q2 */}
          <View className="w-full bg-white rounded-xl border border-gray-200 p-3 flex-row items-center gap-3">
            <View className="w-8 h-8 bg-[#F3F4F6] rounded-full justify-center items-center">
              <Text className="text-gray-500 text-[13px] font-bold">2</Text>
            </View>
            <Text className="text-[#C9A84C] text-lg font-inter">♦</Text>
            <View className="flex-1">
              <Text className="text-darkGreen text-sm font-inter font-semibold">Charades: Movies</Text>
              <Text className="text-gray-500 text-xs font-inter">15 turns · 30 min</Text>
            </View>
            <GripVertical size={18} color="#D1D5DB" />
          </View>
        </View>

        <TouchableOpacity 
          className="mt-8 self-center"
          onPress={() => router.back()}
        >
          <Text className="text-[#2D6A30] font-inter">Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
