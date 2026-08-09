import { NativeWindStyleSheet } from 'nativewind';

// NativeWind 2 misdetects React Native Web 0.19 as a precompiled CSS setup.
NativeWindStyleSheet.setOutput({
  default: 'native',
  web: 'native',
});
