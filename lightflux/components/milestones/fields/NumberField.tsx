import { StyleSheet, Text, TextInput, View } from 'react-native';

import { inputAccentProps } from '../../../config/input';

interface NumberFieldProps {
  label: string;
  onChange: (value: string) => void;
  value: string;
  wide?: boolean;
}

const NumberField = ({
  label,
  onChange,
  value,
  wide = false,
}: NumberFieldProps) => (
  <View style={[styles.numberField, wide && styles.numberFieldWide]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      {...inputAccentProps}
      accessibilityLabel={label}
      keyboardType="number-pad"
      maxLength={4}
      onChangeText={onChange}
      style={styles.numberInput}
      value={value}
    />
  </View>
);

const styles = StyleSheet.create({
  numberField: {
    marginRight: 8,
    width: 72,
  },
  numberFieldWide: {
    width: 118,
  },
  fieldLabel: {
    color: '#7D7E8C',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
  },
  numberInput: {
    backgroundColor: '#F8F7FA',
    borderColor: '#E1DFE8',
    borderRadius: 9,
    borderWidth: 1,
    color: '#38394B',
    fontSize: 12,
    minHeight: 36,
    paddingHorizontal: 10,
  },
});

export default NumberField;
