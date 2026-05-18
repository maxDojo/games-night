import { View, Text, SafeAreaView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Timer, Zap, Flame } from "lucide-react-native";

export default function PlayerController() {
  return (
    <SafeAreaView className="flex-1 bg-darkGreen">
      {/* Top Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center">
        <View className="bg-[#1A3A1C] px-3 py-1.5 rounded-full border border-[#8FAF91]/30">
          <Text className="text-[#8FAF91] text-[10px] font-interBold tracking-widest">
            ROUND 3 OF 10
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-[13px] font-interSemi">♠ Spades · 450 pts</Text>
        </View>
      </View>

      <View className="flex-1 px-5 pt-4">
        {/* Timer */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full border-[3px] border-[#C9A84C] justify-center items-center bg-[#C9A84C]/10 shadow-lg shadow-[#C9A84C]/20">
            <Text className="text-[#E8D5A3] text-3xl font-interBold">18s</Text>
          </View>
        </View>

        {/* Question Area */}
        <View className="items-center mb-8 gap-4">
          <Text className="text-[#8FAF91] text-xs font-interBold tracking-[3px]">
            GEOGRAPHY
          </Text>
          <Text className="text-white text-2xl font-playfair font-bold text-center leading-9">
            What is the largest country in Africa by land area?
          </Text>
          <View className="flex-row items-center gap-1.5 bg-[#C9A84C]/10 px-3 py-1.5 rounded-full mt-2">
            <Zap size={14} color="#C9A84C" />
            <Text className="text-[#C9A84C] text-[11px] font-interSemi">
              100 pts + speed bonus
            </Text>
          </View>
        </View>

        {/* Answers Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {/* Answer A */}
          <TouchableOpacity className="w-[48%] h-24 bg-[#1A3A1C] rounded-2xl border border-[#8FAF91]/30 p-3 justify-between">
            <View className="w-6 h-6 rounded-full bg-white/10 justify-center items-center">
              <Text className="text-white/60 text-xs font-interBold">A</Text>
            </View>
            <Text className="text-white text-[15px] font-interSemi">Algeria</Text>
          </TouchableOpacity>

          {/* Answer B */}
          <TouchableOpacity className="w-[48%] h-24 bg-[#1A3A1C] rounded-2xl border border-[#8FAF91]/30 p-3 justify-between">
            <View className="w-6 h-6 rounded-full bg-white/10 justify-center items-center">
              <Text className="text-white/60 text-xs font-interBold">B</Text>
            </View>
            <Text className="text-white text-[15px] font-interSemi">DRC Congo</Text>
          </TouchableOpacity>

          {/* Answer C */}
          <TouchableOpacity className="w-[48%] h-24 bg-[#1A3A1C] rounded-2xl border border-[#8FAF91]/30 p-3 justify-between">
            <View className="w-6 h-6 rounded-full bg-white/10 justify-center items-center">
              <Text className="text-white/60 text-xs font-interBold">C</Text>
            </View>
            <Text className="text-white text-[15px] font-interSemi">Sudan</Text>
          </TouchableOpacity>

          {/* Answer D */}
          <TouchableOpacity className="w-[48%] h-24 bg-[#1A3A1C] rounded-2xl border border-[#8FAF91]/30 p-3 justify-between">
            <View className="w-6 h-6 rounded-full bg-white/10 justify-center items-center">
              <Text className="text-white/60 text-xs font-interBold">D</Text>
            </View>
            <Text className="text-white text-[15px] font-interSemi">Nigeria</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Bottom Bar Stats */}
      <View className="px-5 py-6 flex-row justify-between items-center border-t border-white/5 bg-[#0A160A]">
        <View className="flex-row items-center gap-1.5">
          <Flame size={16} color="#F97316" />
          <Text className="text-white text-xs font-interSemi">3 streak</Text>
        </View>
        <Text className="text-[#8FAF91] text-xs font-inter">
          Spades: 450 pts
        </Text>
      </View>
    </SafeAreaView>
  );
}
