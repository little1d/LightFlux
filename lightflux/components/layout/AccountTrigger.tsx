import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';

interface AccountTriggerProps {
  active: boolean;
  avatarUrl?: string;
  label: string;
  onPress: () => void;
  tooltipPosition: 'right' | 'bottom';
  variant?: 'primary' | 'neutral';
}

/**
 * The account/settings entry point. Renders the signed-in avatar when there is
 * one and falls back to the standard icon button otherwise.
 */
const AccountTrigger = ({
  active,
  avatarUrl,
  label,
  onPress,
  tooltipPosition,
  variant,
}: AccountTriggerProps) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  if (avatarUrl) {
    return (
      <View style={styles.accountTrigger}>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPress={onPress}
          style={({ pressed }) => [
            styles.accountAvatarButton,
            active && styles.accountAvatarButtonActive,
            (hovered || focused) && styles.accountAvatarButtonFocused,
            pressed && styles.accountAvatarButtonPressed,
          ]}
        >
          <Image source={{ uri: avatarUrl }} style={styles.accountAvatarImage} />
        </Pressable>
        <Tooltip
          label={label}
          position={tooltipPosition}
          visible={hovered || focused}
        />
      </View>
    );
  }

  return (
    <IconButton
      icon="person-circle-outline"
      label={label}
      onPress={onPress}
      size="large"
      tooltipPosition={tooltipPosition}
      variant={variant ?? (active ? 'primary' : 'neutral')}
    />
  );
};

const styles = StyleSheet.create({
  accountTrigger: {
    position: 'relative',
  },
  accountAvatarButton: {
    backgroundColor: '#F3F2F6',
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    height: 40,
    padding: 2,
    width: 40,
  },
  accountAvatarButtonActive: {
    backgroundColor: '#F0EEFF',
    borderColor: '#AFA6F5',
  },
  accountAvatarButtonFocused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  accountAvatarButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.93 }],
  },
  accountAvatarImage: {
    borderRadius: 6,
    height: '100%',
    width: '100%',
  },
});

export default AccountTrigger;
