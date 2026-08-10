import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translations } from '../i18n/translations';
import { useTodoStore } from '../store/todoStore';
import {
  beginWechatLogin,
  isRemoteAuthConfigured,
} from '../services/authApi';

const SignedOutScreen = ({ onContinue }: { onContinue: () => void }) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];
  const [loginError, setLoginError] = useState('');

  const loginWithWechat = async () => {
    setLoginError('');
    try {
      await beginWechatLogin();
    } catch {
      setLoginError(labels.signedOut.wechatError);
    }
  };

  return (
    <View className="flex-1 bg-[#F3F2F7]">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[430px] items-center rounded-[28px] border border-[#E3E2E9] bg-white px-8 py-10">
          <View className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-[25px] bg-[#ECE9FF]">
            <View className="absolute top-[16px] h-[18px] w-[18px] rounded-[9px] bg-primary" />
            <View className="absolute bottom-[14px] h-[23px] w-[38px] rounded-t-[19px] bg-primary" />
          </View>
          <Text className="text-center text-[24px] font-extrabold text-[#2E2F41]">
            {labels.signedOut.title}
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-[#858797]">
            {labels.signedOut.description}
          </Text>
          {isRemoteAuthConfigured ? (
            <Pressable
              accessibilityRole="button"
              className="mt-7 min-h-12 w-full flex-row items-center justify-center rounded-[15px] bg-[#07C160] px-5"
              onPress={() => void loginWithWechat()}
            >
              <Ionicons color="white" name="logo-wechat" size={21} />
              <Text className="ml-2 text-[14px] font-extrabold text-white">
                {labels.signedOut.wechat}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="mt-7 min-h-12 w-full items-center justify-center rounded-[15px] bg-primary px-5"
              onPress={onContinue}
            >
              <Text className="text-[14px] font-extrabold text-white">
                {labels.signedOut.continue}
              </Text>
            </Pressable>
          )}
          {loginError ? (
            <Text className="mt-3 text-center text-[11px] leading-4 text-[#C84F60]">
              {loginError}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default SignedOutScreen;
