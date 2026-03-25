import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import React from "react";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import {icons} from "lucide-react";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ? "light" : scheme ?? "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
          <Label>Today</Label>
          <Icon sf={"house.fill"} drawable="custom_android_drawable"/>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="clients/index">
        <Label>Care Plans</Label>
          <Icon sf={"person.fill"} drawable="custom_android_drawa able"/>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
