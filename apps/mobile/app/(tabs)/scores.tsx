import { View, Text, ScrollView, SafeAreaView, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Trophy } from "lucide-react-native";

export default function Leaderboard() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Top Header */}
      <View className="w-full bg-darkGreen px-5 pb-6 pt-2 rounded-b-[32px] items-center">
        <View className="w-14 h-14 bg-[#C9A84C]/10 rounded-2xl justify-center items-center mb-3">
          <Trophy size={28} color="#C9A84C" />
        </View>
        <Text className="text-[#E8D5A3] text-3xl font-playfair font-bold mb-1">
          Leaderboard
        </Text>
        <Text className="text-[#8FAF91] text-sm font-inter">
          Round 3 · Trivia Night
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

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Top 3 Podium (Mockup representation) */}
        <View className="flex-row justify-center items-end h-48 mb-8 gap-3">
          
          {/* 2nd Place */}
          <View className="w-24 items-center">
            <Text className="text-[#C9A84C] text-lg font-interBold mb-1">2</Text>
            <View className="w-14 h-14 bg-darkGreen rounded-full border-2 border-[#C9A84C] justify-center items-center mb-2">
              <Text className="text-[#C9A84C] text-xl font-interBold">K</Text>
            </View>
            <Text className="text-darkGreen text-[13px] font-interSemi text-center">Kelechi</Text>
            <Text className="text-[#8FAF91] text-[11px] font-inter">680 pts</Text>
            <View className="w-full h-24 bg-[#1A3A1C] rounded-t-lg mt-2 opacity-80" />
          </View>

          {/* 1st Place */}
          <View className="w-28 items-center">
            <Text className="text-[#C9A84C] text-2xl font-inter mb-1">♚</Text>
            <View className="w-16 h-16 bg-[#C9A84C] rounded-full border-4 border-darkGreen justify-center items-center mb-2 shadow-lg shadow-[#C9A84C]/30">
              <Text className="text-darkGreen text-2xl font-interBold">A</Text>
            </View>
            <Text className="text-darkGreen text-[15px] font-interBold text-center">Adaeze</Text>
            <Text className="text-[#8FAF91] text-xs font-interBold">850 pts</Text>
            <View className="w-full h-32 bg-darkGreen rounded-t-lg mt-2" />
          </View>

          {/* 3rd Place */}
          <View className="w-24 items-center">
            <Text className="text-[#CD7F32] text-lg font-interBold mb-1">3</Text>
            <View className="w-14 h-14 bg-darkGreen rounded-full border-2 border-[#CD7F32] justify-center items-center mb-2">
              <Text className="text-[#CD7F32] text-xl font-interBold">T</Text>
            </View>
            <Text className="text-darkGreen text-[13px] font-interSemi text-center">Tunde</Text>
            <Text className="text-[#8FAF91] text-[11px] font-inter">520 pts</Text>
            <View className="w-full h-16 bg-[#1A3A1C] rounded-t-lg mt-2 opacity-60" />
          </View>
        </View>

        {/* Other Players List */}
        <View className="gap-3">
          {/* 4th */}
          <View className="w-full bg-white rounded-2xl p-4 flex-row items-center gap-4 shadow-sm shadow-black/5">
            <Text className="text-gray-400 font-interBold w-4 text-center">4</Text>
            <View className="w-10 h-10 bg-[#F3F4F6] rounded-full justify-center items-center">
              <Text className="text-[#C9A84C] text-lg">♥</Text>
            </View>
            <Text className="flex-1 text-darkGreen text-[15px] font-interSemi">Chisom</Text>
            <Text className="text-darkGreen text-[15px] font-interBold">410 pts</Text>
          </View>

          {/* 5th */}
          <View className="w-full bg-white rounded-2xl p-4 flex-row items-center gap-4 shadow-sm shadow-black/5">
            <Text className="text-gray-400 font-interBold w-4 text-center">5</Text>
            <View className="w-10 h-10 bg-[#F3F4F6] rounded-full justify-center items-center">
              <Text className="text-[#2D6A30] text-lg">♣</Text>
            </View>
            <Text className="flex-1 text-darkGreen text-[15px] font-interSemi">Blessing</Text>
            <Text className="text-darkGreen text-[15px] font-interBold">290 pts</Text>
          </View>
        </View>

      </ScrollView>

      {/* Floating Current User Rank */}
      <View className="absolute bottom-[90px] left-5 right-5 bg-darkGreen rounded-2xl p-4 flex-row items-center gap-4 shadow-xl shadow-black/20 border border-[#C9A84C]/20">
        <View className="w-10 h-10 bg-[#C9A84C] rounded-full justify-center items-center">
          <Text className="text-darkGreen text-lg font-interBold">A</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-[15px] font-interSemi">You · Adaeze</Text>
          <Text className="text-[#8FAF91] text-xs font-inter">1st place · Leading by 170 pts</Text>
        </View>
        <Text className="text-[#C9A84C] text-lg font-interBold">850</Text>
      </View>

    </SafeAreaView>
  );
}
