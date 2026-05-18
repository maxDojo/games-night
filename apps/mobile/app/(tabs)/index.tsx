import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Tv, ListOrdered, Plus, Shield, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <LinearGradient
          colors={["#0D1F0F", "#1A3A1C", "#0D1F0F"]}
          className="w-full h-48 justify-center items-center px-5 pb-5 rounded-b-[32px]"
        >
          <View className="flex-row items-center gap-3 mb-2">
            <Text className="text-[#C9A84C] text-lg font-inter">♠</Text>
            <Text className="text-[#C9A84C] text-lg font-inter">♦</Text>
          </View>
          <Text className="text-[#E8D5A3] text-3xl font-playfair mb-1">
            Games Night
          </Text>
          <Text className="text-[#8FAF91] text-[13px] font-inter tracking-wide mb-2">
            The house always plays
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-[#C9A84C] text-lg font-inter">♣</Text>
            <Text className="text-[#C9A84C] text-lg font-inter">♥</Text>
          </View>
        </LinearGradient>

        <View className="h-[2px] w-full mt-[-1px]">
          <LinearGradient
            colors={["transparent", "#C9A84C", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1"
          />
        </View>

        <View className="p-5 gap-4">
          {/* Host Card */}
          <View className="w-full bg-darkGreen rounded-2xl p-5 shadow-lg shadow-[#C9A84C]/20 gap-3">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 bg-[#C9A84C]/10 rounded-xl justify-center items-center">
                <Text className="text-[#C9A84C] text-xl font-inter">♚</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[#E8D5A3] text-lg font-playfair">Host Tonight</Text>
                <Text className="text-[#8FAF91] text-xs font-inter">Set up & run the full show</Text>
              </View>
              <View className="bg-[#C9A84C] rounded-full px-2.5 py-1">
                <Text className="text-darkGreen text-[10px] font-interBold tracking-wider">PRO</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className="bg-midGreen rounded-full flex-row items-center px-2.5 py-1 gap-1">
                <Tv size={12} color="#8FAF91" />
                <Text className="text-[#8FAF91] text-[11px] font-inter">Cast to TV</Text>
              </View>
              <View className="bg-midGreen rounded-full flex-row items-center px-2.5 py-1 gap-1">
                <ListOrdered size={12} color="#8FAF91" />
                <Text className="text-[#8FAF91] text-[11px] font-inter">Plan Show</Text>
              </View>
              <View className="bg-midGreen rounded-full flex-row items-center px-2.5 py-1 gap-1">
                <Plus size={12} color="#8FAF91" />
                <Text className="text-[#8FAF91] text-[11px] font-inter">Custom</Text>
              </View>
            </View>

            <TouchableOpacity 
              className="w-full h-12 bg-[#C9A84C] rounded-xl flex-row justify-center items-center gap-2 mt-1"
              onPress={() => router.push("/host/dashboard")}
            >
              <Shield size={18} color="#0D1F0F" />
              <Text className="text-darkGreen text-sm font-interBold">Open Host Dashboard</Text>
            </TouchableOpacity>
          </View>

          {/* Join Card */}
          <View className="w-full bg-white rounded-2xl p-5 shadow-lg shadow-black/10 gap-3">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 bg-[#F0F7F0] rounded-xl justify-center items-center">
                <Text className="text-[#2D6A30] text-xl font-inter">♟</Text>
              </View>
              <View className="flex-1">
                <Text className="text-darkGreen text-lg font-playfair">Join a Game</Text>
                <Text className="text-gray-500 text-xs font-inter">Enter your room code to play</Text>
              </View>
            </View>

            <View className="flex-row gap-2.5 mt-1 items-center">
              <View className="flex-1 h-12 bg-[#F5F5F0] rounded-xl justify-center px-4">
                <TextInput 
                  placeholder="GN-2025"
                  placeholderTextColor="#9CA3AF"
                  className="text-darkGreen text-xl font-bold tracking-[3px]"
                />
              </View>
              <TouchableOpacity className="w-12 h-12 bg-darkGreen rounded-xl justify-center items-center">
                <ArrowRight size={20} color="#C9A84C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Nights */}
          <View className="w-full gap-3 mt-2">
            <View className="flex-row justify-between items-center px-1">
              <Text className="text-darkGreen text-[15px] font-playfair font-semibold">Recent Nights</Text>
              <TouchableOpacity>
                <Text className="text-[#2D6A30] text-[13px] font-inter">View all</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              <View className="flex-row gap-3">
                <View className="w-32 bg-white rounded-2xl p-3 shadow-md shadow-black/5 gap-1.5">
                  <Text className="text-darkGreen text-xl font-inter">♠</Text>
                  <Text className="text-darkGreen text-[13px] font-playfair font-semibold">Trivia</Text>
                  <Text className="text-gray-400 text-[11px] font-inter">Fri</Text>
                </View>
                <View className="w-32 bg-white rounded-2xl p-3 shadow-md shadow-black/5 gap-1.5">
                  <Text className="text-[#C9A84C] text-xl font-inter">♦</Text>
                  <Text className="text-darkGreen text-[13px] font-playfair font-semibold">Charades</Text>
                  <Text className="text-gray-400 text-[11px] font-inter">Mon</Text>
                </View>
                <View className="w-32 bg-white rounded-2xl p-3 shadow-md shadow-black/5 gap-1.5">
                  <Text className="text-[#2D6A30] text-xl font-inter">♣</Text>
                  <Text className="text-darkGreen text-[13px] font-playfair font-semibold">Pictionary</Text>
                  <Text className="text-gray-400 text-[11px] font-inter">Sat</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
