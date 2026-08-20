import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  getPasswordStatus,
  isRemoteAuthConfigured,
  registerWithEmailPassword,
  requestEmailOtp,
  requestEmailVerificationOtp,
  setAccountPassword,
  signInWithEmailPassword,
  verifyEmailOtp,
  verifyPasswordRegistration,
} from '../services/authApi';
import { useTodoStore } from '../store/todoStore';
import IconButton from './ui/IconButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type AuthMethod = 'password' | 'otp';
type AuthStep =
  | 'credentials'
  | 'otp-code'
  | 'registration-code'
  | 'set-password';

const SignedOutScreen = ({
  onCancel,
  onContinue,
  onContinueLocally,
}: {
  onCancel?: () => void;
  onContinue: () => Promise<void> | void;
  onContinueLocally: () => Promise<void> | void;
}) => {
  const language = useTodoStore((state) => state.language);
  const allLabels = translations[language];
  const labels = allLabels.signedOut;
  const codeInputRef = useRef<TextInput>(null);
  const [method, setMethod] = useState<AuthMethod>('password');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [passwordMode, setPasswordMode] = useState<
    'sign-in' | 'register'
  >('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [focusedField, setFocusedField] = useState<
    'code' | 'confirm' | 'email' | 'password' | null
  >(null);

  useEffect(() => {
    if (step !== 'otp-code' && step !== 'registration-code') {
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
      setStep('otp-code');
      setNotice(resend ? labels.codeSent : '');
    } catch {
      setError(labels.requestError);
    } finally {
      setBusy(false);
    }
  };

  // After an OTP sign-in, offer to set a password when the account has none so
  // the next sign-in can use email + password. Any status-check failure falls
  // back to entering the app; the offer is a convenience, not a gate.
  const continueOrOfferPassword = async () => {
    let hasPassword = true;
    try {
      hasPassword = await getPasswordStatus();
    } catch {
      hasPassword = true;
    }
    if (hasPassword) {
      await onContinue();
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setNotice('');
    setStep('set-password');
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
      await continueOrOfferPassword();
    } catch {
      setError(labels.verifyError);
    } finally {
      setBusy(false);
    }
  };

  const submitSetPassword = async () => {
    setError('');
    setNotice('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(labels.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(labels.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await setAccountPassword(password);
      await onContinue();
    } catch {
      setError(labels.setPasswordError);
    } finally {
      setBusy(false);
    }
  };

  const skipSetPassword = async () => {
    setBusy(true);
    try {
      await onContinue();
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    setError('');
    setNotice('');
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(labels.invalidEmail);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(labels.passwordTooShort);
      return;
    }
    setBusy(true);
    try {
      if (passwordMode === 'register') {
        await registerWithEmailPassword(normalizedEmail, password);
        setStep('registration-code');
        setNotice(labels.registrationCodeSent);
      } else {
        await signInWithEmailPassword(normalizedEmail, password);
        await onContinue();
      }
    } catch {
      setError(
        passwordMode === 'register'
          ? labels.registrationError
          : labels.passwordSignInError,
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyRegistration = async () => {
    setError('');
    setNotice('');
    if (!/^\d{6}$/.test(code)) {
      setError(labels.invalidCode);
      return;
    }
    setBusy(true);
    try {
      await verifyPasswordRegistration(normalizedEmail, code, password);
      await onContinue();
    } catch {
      setError(labels.verifyError);
    } finally {
      setBusy(false);
    }
  };

  const resendCurrentCode = async () => {
    if (step === 'otp-code') {
      await sendCode(true);
      return;
    }
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await requestEmailVerificationOtp(normalizedEmail);
      setNotice(labels.codeSent);
    } catch {
      setError(labels.requestError);
    } finally {
      setBusy(false);
    }
  };

  const resetCredentials = () => {
    setStep('credentials');
    setCode('');
    setError('');
    setNotice('');
  };

  const selectMethod = (nextMethod: AuthMethod) => {
    setMethod(nextMethod);
    resetCredentials();
  };

  const primaryDisabled =
    busy ||
    (step === 'set-password'
      ? password.length < MIN_PASSWORD_LENGTH ||
        confirmPassword.length < MIN_PASSWORD_LENGTH
      : step !== 'credentials'
        ? code.length !== 6
        : method === 'password'
          ? normalizedEmail.length === 0 ||
            password.length < MIN_PASSWORD_LENGTH
          : normalizedEmail.length === 0);

  const submitPrimary = () => {
    if (step === 'set-password') {
      return submitSetPassword();
    }
    if (step === 'registration-code') {
      return verifyRegistration();
    }
    if (step === 'otp-code') {
      return verifyCode();
    }
    return method === 'password' ? submitPassword() : sendCode();
  };

  const primaryLabel =
    step === 'set-password'
      ? busy
        ? labels.settingPassword
        : labels.setPasswordAction
      : step === 'registration-code'
        ? busy
          ? labels.verifyingCode
          : labels.verifyRegistration
        : step === 'otp-code'
          ? busy
            ? labels.verifyingCode
            : labels.verifyCode
          : method === 'password'
            ? passwordMode === 'register'
              ? busy
                ? labels.registeringWithPassword
                : labels.registerWithPassword
              : busy
                ? labels.signingInWithPassword
                : labels.signInWithPassword
            : busy
              ? labels.sendingCode
              : labels.sendCode;

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}
        >
          <View style={styles.panel}>
            {onCancel ? (
              <View style={styles.closeButton}>
                <IconButton
                  icon="close"
                  label={allLabels.cancel}
                  onPress={
                    step === 'set-password'
                      ? () => void skipSetPassword()
                      : onCancel
                  }
                  showTooltip={false}
                  size="small"
                  variant="transparent"
                />
              </View>
            ) : null}
            <View style={styles.brandMark}>
              <Ionicons color="#FFFFFF" name="checkmark" size={34} strokeWidth={4} />
            </View>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.description}>
              {step === 'set-password'
                ? labels.setPasswordDescription
                : step === 'registration-code'
                  ? labels.registrationCodeDescription(normalizedEmail)
                  : step === 'otp-code'
                    ? labels.codeDescription(normalizedEmail)
                    : labels.description}
            </Text>

            {isRemoteAuthConfigured ? (
              <>
                {step === 'credentials' ? (
                  <View style={styles.methodSwitch}>
                    {(['password', 'otp'] as AuthMethod[]).map((item) => (
                      <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected: method === item }}
                        key={item}
                        onPress={() => selectMethod(item)}
                        style={[
                          styles.methodOption,
                          method === item && styles.methodOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.methodOptionText,
                            method === item && styles.methodOptionTextActive,
                          ]}
                        >
                          {item === 'password'
                            ? labels.passwordMethod
                            : labels.otpMethod}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {step === 'credentials' ? (
                  <>
                    <TextInput
                      accessibilityLabel={labels.emailPlaceholder}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      editable={!busy}
                      keyboardType="email-address"
                      maxLength={254}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setError('');
                        setNotice('');
                        setEmail(value);
                      }}
                      onFocus={() => setFocusedField('email')}
                      placeholder={labels.emailPlaceholder}
                      placeholderTextColor="#A2A3B0"
                      returnKeyType="next"
                      style={[
                        styles.input,
                        focusedField === 'email' && styles.inputFocused,
                      ]}
                      textContentType="emailAddress"
                      value={email}
                    />
                    {method === 'password' ? (
                      <TextInput
                        accessibilityLabel={labels.passwordPlaceholder}
                        autoCapitalize="none"
                        autoComplete={
                          passwordMode === 'register'
                            ? 'new-password'
                            : 'current-password'
                        }
                        autoCorrect={false}
                        editable={!busy}
                        maxLength={128}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={(value) => {
                          setError('');
                          setPassword(value);
                        }}
                        onFocus={() => setFocusedField('password')}
                        onSubmitEditing={() => {
                          if (!primaryDisabled) {
                            void submitPassword();
                          }
                        }}
                        placeholder={labels.passwordPlaceholder}
                        placeholderTextColor="#A2A3B0"
                        returnKeyType="done"
                        secureTextEntry
                        style={[
                          styles.input,
                          styles.passwordInput,
                          focusedField === 'password' && styles.inputFocused,
                        ]}
                        textContentType={
                          passwordMode === 'register'
                            ? 'newPassword'
                            : 'password'
                        }
                        value={password}
                      />
                    ) : null}
                  </>
                ) : step === 'set-password' ? (
                  <>
                    <TextInput
                      accessibilityLabel={labels.passwordPlaceholder}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      autoCorrect={false}
                      editable={!busy}
                      maxLength={128}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setError('');
                        setPassword(value);
                      }}
                      onFocus={() => setFocusedField('password')}
                      placeholder={labels.passwordPlaceholder}
                      placeholderTextColor="#A2A3B0"
                      returnKeyType="next"
                      secureTextEntry
                      style={[
                        styles.input,
                        focusedField === 'password' && styles.inputFocused,
                      ]}
                      textContentType="newPassword"
                      value={password}
                    />
                    <TextInput
                      accessibilityLabel={labels.passwordConfirmPlaceholder}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      autoCorrect={false}
                      editable={!busy}
                      maxLength={128}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setError('');
                        setConfirmPassword(value);
                      }}
                      onFocus={() => setFocusedField('confirm')}
                      onSubmitEditing={() => {
                        if (!primaryDisabled) {
                          void submitSetPassword();
                        }
                      }}
                      placeholder={labels.passwordConfirmPlaceholder}
                      placeholderTextColor="#A2A3B0"
                      returnKeyType="done"
                      secureTextEntry
                      style={[
                        styles.input,
                        styles.passwordInput,
                        focusedField === 'confirm' && styles.inputFocused,
                      ]}
                      textContentType="newPassword"
                      value={confirmPassword}
                    />
                  </>
                ) : (
                  <TextInput
                    accessibilityLabel={labels.codePlaceholder}
                    autoComplete="one-time-code"
                    editable={!busy}
                    keyboardType="number-pad"
                    maxLength={6}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(value) => {
                      setError('');
                      setNotice('');
                      setCode(value.replace(/\D/g, '').slice(0, 6));
                    }}
                    onFocus={() => setFocusedField('code')}
                    onSubmitEditing={() => {
                      if (!primaryDisabled) {
                        void submitPrimary();
                      }
                    }}
                    placeholder={labels.codePlaceholder}
                    placeholderTextColor="#A2A3B0"
                    ref={codeInputRef}
                    returnKeyType="done"
                    style={[
                      styles.input,
                      styles.codeInput,
                      focusedField === 'code' && styles.inputFocused,
                    ]}
                    textContentType="oneTimeCode"
                    value={code}
                  />
                )}

                <Pressable
                  accessibilityRole="button"
                  disabled={primaryDisabled}
                  onPress={() => void submitPrimary()}
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
                    {primaryLabel}
                  </Text>
                </Pressable>

                {step === 'otp-code' || step === 'registration-code' ? (
                  <View style={styles.secondaryActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={resetCredentials}
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
                      onPress={() => void resendCurrentCode()}
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
                {step === 'set-password' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void skipSetPassword()}
                    style={({ pressed }) => [
                      styles.localButton,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.localButtonText}>
                      {labels.skipPassword}
                    </Text>
                  </Pressable>
                ) : null}
                {step === 'credentials' && method === 'password' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      setPasswordMode((current) =>
                        current === 'sign-in' ? 'register' : 'sign-in',
                      );
                      setError('');
                      setNotice('');
                    }}
                    style={({ pressed }) => [
                      styles.localButton,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.localButtonText}>
                      {passwordMode === 'sign-in'
                        ? labels.createAccount
                        : labels.useExistingAccount}
                    </Text>
                  </Pressable>
                ) : null}
                {step === 'credentials' && !onCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void onContinueLocally()}
                    style={({ pressed }) => [
                      styles.localButton,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.localButtonText}>
                      {labels.continue}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void onContinueLocally()}
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
    position: 'relative',
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
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
  methodSwitch: {
    backgroundColor: '#F1F0F5',
    borderRadius: 9,
    flexDirection: 'row',
    marginTop: 18,
    padding: 3,
    width: '100%',
  },
  methodOption: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  methodOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#343146',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  methodOptionText: {
    color: '#858694',
    fontSize: 12,
    fontWeight: '700',
  },
  methodOptionTextActive: {
    color: '#4F45C4',
  },
  input: {
    backgroundColor: '#F8F7FA',
    borderColor: '#DCD9E5',
    borderRadius: 8,
    borderWidth: 2,
    color: '#303145',
    fontSize: 15,
    height: 50,
    marginTop: 12,
    outlineColor: 'transparent',
    paddingHorizontal: 15,
    width: '100%',
  },
  codeInput: {
    marginTop: 20,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  passwordInput: {
    marginTop: 9,
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
  localButton: {
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  localButtonText: {
    color: '#6759E8',
    fontSize: 13,
    fontWeight: '700',
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
