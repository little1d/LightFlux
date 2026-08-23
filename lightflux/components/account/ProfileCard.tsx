import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import type { Translation } from '../../content';
import {
  type RemoteUser,
  updateRemoteProfile,
} from '../../services/authApi';
import {
  ImageUploadError,
  uploadProfileImage,
} from '../../services/imageUpload';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import { useToast } from '../ui/ToastProvider';

const ProfileCard = ({
  cancelLabel,
  compact,
  currentUser,
  onProfileUpdated,
  onSignOut,
  labels,
}: {
  cancelLabel: string;
  compact: boolean;
  currentUser: RemoteUser;
  onProfileUpdated: (user: RemoteUser) => void;
  onSignOut: () => void;
  labels: Translation['settings'];
}) => {
  const notify = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarFocused, setAvatarFocused] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);

  useEffect(() => {
    setNameDraft(currentUser.name ?? '');
    setAvatarFailed(false);
  }, [currentUser.avatarUrl, currentUser.name]);

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || savingName) {
      return;
    }
    setSavingName(true);
    try {
      const user = await updateRemoteProfile({ name });
      onProfileUpdated(user);
      setEditingName(false);
      notify(labels.profileUpdated);
    } catch {
      notify(labels.profileUpdateError, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const chooseAvatar = async () => {
    if (uploadingAvatar) {
      return;
    }
    if (Platform.OS !== 'web') {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify(labels.avatarPermissionDenied, 'error');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadProfileImage(result.assets[0]);
      const user = await updateRemoteProfile({ avatarUrl });
      onProfileUpdated(user);
      notify(labels.profileUpdated);
    } catch (error) {
      notify(
        error instanceof ImageUploadError
          ? labels.avatarUploadError
          : labels.profileUpdateError,
        'error',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName =
    currentUser.name?.trim() ||
    currentUser.email.split('@')[0] ||
    currentUser.email;

  return (
    <View
      style={[
        styles.card,
        compact ? styles.cardCompact : styles.cardWide,
      ]}
    >
      <View style={styles.identityRow}>
        <View
          style={[
            styles.avatarPosition,
            compact && styles.avatarPositionCompact,
          ]}
        >
          <Pressable
            accessibilityLabel={labels.changeAvatar}
            accessibilityRole="button"
            disabled={uploadingAvatar}
            onBlur={() => setAvatarFocused(false)}
            onFocus={() => setAvatarFocused(true)}
            onHoverIn={() => setAvatarHovered(true)}
            onHoverOut={() => setAvatarHovered(false)}
            onPress={() => void chooseAvatar()}
            style={({ pressed }) => [
              styles.avatarButton,
              compact && styles.avatarButtonCompact,
              (avatarHovered || avatarFocused) && styles.avatarButtonActive,
              pressed && styles.pressed,
            ]}
          >
            {currentUser.avatarUrl && !avatarFailed ? (
              <Image
                onError={() => setAvatarFailed(true)}
                source={{ uri: currentUser.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons
                  color="#FFFFFF"
                  name="person"
                  size={compact ? 17 : 20}
                />
              </View>
            )}
            {uploadingAvatar ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : null}
          </Pressable>
          <Tooltip
            appearance="light"
            label={labels.changeAvatar}
            position="right"
            visible={avatarHovered || avatarFocused}
          />
        </View>

        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={compact ? 2 : 1}
              style={[styles.name, compact && styles.nameCompact]}
            >
              {displayName}
            </Text>
            <IconButton
              icon="create-outline"
              label={labels.editProfileName}
              onPress={() => {
                setNameDraft(displayName);
                setEditingName(true);
              }}
              showTooltip={!compact}
              size="compact"
              variant="transparent"
            />
          </View>
          <Text
            numberOfLines={compact ? 2 : 1}
            selectable
            style={[styles.email, compact && styles.emailCompact]}
          >
            {currentUser.email}
          </Text>
        </View>

        {compact ? (
          <Pressable
            accessibilityLabel={labels.signOut}
            accessibilityRole="button"
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.compactSignOutButton,
              pressed && styles.signOutButtonPressed,
            ]}
          >
            <Ionicons color="#C84F60" name="log-out-outline" size={15} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel={labels.signOut}
            accessibilityRole="button"
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
            ]}
          >
            <Ionicons color="#C84F60" name="log-out-outline" size={14} />
            <Text style={styles.signOutText}>{labels.signOut}</Text>
          </Pressable>
        )}
      </View>

      {editingName ? (
        <View style={styles.nameEditor}>
          <TextInput
            {...inputAccentProps}
            accessibilityLabel={labels.profileNamePlaceholder}
            autoFocus
            editable={!savingName}
            maxLength={60}
            onChangeText={setNameDraft}
            onSubmitEditing={() => void saveName()}
            placeholder={labels.profileNamePlaceholder}
            placeholderTextColor="#A2A3B0"
            returnKeyType="done"
            style={styles.nameInput}
            value={nameDraft}
          />
          <IconButton
            disabled={!nameDraft.trim() || savingName}
            icon="checkmark"
            label={labels.saveProfile}
            onPress={() => void saveName()}
            showTooltip={!compact}
            size="compact"
            variant="primary"
          />
          <IconButton
            disabled={savingName}
            icon="close"
            label={cancelLabel}
            onPress={() => {
              setNameDraft(currentUser.name ?? '');
              setEditingName(false);
            }}
            showTooltip={!compact}
            size="compact"
            variant="transparent"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  cardCompact: {
    paddingVertical: 5,
  },
  cardWide: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatarPosition: {
    marginRight: 10,
    position: 'relative',
    zIndex: 2,
  },
  avatarPositionCompact: {
    marginRight: 8,
  },
  avatarButton: {
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    overflow: 'hidden',
    position: 'relative',
    width: 40,
  },
  avatarButtonActive: {
    borderColor: '#AFA7EE',
    shadowColor: '#39334F',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  avatarButtonCompact: {
    borderRadius: 17,
    height: 34,
    width: 34,
  },
  avatarImage: {
    borderRadius: 20,
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 20,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarLoading: {
    alignItems: 'center',
    backgroundColor: 'rgba(35, 32, 56, 0.56)',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  name: {
    color: '#2E2F41',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  nameCompact: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  email: {
    color: '#858797',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  emailCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#F0CDD3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginLeft: 10,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  compactSignOutButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    marginLeft: 4,
    width: 28,
  },
  signOutButtonPressed: {
    backgroundColor: '#FFEAED',
  },
  signOutText: {
    color: '#C84F60',
    fontSize: 11,
    fontWeight: '500',
  },
  nameEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 9,
  },
  nameInput: {
    backgroundColor: '#F8F7FA',
    borderColor: '#DCD9E5',
    borderRadius: 8,
    borderWidth: 1,
    color: '#303145',
    flex: 1,
    fontSize: 12,
    height: 34,
    minWidth: 0,
    outlineColor: 'transparent',
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});

export default ProfileCard;
