import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  calendarDateLabel,
  calendarMonthCells,
  calendarMonthLabel,
  calendarWeekdayNames,
  calendarWeekdays,
  localDateKey,
} from "@/lib/planner/calendar";
import { palette, RoundAction, Surface } from "./PlannerUI";

type CalendarMonthProps = {
  month: Date;
  todayKey: string;
  selectedDateKey: string;
  eventDateKeys: ReadonlySet<string>;
  onMonthChange: (offset: number) => void;
  onSelectDate: (dateKey: string) => void;
};

export function CalendarMonth({
  month,
  todayKey,
  selectedDateKey,
  eventDateKeys,
  onMonthChange,
  onSelectDate,
}: CalendarMonthProps) {
  const cells = calendarMonthCells(month.getFullYear(), month.getMonth());
  const currentMonth = new Date(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)) - 1, 1);
  const previousMonthDisabled = month.getTime() <= currentMonth.getTime();

  return (
    <Surface style={styles.card} accessibilityLabel={`${calendarMonthLabel(month)} aylık plan takvimi`}>
      <View style={styles.monthHeader}>
        <RoundAction
          label="Önceki ay"
          onPress={() => onMonthChange(-1)}
          disabled={previousMonthDisabled}
          size={44}
        >
          ‹
        </RoundAction>
        <View style={styles.monthTitleWrap}>
          <Text accessibilityRole="header" style={styles.monthTitle}>{calendarMonthLabel(month)}</Text>
          <Text style={styles.monthHint}>Plan görmek için bir gün seç</Text>
        </View>
        <RoundAction label="Sonraki ay" onPress={() => onMonthChange(1)} size={44}>
          ›
        </RoundAction>
      </View>

      <View style={styles.grid}>
        {calendarWeekdays.map((weekday, index) => (
          <View key={weekday} style={styles.weekdayCell}>
            <Text style={styles.weekday} accessibilityLabel={calendarWeekdayNames[index] ?? weekday}>{weekday}</Text>
          </View>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day, 12);
          const key = localDateKey(date);
          const selected = key === selectedDateKey;
          const today = key === todayKey;
          const disabled = key < todayKey;
          const hasEvent = eventDateKeys.has(key);
          return (
            <View key={key} style={styles.dayCell}>
              <Pressable
                onPress={() => onSelectDate(key)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${calendarDateLabel(key)}${hasEvent ? ", plan var" : ""}`}
                accessibilityState={{ selected, disabled }}
                style={({ pressed }) => [
                  styles.dayButton,
                  today && styles.todayButton,
                  selected && styles.selectedButton,
                  pressed && !disabled && styles.pressed,
                  disabled && styles.disabledButton,
                ]}
              >
                <Text style={[styles.dayText, today && styles.todayText, selected && styles.selectedText, disabled && styles.disabledText]}>
                  {day}
                </Text>
                <View style={[styles.eventDot, hasEvent && styles.eventDotVisible, selected && hasEvent && styles.eventDotSelected]} />
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>Bu günde plan var</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 13 },
  monthTitleWrap: { flex: 1, alignItems: "center" },
  monthTitle: { color: palette.ink, fontSize: 18, lineHeight: 23, fontWeight: "800", textTransform: "capitalize" },
  monthHint: { color: palette.muted, fontSize: 11, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekdayCell: { width: `${100 / 7}%`, minHeight: 31, alignItems: "center", justifyContent: "center" },
  weekday: { color: palette.muted, fontSize: 11, fontWeight: "800" },
  dayCell: { width: `${100 / 7}%`, minHeight: 46, padding: 1, alignItems: "center", justifyContent: "center" },
  dayButton: { width: "100%", minHeight: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  todayButton: { borderColor: "#B7C7B8" },
  selectedButton: { backgroundColor: palette.pine, borderColor: palette.pine },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  disabledButton: { opacity: 0.48 },
  dayText: { color: palette.ink, fontSize: 13, fontWeight: "600" },
  todayText: { color: palette.pine, fontWeight: "800" },
  selectedText: { color: palette.white },
  disabledText: { color: palette.muted },
  eventDot: { position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  eventDotVisible: { backgroundColor: palette.coral },
  eventDotSelected: { backgroundColor: "#FFFDF7" },
  legend: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-end", marginTop: 8, marginRight: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.coral },
  legendText: { color: palette.muted, fontSize: 10 },
});
