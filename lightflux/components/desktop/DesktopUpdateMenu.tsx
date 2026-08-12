import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../../content';
import { useDesktopStore } from '../../store/desktopStore';
import { Language } from '../../types/todo';
import ActionButton from '../ui/ActionButton';
import MenuSurface, {
  MenuSurfacePosition,
} from '../ui/MenuSurface';

interface DesktopUpdateMenuProps {
  language: Language;
  onClose: () => void;
  onRelaunch: () => Promise<void>;
  position?: MenuSurfacePosition;
}

const DesktopUpdateMenu = ({
  language,
  onClose,
  onRelaunch,
  position,
}: DesktopUpdateMenuProps) => {
  const {
    downloadUpdate,
    updateError,
    updateInfo,
    updateProgress,
    updateStatus,
  } = useDesktopStore(
    useShallow((state) => ({
      downloadUpdate: state.downloadUpdate,
      updateError: state.updateError,
      updateInfo: state.updateInfo,
      updateProgress: state.updateProgress,
      updateStatus: state.updateStatus,
    })),
  );
  const labels = translations[language].desktop.updateMenu;
  const required = updateInfo?.required === true;
  const progress =
    updateProgress === null ? null : Math.round(updateProgress * 100);
  const title =
    updateStatus === 'ready'
      ? labels.ready
      : updateStatus === 'downloading'
        ? labels.downloading
        : updateStatus === 'error'
          ? labels.failed
          : labels.available(updateInfo?.version ?? '');

  return (
    <MenuSurface
      closeLabel={labels.close}
      estimatedHeight={260}
      onClose={required ? () => undefined : onClose}
      position={position}
      width={310}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.icon}>
            <Ionicons
              color="#6759E8"
              name={
                updateStatus === 'ready'
                  ? 'checkmark'
                  : updateStatus === 'error'
                    ? 'alert'
                    : 'download-outline'
              }
              size={18}
            />
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>
              {required ? labels.required : labels.stable}
            </Text>
          </View>
        </View>

        {updateStatus === 'error' ? (
          <Text style={styles.error} numberOfLines={3}>
            {updateError || labels.tryAgain}
          </Text>
        ) : (
          <Text style={styles.body} numberOfLines={4}>
            {updateInfo?.body || labels.fallbackBody}
          </Text>
        )}

        {updateStatus === 'downloading' ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress ?? 18}%` },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          {!required && updateStatus !== 'ready' ? (
            <ActionButton
              label={labels.later}
              onPress={onClose}
              size="small"
              variant="ghost"
            />
          ) : null}
          {updateStatus === 'available' || updateStatus === 'error' ? (
            <ActionButton
              label={labels.download}
              onPress={() => void downloadUpdate()}
              size="small"
            />
          ) : null}
          {updateStatus === 'downloading' ? (
            <Text style={styles.progressText}>
              {progress === null ? labels.downloadingProgress : `${progress}%`}
            </Text>
          ) : null}
          {updateStatus === 'ready' ? (
            <ActionButton
              label={labels.restart}
              onPress={() => void onRelaunch()}
              size="small"
            />
          ) : null}
        </View>
      </View>
    </MenuSurface>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  icon: {
    alignItems: 'center',
    backgroundColor: '#EEEAFE',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginRight: 11,
    width: 38,
  },
  heading: {
    flex: 1,
  },
  title: {
    color: '#303143',
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: '#8A8B98',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  body: {
    borderTopColor: '#EBEAF0',
    borderTopWidth: 1,
    color: '#666778',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    paddingTop: 11,
  },
  error: {
    backgroundColor: '#FFF1F3',
    borderRadius: 9,
    color: '#B44758',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    padding: 10,
  },
  progressTrack: {
    backgroundColor: '#E9E7F0',
    borderRadius: 3,
    height: 6,
    marginTop: 13,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#6759E8',
    borderRadius: 3,
    height: 6,
    minWidth: 8,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  progressText: {
    color: '#6759E8',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DesktopUpdateMenu;
