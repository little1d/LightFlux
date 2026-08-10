import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../../i18n/translations';
import { useTodoStore } from '../../store/todoStore';
import { getMilestoneOccurrence } from '../../utils/milestoneDate';
import { todayKey } from '../../utils/date';
import MenuItem from '../ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from '../ui/MenuSurface';

interface MilestoneActionMenuProps {
  milestoneId: string;
  onClose: () => void;
  onEdit: () => void;
  onNotify: (message: string) => void;
  position?: MenuSurfacePosition;
}

const MilestoneActionMenu = ({
  milestoneId,
  onClose,
  onEdit,
  onNotify,
  position,
}: MilestoneActionMenuProps) => {
  const {
    language,
    allMilestones,
    updateMilestone,
    archiveMilestone,
    unarchiveMilestone,
    trashMilestone,
    addTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      allMilestones: state.allMilestones,
      updateMilestone: state.updateMilestone,
      archiveMilestone: state.archiveMilestone,
      unarchiveMilestone: state.unarchiveMilestone,
      trashMilestone: state.trashMilestone,
      addTodo: state.addTodo,
    })),
  );
  const labels = translations[language].milestones;
  const milestone = allMilestones.find((item) => item.id === milestoneId);
  if (!milestone) {
    return null;
  }

  const edit = () => {
    onEdit();
    onClose();
  };
  const togglePin = () => {
    updateMilestone(milestone.id, { pinned: !milestone.pinned });
    onClose();
  };
  const createTask = () => {
    const occurrence = getMilestoneOccurrence(milestone);
    addTodo({
      title: milestone.title,
      scheduledDate:
        occurrence && occurrence.daysFrom >= 0
          ? occurrence.dateKey
          : todayKey(),
      milestoneId: milestone.id,
    });
    onNotify(labels.relatedTaskCreated);
    onClose();
  };
  const toggleArchive = () => {
    if (milestone.archivedAt) {
      unarchiveMilestone(milestone.id);
    } else {
      archiveMilestone(milestone.id);
    }
    onClose();
  };
  const trash = () => {
    trashMilestone(milestone.id);
    onNotify(labels.trashed);
    onClose();
  };

  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) => (
    <Ionicons color="#666778" name={name} size={17} />
  );

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={305}
      onClose={onClose}
      position={position}
      width={230}
    >
      <MenuItem icon={icon('pencil-outline')} label={labels.edit} onPress={edit} />
      <MenuItem
        icon={icon(milestone.pinned ? 'pin' : 'pin-outline')}
        label={milestone.pinned ? labels.unpin : labels.pin}
        onPress={togglePin}
      />
      <MenuItem
        icon={icon('color-palette-outline')}
        label={labels.editStyle}
        onPress={edit}
      />
      <MenuItem
        icon={icon('document-text-outline')}
        label={labels.editNotes}
        onPress={edit}
      />
      <MenuItem
        icon={icon('checkbox-outline')}
        label={labels.createTask}
        onPress={createTask}
      />
      <MenuItem
        icon={icon(
          milestone.archivedAt ? 'arrow-undo-outline' : 'archive-outline',
        )}
        label={milestone.archivedAt ? labels.unarchive : labels.archive}
        onPress={toggleArchive}
      />
      <MenuItem
        danger
        icon={icon('trash-outline')}
        label={labels.moveToTrash}
        onPress={trash}
      />
    </MenuSurface>
  );
};

export default MilestoneActionMenu;
