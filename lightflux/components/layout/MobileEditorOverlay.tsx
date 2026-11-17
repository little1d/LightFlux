import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TaskEditorScreen from '../editor/TaskEditorScreen';

interface MobileEditorOverlayProps {
  closeLabel: string;
  height: number;
  onClose: () => void;
  readOnly: boolean;
  /** Changes whenever a different task is opened, forcing a fresh editor. */
  requestKey: string;
  todoId: string;
}

/** The full-screen task editor sheet used below desktop widths. */
const MobileEditorOverlay = ({
  closeLabel,
  height,
  onClose,
  readOnly,
  requestKey,
  todoId,
}: MobileEditorOverlayProps) => (
  <Modal
    animationType={Platform.OS === 'web' ? 'none' : 'slide'}
    onRequestClose={onClose}
    presentationStyle="overFullScreen"
    transparent
    visible
  >
    <View style={styles.mobileEditorOverlay}>
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.mobileEditorSheet,
          Platform.OS === 'web'
            ? {
                height: Math.min(
                  420,
                  Math.max(300, Math.round(height * 0.4)),
                ),
              }
            : styles.nativeEditorSheet,
        ]}
      >
        <TaskEditorScreen
          embedded
          key={requestKey}
          onClose={onClose}
          readOnly={readOnly}
          todoId={todoId}
        />
      </SafeAreaView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  mobileEditorOverlay: {
    backgroundColor: 'rgba(31, 30, 43, 0.2)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  mobileEditorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  nativeEditorSheet: {
    height: '88%',
    maxHeight: 760,
  },
});

export default MobileEditorOverlay;
