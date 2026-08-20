import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useRef, useState } from 'react';
import {
  type DimensionValue,
  Pressable,
  Text,
  View,
} from 'react-native';

import { DockIconStyle } from '../../services/desktopRuntime';
import MenuItem from '../ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from '../ui/MenuSurface';
import styles from './styles';

export interface SettingOption<T extends string> {
  label: string;
  value: T;
}

export const SettingRow = ({
  children,
  compact = false,
  description,
  focused = false,
  stacked,
  title,
}: {
  children: React.ReactNode;
  compact?: boolean;
  description?: string;
  focused?: boolean;
  stacked: boolean;
  title: string;
}) => (
  <View
    style={[
      styles.settingRow,
      stacked && styles.settingRowStacked,
      !description && styles.settingRowSimple,
      compact && styles.settingRowCompact,
      focused && styles.settingRowFocused,
    ]}
  >
    <View
      style={[
        styles.settingCopy,
        stacked && styles.settingCopyStacked,
        !description && styles.settingCopySimple,
        compact && styles.settingCopyCompact,
      ]}
    >
      <Text style={styles.settingTitle}>{title}</Text>
      {description ? (
        <Text style={styles.settingDescription}>{description}</Text>
      ) : null}
    </View>
    <View style={[styles.settingControl, stacked && styles.controlStacked]}>
      {children}
    </View>
  </View>
);

export const SettingSelect = <T extends string>({
  closeLabel,
  compact = false,
  onFocusChange,
  onSelect,
  options,
  value,
  width,
}: {
  closeLabel: string;
  compact?: boolean;
  onFocusChange: (focused: boolean) => void;
  onSelect: (value: T) => void;
  options: SettingOption<T>[];
  value: T;
  width: DimensionValue;
}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuWidth, setMenuWidth] = useState(280);
  const [position, setPosition] = useState<MenuSurfacePosition>();
  const targetRef = useRef<View>(null);
  const selected =
    options.find((option) => option.value === value)?.label ?? '';

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    targetRef.current?.measureInWindow((x, y, measuredWidth, height) => {
      setMenuWidth(measuredWidth);
      setPosition({ x, y: y + height + 8 });
      setOpen(true);
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onBlur={() => onFocusChange(false)}
        onFocus={() => onFocusChange(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={toggle}
        ref={targetRef}
        style={({ pressed }) => [
          styles.select,
          compact && styles.selectCompact,
          { width },
          hovered && styles.selectHovered,
          open && styles.selectOpen,
          pressed && styles.controlPressed,
        ]}
      >
        <Text numberOfLines={1} style={styles.selectText}>
          {selected}
        </Text>
        <Ionicons
          color="#777888"
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
        />
      </Pressable>
      {open ? (
        <MenuSurface
          closeLabel={closeLabel}
          estimatedHeight={options.length * 44 + 12}
          onClose={() => setOpen(false)}
          position={position}
          width={menuWidth}
        >
          {options.map((option) => (
            <MenuItem
              key={option.value}
              label={option.label}
              onPress={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              selected={option.value === value}
              trailing={
                option.value === value ? (
                  <Ionicons color="#6759E8" name="checkmark" size={17} />
                ) : null
              }
            />
          ))}
        </MenuSurface>
      ) : null}
    </>
  );
};

export const SettingToggle = ({
  label,
  onChange,
  onFocusChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  onFocusChange: (focused: boolean) => void;
  value: boolean;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    onBlur={() => onFocusChange(false)}
    onFocus={() => onFocusChange(true)}
    onPress={() => onChange(!value)}
    style={({ pressed }) => [
      styles.toggle,
      value && styles.toggleActive,
      pressed && styles.controlPressed,
    ]}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
  </Pressable>
);

export const DockIconPreview = ({
  selected,
  style,
}: {
  selected: boolean;
  style: DockIconStyle;
}) => (
  <View
    style={[
      styles.dockIconPreview,
      style === 'paper' && styles.dockIconPaper,
      style === 'graphite' && styles.dockIconGraphite,
      selected && styles.dockIconPreviewSelected,
    ]}
  >
    <Ionicons
      color={style === 'paper' ? '#6759E8' : '#FFFFFF'}
      name="checkmark"
      size={26}
    />
    <View
      style={[
        styles.dockIconLine,
        style === 'paper' && styles.dockIconLinePaper,
      ]}
    />
    <View
      style={[
        styles.dockIconDot,
        style === 'paper' && styles.dockIconDotPaper,
      ]}
    />
  </View>
);
