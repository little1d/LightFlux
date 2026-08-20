import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { translations } from '../content';
import { useTodoStore } from '../store/todoStore';
import { MilestoneType, NewMilestone } from '../types/todo';
import { fromDateKey } from '../utils/date';
import { getMilestoneOccurrence } from '../utils/milestoneDate';
import MilestoneActionMenu from './milestones/MilestoneActionMenu';
import MilestoneCard from './milestones/MilestoneCard';
import MilestoneEditorCard from './milestones/MilestoneEditorCard';
import { OpenMilestoneMenu } from './milestones/useMilestoneContextMenu';
import MenuItem from './ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from './ui/MenuSurface';
import IconButton from './ui/IconButton';
import { useToast } from './ui/ToastProvider';

type MilestoneFilter = 'all' | MilestoneType | 'archived';

const FILTERS: MilestoneFilter[] = [
  'all',
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
  'archived',
];
const TEMPLATES: MilestoneType[] = [
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
];

const MilestonesScreen = () => {
  const notify = useToast();
  const {
    language,
    milestones,
    archivedMilestones,
    allMilestones,
    addMilestone,
    updateMilestone,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      milestones: state.milestones,
      archivedMilestones: state.archivedMilestones,
      allMilestones: state.allMilestones,
      addMilestone: state.addMilestone,
      updateMilestone: state.updateMilestone,
    })),
  );
  const labels = translations[language].milestones;
  const { width: viewportWidth } = useWindowDimensions();
  const compactHeader = viewportWidth < DESKTOP_LAYOUT_BREAKPOINT;
  const dateKey = useCurrentDateKey();
  const referenceDate = useMemo(() => fromDateKey(dateKey), [dateKey]);
  const addButtonRef = useRef<View>(null);
  const [filter, setFilter] = useState<MilestoneFilter>('all');
  const [query, setQuery] = useState('');
  const [contentWidth, setContentWidth] = useState(0);
  const [templateMenu, setTemplateMenu] =
    useState<MenuSurfacePosition | null>(null);
  const [editor, setEditor] = useState<{
    template: MilestoneType;
    milestoneId?: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{
    milestoneId: string;
    position?: MenuSurfacePosition;
  } | null>(null);
  const columns = contentWidth >= 980 ? 3 : contentWidth >= 620 ? 2 : 1;

  const openTemplateMenu = () => {
    if (Platform.OS === 'web') {
      const element = addButtonRef.current as unknown as HTMLElement | null;
      const rect = element?.getBoundingClientRect();
      if (rect) {
        setTemplateMenu({ x: rect.right - 230, y: rect.bottom + 8 });
        return;
      }
    }
    setTemplateMenu({ x: 0, y: 0 });
  };
  const openActionMenu = useCallback<OpenMilestoneMenu>(
    (milestoneId, position) => {
      setSelectedId(milestoneId);
      setActionMenu({ milestoneId, position });
    },
    [],
  );

  const source =
    filter === 'archived' ? archivedMilestones : milestones;
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return source
      .filter(
        (milestone) =>
          (filter === 'all' ||
            filter === 'archived' ||
            milestone.type === filter) &&
          (!normalizedQuery ||
            milestone.title.toLocaleLowerCase().includes(normalizedQuery) ||
            milestone.notes.toLocaleLowerCase().includes(normalizedQuery)),
      )
      .map((milestone) => ({
        milestone,
        occurrence: getMilestoneOccurrence(milestone, referenceDate),
      }))
      .sort((a, b) => {
        if (a.milestone.pinned !== b.milestone.pinned) {
          return a.milestone.pinned ? -1 : 1;
        }
        const aDays = a.occurrence?.daysFrom ?? Number.MAX_SAFE_INTEGER;
        const bDays = b.occurrence?.daysFrom ?? Number.MAX_SAFE_INTEGER;
        const aPast = aDays < 0;
        const bPast = bDays < 0;
        if (aPast !== bPast) {
          return aPast ? 1 : -1;
        }
        return aPast ? bDays - aDays : aDays - bDays;
      });
  }, [filter, query, referenceDate, source]);

  const editingMilestone = editor?.milestoneId
    ? allMilestones.find((milestone) => milestone.id === editor.milestoneId)
    : undefined;
  const saveEditor = (value: NewMilestone) => {
    if (editingMilestone) {
      updateMilestone(editingMilestone.id, value);
      notify(labels.updated);
    } else {
      addMilestone(value);
      notify(labels.created);
    }
    setEditor(null);
  };
  const selectTemplate = (template: MilestoneType) => {
    setTemplateMenu(null);
    setEditor({ template });
  };

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            compactHeader && styles.contentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View
            style={[
              styles.header,
              compactHeader && styles.headerCompact,
            ]}
          >
            {!compactHeader ? (
              <View>
                <Text style={styles.title}>{labels.title}</Text>
                {milestones.length > 0 ? (
                  <Text style={styles.count}>
                    {labels.count(milestones.length)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View
              style={[
                styles.headerActions,
                compactHeader && styles.headerActionsCompact,
              ]}
            >
              <View
                style={[
                  styles.search,
                  compactHeader && styles.searchCompact,
                ]}
              >
                <Ionicons color="#999AA6" name="search" size={15} />
                <TextInput
                  {...inputAccentProps}
                  accessibilityLabel={translations[language].search.placeholder}
                  onChangeText={setQuery}
                  placeholder={translations[language].search.placeholder}
                  placeholderTextColor="#9B9CA8"
                  style={styles.searchInput}
                  value={query}
                />
              </View>
              <View ref={addButtonRef} style={styles.addButtonPosition}>
                <IconButton
                  icon="add"
                  label={labels.add}
                  onPress={openTemplateMenu}
                  size="large"
                  tooltipPosition="bottom"
                  variant="neutral"
                />
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
          >
            {FILTERS.map((item) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === item }}
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filter,
                  filter === item && styles.filterSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === item && styles.filterTextSelected,
                  ]}
                >
                  {labels.filters[item]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {editor ? (
            <MilestoneEditorCard
              initial={editingMilestone}
              key={`${editor.milestoneId ?? 'new'}-${editor.template}`}
              labels={labels}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
              template={editor.template}
            />
          ) : null}

          {visible.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons color="#8176C7" name="hourglass-outline" size={28} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'archived'
                  ? labels.emptyArchived
                  : labels.emptyTitle}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visible.map(({ milestone, occurrence }) => (
                <View
                  key={milestone.id}
                  style={[
                    styles.gridItem,
                    {
                      width:
                        columns === 3
                          ? '33.333%'
                          : columns === 2
                            ? '50%'
                            : '100%',
                    },
                  ]}
                >
                  <MilestoneCard
                    labels={labels}
                    language={language}
                    milestone={milestone}
                    occurrence={occurrence}
                    onOpenMenu={openActionMenu}
                    onSelect={setSelectedId}
                    onTogglePin={(id, pinned) =>
                      updateMilestone(id, { pinned })
                    }
                    selected={selectedId === milestone.id}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {templateMenu ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={255}
          onClose={() => setTemplateMenu(null)}
          position={templateMenu}
          width={230}
        >
          {TEMPLATES.map((template) => (
            <MenuItem
              icon={
                <Ionicons
                  color="#555667"
                  name={
                    template === 'anniversary'
                      ? 'heart-outline'
                      : template === 'countdown'
                        ? 'hourglass-outline'
                        : template === 'birthday'
                          ? 'gift-outline'
                          : template === 'holiday'
                            ? 'balloon-outline'
                            : 'sparkles-outline'
                  }
                  size={18}
                />
              }
              key={template}
              label={labels.templates[template]}
              onPress={() => selectTemplate(template)}
            />
          ))}
        </MenuSurface>
      ) : null}

      {actionMenu ? (
        <MilestoneActionMenu
          milestoneId={actionMenu.milestoneId}
          onClose={() => setActionMenu(null)}
          onEdit={() => {
            const milestone = allMilestones.find(
              (item) => item.id === actionMenu.milestoneId,
            );
            if (milestone) {
              setEditor({
                milestoneId: milestone.id,
                template: milestone.type,
              });
            }
          }}
          onNotify={notify}
          position={actionMenu.position}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F5FA',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 1120,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  contentCompact: {
    paddingTop: 70,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingTop: 16,
  },
  headerCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  title: {
    color: '#262738',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  count: {
    color: '#9A9BA7',
    fontSize: 10,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerActionsCompact: {
    paddingRight: 0,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#F3F2F6',
    borderRadius: 11,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 11,
    width: 190,
  },
  searchCompact: {
    flex: 1,
    width: undefined,
  },
  searchInput: {
    color: '#393A4C',
    flex: 1,
    fontSize: 12,
    marginLeft: 7,
    paddingVertical: 7,
  },
  addButtonPosition: {
    marginLeft: 8,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  filters: {
    flexGrow: 0,
    height: 40,
    marginBottom: 15,
  },
  filter: {
    borderRadius: 10,
    marginRight: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterSelected: {
    backgroundColor: '#ECE9FF',
  },
  filterText: {
    color: '#858694',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#6759E8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    padding: 6,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 330,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  emptyTitle: {
    color: '#555667',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 13,
  },
});

export default MilestonesScreen;
