import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Project } from '../../../types/todo';
import MenuItem from '../../ui/MenuItem';

interface ProjectPickerListProps {
  /** Already ordered by sortOrder then creation time. */
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  /** The taller variant used inside the mobile sheet. */
  mobile?: boolean;
}

/** The scrollable project list shared by the sheet and the desktop flyout. */
const ProjectPickerList = ({
  projects,
  selectedProjectId,
  onSelect,
  mobile = false,
}: ProjectPickerListProps) => (
  <ScrollView
    contentContainerStyle={styles.projectListContent}
    showsVerticalScrollIndicator={false}
    style={[styles.projectList, mobile && styles.mobileProjectList]}
  >
    {projects.map((project) => (
      <MenuItem
        icon={
          <View
            style={[styles.projectDot, { backgroundColor: project.color }]}
          />
        }
        key={project.id}
        label={project.name}
        onPress={() => onSelect(project.id)}
        selected={selectedProjectId === project.id}
        trailing={
          selectedProjectId === project.id ? (
            <Ionicons color="#6759E8" name="checkmark" size={17} />
          ) : null
        }
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  projectDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  projectList: {
    maxHeight: 264,
  },
  mobileProjectList: {
    maxHeight: 380,
  },
  projectListContent: {
    paddingBottom: 2,
  },
});

export default ProjectPickerList;
