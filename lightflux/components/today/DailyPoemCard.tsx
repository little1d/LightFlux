import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DailyPoem, selectDailyPoem } from './dailyPoems';

// Classical CJK faces give the verse a literary quality that contrasts with
// the modern sans UI; each OS falls back to its serif/kaiti cut.
const SERIF_STACK =
  '"Kaiti SC","STKaiti","KaiTi","楷体","Songti SC",' +
  '"Noto Serif CJK SC","SimSun",serif';

interface DailyPoemCardProps {
  dateKey: string;
}

const DailyPoemCard = ({ dateKey }: DailyPoemCardProps) => {
  const poem: DailyPoem = selectDailyPoem(dateKey);
  const [expanded, setExpanded] = useState(false);

  // CSS-driven motion (RN Animated may not tick on Hermes-web).
  const revealRef = useRef<View>(null);
  const chevronRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    if (expanded) {
      const el = revealRef.current as unknown as HTMLElement | null;
      if (el) {
        el.style.animation = 'lf-poem-reveal .28s ease both';
      }
    }
    const icon = chevronRef.current as unknown as HTMLElement | null;
    if (icon) {
      icon.style.transition = 'transform .25s ease';
      icon.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }, [expanded]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((value) => !value)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.eyebrowRow}>
        <Text style={styles.sourceText}>
          {poem.dynasty} · {poem.author}《{poem.title}》
        </Text>
      </View>

      <View style={styles.versesBlock}>
        <Text style={styles.verseText}>{poem.verses.join('')}</Text>
      </View>

      {expanded ? (
        <View ref={revealRef} style={styles.detailBlock}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>译文</Text>
            <Text style={styles.detailParagraph}>{poem.translation}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>赏析</Text>
            <Text style={styles.detailParagraph}>{poem.analysis}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.hintRow}>
        <Text style={styles.hintText}>译文 · 赏析</Text>
        <View ref={chevronRef}>
          <Ionicons color="#A0A1AC" name="chevron-down" size={13} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FDFBF6',
    borderColor: '#EDE8DE',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#4B4963',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.92,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sourceText: {
    color: '#9A9BA8',
    fontSize: 10,
    fontWeight: '500',
  },
  versesBlock: {
    paddingTop: 10,
  },
  verseText: {
    color: '#35312A',
    fontFamily: SERIF_STACK,
    fontSize: 17,
    letterSpacing: 1.2,
    lineHeight: 30,
  },
  detailBlock: {
    borderTopColor: '#EFEAE0',
    borderTopWidth: 1,
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    color: '#8B6DF2',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  detailParagraph: {
    color: '#52535F',
    fontSize: 13,
    lineHeight: 21,
  },
  hintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingTop: 14,
  },
  hintText: {
    color: '#9297A8',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default DailyPoemCard;
