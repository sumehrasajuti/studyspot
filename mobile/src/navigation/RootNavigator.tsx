import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { HomeScreen } from "../screens/HomeScreen";
import { BuildingDetailScreen } from "../screens/BuildingDetailScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BuildingDetail" component={BuildingDetailScreen} options={{ title: "" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
