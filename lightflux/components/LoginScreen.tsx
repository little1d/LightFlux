import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

const LoginScreen = () => {
    return (
        <View className="flex-1 justify-center items-center bg-gray-100 p-4">
            <Text className="text-4xl font-bold text-blue-600 mb-8">
                LightFlux
            </Text>

            <TextInput
                className="w-full h-12 bg-white rounded-lg px-4 mb-4 border border-gray-300"
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                className="w-full h-12 bg-white rounded-lg px-4 mb-6 border border-gray-300"
                placeholder="Password"
                secureTextEntry
            />

            <TouchableOpacity className="w-full h-12 bg-blue-500 rounded-lg justify-center items-center mb-4">
                <Text className="text-white text-lg font-semibold">Login</Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-full h-12 bg-green-500 rounded-lg justify-center items-center">
                <Text className="text-white text-lg font-semibold">Register</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
