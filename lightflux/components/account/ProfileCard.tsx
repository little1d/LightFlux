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
        <Pressable
          accessibilityLabel={labels.changeAvatar}
          accessibilityRole="button"
          disabled={uploadingAvatar}
          onPress={() => void chooseAvatar()}
          style={({ pressed }) => [
            styles.avatarButton,
            compact && styles.avatarButtonCompact,
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
                size={compact ? 18 : 22}
              />
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons color="#FFFFFF" name="camera" size={10} />
            )}
          </View>
        </Pressable>

        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={compact ? 2 : 1}
              style={[styles.name, compact && styles.nameCompact]}
            >
              {displayName}
            </Text>
            <IconButton
              icon="pencil-outline"
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
    paddingVertical: 6,
  },
  cardWide: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatarButton: {
    height: 44,
    marginRight: 12,
    position: 'relative',
    width: 44,
  },
  avatarButtonCompact: {
    height: 36,
    marginRight: 8,
    width: 36,
  },
  avatarImage: {
    borderRadius: 22,
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 22,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: '#5043C8',
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    bottom: -2,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 16,
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
    fontSize: 15,
    fontWeight: '700',
  },
  nameCompact: {
    fontSize: 13,
    fontWeight: '600',
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
    gap: 6,
    marginLeft: 10,
    minHeight: 34,
    paddingHorizontal: 12,
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
    fontSize: 12,
    fontWeight: '600',
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
