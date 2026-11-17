import { StyleSheet, Text, View } from 'react-native';

import IconButton from '../../ui/IconButton';

interface TaskSheetHeaderProps {
  title: string;
  /** Renders a back button that returns to the root action list. */
  back?: boolean;
  backLabel: string;
  closeLabel: string;
  onBack: () => void;
  onClose: () => void;
}

/** The grab handle plus title row at the top of a mobile action sheet. */
const TaskSheetHeader = ({
  title,
  back = false,
  backLabel,
  closeLabel,
  onBack,
  onClose,
}: TaskSheetHeaderProps) => (
  <>
    <View style={styles.sheetHandle} />
    <View style={styles.sheetHeader}>
      {back ? (
        <IconButton
          icon="chevron-back"
          label={backLabel}
          onPress={onBack}
          size="small"
          variant="transparent"
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.sheetTitle, back && styles.sheetTitleWithBack]}
      >
        {title}
      </Text>
      <IconButton
        icon="close"
        label={closeLabel}
        onPress={onClose}
        showTooltip={false}
        size="small"
        variant="transparent"
      />
    </View>
  </>
);

const styles = StyleSheet.create({
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D7D5DF',
    borderRadius: 2,
    height: 4,
    marginBottom: 5,
    width: 34,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 42,
  },
  sheetTitle: {
    color: '#303145',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  sheetTitleWithBack: {
    marginLeft: 3,
  },
});

export default TaskSheetHeader;
