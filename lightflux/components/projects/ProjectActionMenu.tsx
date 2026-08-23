import React, { useState } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import { ProjectMenuPosition } from './useProjectContextMenu';

type EditMode = 'before' | 'after' | 'rename' | null;

interface ProjectActionMenuProps {
  canDelete: boolean;
  projectName: string;
  onAdd: (name: string, position: 'before' | 'after') => void;
  onClose: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  position?: ProjectMenuPosition;
}

const MENU_WIDTH = 220;

const ProjectActionMenu = ({
  canDelete,
  projectName,
  onAdd,
  onClose,
  onDelete,
  onRename,
  position,
}: ProjectActionMenuProps) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];
  const [mode, setMode] = useState<EditMode>(null);
  const [draft, setDraft] = useState('');

  const beginEdit = (nextMode: Exclude<EditMode, null>) => {
    setMode(nextMode);
    setDraft(nextMode === 'rename' ? projectName : '');
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
      estimatedHeight={mode ? 150 : canDelete ? 190 : 145}
      onClose={onClose}
      position={position}
      width={MENU_WIDTH}
    >
      {mode ? (
        <View className="p-2.5">
          <Text className="mb-2 text-[11px] font-semibold text-[#858693]">
            {mode === 'rename'
              ? labels.projects.renameProject
              : mode === 'before'
                ? labels.projects.addProjectAbove
                : labels.projects.addProjectBelow}
          </Text>
          <TextInput
            {...inputAccentProps}
            accessibilityLabel={labels.projects.projectPlaceholder}
            autoFocus
            className="h-9 rounded-[8px] border border-[#DDD9EC] bg-[#F8F7FB] px-2.5 text-[12px] text-[#303145]"
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={labels.projects.projectPlaceholder}
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
                  ? labels.projects.confirmRename
                  : labels.projects.confirmAdd
              }
              onPress={submit}
              size="small"
            />
          </View>
        </View>
      ) : (
        <>
          <MenuItem
            label={labels.projects.renameProject}
            onPress={() => beginEdit('rename')}
          />
          <MenuItem
            label={labels.projects.addProjectAbove}
            onPress={() => beginEdit('before')}
          />
          <MenuItem
            label={labels.projects.addProjectBelow}
            onPress={() => beginEdit('after')}
          />
          {canDelete ? (
            <MenuItem
              danger
              label={labels.projects.deleteProject}
              onPress={onDelete}
            />
          ) : null}
        </>
      )}
    </MenuSurface>
  );
};

export default ProjectActionMenu;
