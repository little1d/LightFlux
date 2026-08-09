import React, { useState } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { useTodos } from '../../context/TodoContext';
import { translations } from '../../i18n/translations';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import { GroupMenuPosition } from './useGroupContextMenu';

type EditMode = 'before' | 'after' | 'rename' | null;

interface GroupActionMenuProps {
  groupId: string | null;
  groupName: string;
  onAdd: (name: string, position: 'before' | 'after') => void;
  onClose: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  position?: GroupMenuPosition;
}

const MENU_WIDTH = 220;

const GroupActionMenu = ({
  groupId,
  groupName,
  onAdd,
  onClose,
  onDelete,
  onRename,
  position,
}: GroupActionMenuProps) => {
  const { language } = useTodos();
  const labels = translations[language];
  const [mode, setMode] = useState<EditMode>(null);
  const [draft, setDraft] = useState('');

  const beginEdit = (nextMode: Exclude<EditMode, null>) => {
    setMode(nextMode);
    setDraft(nextMode === 'rename' ? groupName : '');
  };

  const submit = () => {
    const name = draft.trim();
    if (!name || !mode) {
      return;
    }

    if (mode === 'rename') {
      onRename(name);
    } else {
      onAdd(name, mode);
    }
    Keyboard.dismiss();
    onClose();
  };

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={mode ? 150 : groupId ? 190 : 145}
      onClose={onClose}
      position={position}
      width={MENU_WIDTH}
    >
      {mode ? (
        <View className="p-2.5">
          <Text className="mb-2 text-[11px] font-semibold text-[#858693]">
            {mode === 'rename'
              ? labels.groups.renameGroup
              : mode === 'before'
                ? labels.groups.addGroupAbove
                : labels.groups.addGroupBelow}
          </Text>
          <TextInput
            {...inputAccentProps}
            accessibilityLabel={labels.groups.groupPlaceholder}
            autoFocus
            className="h-9 rounded-[8px] border border-[#DDD9EC] bg-[#F8F7FB] px-2.5 text-[12px] text-[#303145]"
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={labels.groups.groupPlaceholder}
            placeholderTextColor="#9A9BA8"
            returnKeyType="done"
            value={draft}
          />
          <View className="mt-2 flex-row justify-end">
            <ActionButton
              label={labels.cancel}
              onPress={() => setMode(null)}
              size="small"
              variant="ghost"
            />
            <View className="w-1" />
            <ActionButton
              disabled={!draft.trim()}
              label={
                mode === 'rename'
                  ? labels.groups.confirmRename
                  : labels.groups.confirmAdd
              }
              onPress={submit}
              size="small"
            />
          </View>
        </View>
      ) : (
        <>
          <MenuItem
            label={labels.groups.renameGroup}
            onPress={() => beginEdit('rename')}
          />
          <MenuItem
            label={labels.groups.addGroupAbove}
            onPress={() => beginEdit('before')}
          />
          <MenuItem
            label={labels.groups.addGroupBelow}
            onPress={() => beginEdit('after')}
          />
          {groupId ? (
            <MenuItem
              danger
              label={labels.groups.deleteGroup}
              onPress={onDelete}
            />
          ) : null}
        </>
      )}
    </MenuSurface>
  );
};

export default GroupActionMenu;
