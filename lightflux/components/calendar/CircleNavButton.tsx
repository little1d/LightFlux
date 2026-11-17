import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface CircleNavButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

const CircleNavButton = ({ icon, label, onPress }: CircleNavButtonProps) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRound,
        hovered && styles.navRoundHover,
        pressed && styles.navRoundPressed,
      ]}
    >
      <Ionicons
        color={hovered ? '#6759E8' : '#858692'}
        name={icon}
        size={16}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  navRound: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navRoundHover: {
    backgroundColor: '#F3F1FE',
  },
  navRoundPressed: {
    backgroundColor: '#E9E5FC',
  },
});

export default CircleNavButton;
