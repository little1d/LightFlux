import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translations } from '../content';
import {
  isRemoteAuthConfigured,
  requestEmailOtp,
  verifyEmailOtp,
} from '../services/authApi';
import { useTodoStore } from '../store/todoStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignedOutScreen = ({
  onContinue,
}: {
  onContinue: () => Promise<void> | void;
}) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language].signedOut;
  const codeInputRef = useRef<TextInput>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (step !== 'code') {
      return;
    }
    const timer = setTimeout(() => codeInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [step]);

  const normalizedEmail = email.trim().toLowerCase();

  const sendCode = async (resend = false) => {
    setError('');
    setNotice('');
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(labels.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      await requestEmailOtp(normalizedEmail);
      setStep('code');
      setNotice(resend ? labels.codeSent : '');
    } catch {
      setError(labels.requestError);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    setNotice('');
    if (!/^\d{6}$/.test(code)) {
      setError(labels.invalidCode);
      return;
    }
    setBusy(true);
    try {
      await verifyEmailOtp(normalizedEmail, code);
      await onContinue();
    } catch {
      setError(labels.verifyError);
    } finally {
      setBusy(false);
    }
  };

  const resetEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setNotice('');
  };

  const primaryDisabled =
    busy ||
    (step === 'email'
      ? normalizedEmail.length === 0
      : code.length !== 6);

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}
        >
          <View style={styles.panel}>
            <View style={styles.brandMark}>
              <Ionicons color="#FFFFFF" name="checkmark" size={34} strokeWidth={4} />
            </View>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.description}>
              {isRemoteAuthConfigured && step === 'code'
                ? labels.codeDescription(normalizedEmail)
                : labels.description}
            </Text>

            {isRemoteAuthConfigured ? (
              <>
                <TextInput
                  ref={step === 'code' ? codeInputRef : undefined}
                  accessibilityLabel={
                    step === 'email'
                      ? labels.emailPlaceholder
                      : labels.codePlaceholder
                  }
                  autoCapitalize="none"
                  autoComplete={
                    step === 'email' ? 'email' : 'one-time-code'
                  }
                  autoCorrect={false}
                  editable={!busy}
                  keyboardType={
                    step === 'email' ? 'email-address' : 'number-pad'
                  }
                  maxLength={step === 'code' ? 6 : 254}
                  onBlur={() => setInputFocused(false)}
                  onChangeText={(value) => {
                    setError('');
                    setNotice('');
                    if (step === 'email') {
                      setEmail(value);
                    } else {
                      setCode(value.replace(/\D/g, '').slice(0, 6));
                    }
                  }}
                  onFocus={() => setInputFocused(true)}
                  onSubmitEditing={() => {
                    if (!primaryDisabled) {
                      void (step === 'email' ? sendCode() : verifyCode());
                    }
                  }}
                  placeholder={
                    step === 'email'
                      ? labels.emailPlaceholder
                      : labels.codePlaceholder
                  }
                  placeholderTextColor="#A2A3B0"
                  returnKeyType={step === 'email' ? 'next' : 'done'}
                  style={[
                    styles.input,
                    step === 'code' && styles.codeInput,
                    inputFocused && styles.inputFocused,
                  ]}
                  textContentType={
                    step === 'email' ? 'emailAddress' : 'oneTimeCode'
                  }
                  value={step === 'email' ? email : code}
                />

                <Pressable
                  accessibilityRole="button"
                  disabled={primaryDisabled}
                  onPress={() =>
                    void (step === 'email' ? sendCode() : verifyCode())
                  }
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !primaryDisabled && styles.buttonPressed,
                    primaryDisabled && styles.buttonDisabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : null}
                  <Text style={styles.primaryButtonText}>
                    {step === 'email'
                      ? busy
                        ? labels.sendingCode
                        : labels.sendCode
                      : busy
                        ? labels.verifyingCode
                        : labels.verifyCode}
                  </Text>
                </Pressable>

                {step === 'code' ? (
                  <View style={styles.secondaryActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={resetEmail}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.secondaryButtonPressed,
                      ]}
                    >
                      <Text style={styles.secondaryText}>
                        {labels.changeEmail}
                      </Text>
                    </Pressable>
                    <View style={styles.actionDivider} />
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => void sendCode(true)}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.secondaryButtonPressed,
                      ]}
                    >
                      <Text style={styles.secondaryText}>
                        {labels.resendCode}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={onContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {labels.continue}
                </Text>
              </Pressable>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F3F2F7',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E2E9',
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 420,
    paddingHorizontal: 32,
    paddingVertical: 36,
    width: '100%',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 16,
    height: 72,
    justifyContent: 'center',
    marginBottom: 20,
    width: 72,
  },
  title: {
    color: '#2E2F41',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: '#858797',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    minHeight: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8F7FA',
    borderColor: '#DCD9E5',
    borderRadius: 8,
    borderWidth: 2,
    color: '#303145',
    fontSize: 15,
    height: 50,
    marginTop: 24,
    outlineColor: 'transparent',
    paddingHorizontal: 15,
    width: '100%',
  },
  codeInput: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  inputFocused: {
    borderColor: '#8F83EE',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonPressed: {
    backgroundColor: '#594CCD',
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.46,
  },
  secondaryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 36,
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secondaryButtonPressed: {
    backgroundColor: '#F0EEFF',
  },
  secondaryText: {
    color: '#6759E8',
    fontSize: 12,
    fontWeight: '700',
  },
  actionDivider: {
    backgroundColor: '#E3E2E9',
    height: 14,
    width: 1,
  },
  errorText: {
    color: '#C84F60',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  noticeText: {
    color: '#4D846A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default SignedOutScreen;
