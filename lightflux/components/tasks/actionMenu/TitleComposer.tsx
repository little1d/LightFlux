import { StyleSheet, TextInput, View } from 'react-native';

import { inputAccentProps } from '../../../config/input';
import ActionButton from '../../ui/ActionButton';

interface TitleComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  accessibilityLabel: string;
  confirmLabel: string;
  /**
   * The sheet variant sits below a header and fills the sheet width; the
   * popover variant is inset and stacks vertically when the popover is narrow.
   */
  variant: 'sheet' | 'popover';
  compact?: boolean;
  nativeID?: string;
}

/**
 * The inline composer used both to rename a task and to add a subtask. The two
 * flows differ only in their placeholder, their confirm label and which store
 * call runs on submit, so they share one input.
 */
const TitleComposer = ({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  accessibilityLabel,
  confirmLabel,
  variant,
  compact = false,
  nativeID,
}: TitleComposerProps) => {
  const sheet = variant === 'sheet';
  return (
    <View
      nativeID={nativeID}
      style={
        sheet
          ? styles.sheetComposer
          : [styles.composer, compact && styles.composerCompact]
      }
    >
      <TextInput
        {...inputAccentProps}
        accessibilityLabel={accessibilityLabel}
        autoFocus
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#9A9BA8"
        returnKeyType="done"
        style={sheet ? styles.sheetInput : [styles.input, compact && styles.inputCompact]}
        value={value}
      />
      {sheet ? (
        <ActionButton
          disabled={!value.trim()}
          label={confirmLabel}
          onPress={onSubmit}
          size="small"
        />
      ) : (
        <View
          style={[
            styles.submitButton,
            compact && styles.submitButtonCompact,
          ]}
        >
          <ActionButton
            disabled={!value.trim()}
            label={confirmLabel}
            onPress={onSubmit}
            size="small"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sheetComposer: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#D8D4F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    padding: 7,
    paddingLeft: 12,
  },
  sheetInput: {
    color: '#303145',
    flex: 1,
    fontSize: 14,
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  composer: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#D8D4F0',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    margin: 8,
    padding: 4,
    paddingLeft: 10,
  },
  composerCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    padding: 8,
  },
  input: {
    color: '#303145',
    flex: 1,
    fontSize: 12,
    height: 32,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  inputCompact: {
    flex: 0,
    paddingHorizontal: 3,
    width: '100%',
  },
  submitButton: {
    flexShrink: 0,
    marginLeft: 6,
  },
  submitButtonCompact: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginTop: 8,
  },
});

export default TitleComposer;
