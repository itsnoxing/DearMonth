const { widget } = figma;
const { AutoLayout, Text, Input, useSyncedState, useSyncedMap } = widget;

const PALETTE = {
  bg: "#FAFAFA",
  card: "#FFFFFF",
  accent: "#000000",
  black: "#000000",
  white: "#FFFFFF",
  muted: "#8A8A8E",
  line: "#E5E5EA",
  important: "#FF3B30",
  holidayText: "#FF3B30",
  inputBg: "#F4F4F4", // 버튼 및 입력 필드 배경색
};

const BASE_SIZE_RATIO = 0.5;
const FIXED_LEGAL_HOLIDAYS = new Set([
  "01-01", // 신정
  "03-01", // 삼일절
  "05-05", // 어린이날
  "06-06", // 현충일
  "08-15", // 광복절
  "10-03", // 개천절
  "10-09", // 한글날
  "12-25", // 성탄절
]);

function formatMmDd(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getHolidaySetForYear(year: number) {
  const holidays = new Set<string>(FIXED_LEGAL_HOLIDAYS);

  for (const mmdd of FIXED_LEGAL_HOLIDAYS) {
    const [monthStr, dayStr] = mmdd.split("-");
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    const holidayDate = new Date(year, month, day);
    const dayOfWeek = holidayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      continue;
    }

    const substitute = new Date(holidayDate);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (substitute.getDay() === 0 || substitute.getDay() === 6 || holidays.has(formatMmDd(substitute)));

    holidays.add(formatMmDd(substitute));
  }

  return holidays;
}

function DearMonthWidget() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [monthlyGoal, setMonthlyGoal] = useSyncedState("monthlyGoal", "");
  const memos = useSyncedMap<string>("memos");
  // State for highlighted dates (Map of dateKey -> colorHex)
  const importantColorsMap = useSyncedMap<string>("importantColors");
  const [selectedDateKey, setSelectedDateKey] = useSyncedState("selectedDateKey", "");
  const [viewYear, setViewYear] = useSyncedState("viewYear", currentYear);
  const [viewMonth, setViewMonth] = useSyncedState("viewMonth", currentMonth);
  const calendarScale = 1;

  const changeMonthBy = (delta: number) => {
    const nextDate = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(nextDate.getFullYear());
    setViewMonth(nextDate.getMonth());
    setSelectedDateKey("");
  };

  const s = (value: number) => Math.round(value * calendarScale * BASE_SIZE_RATIO);

  const startDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const yearText = String(viewYear);
  const monthText = String(viewMonth + 1).padStart(2, "0");
  const legalHolidaySet = getHolidaySetForYear(viewYear);

  const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
  const cells: (number | null)[] = [];

  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }
  const tail = cells.length % 7;
  if (tail !== 0) {
    for (let i = 0; i < 7 - tail; i++) {
      cells.push(null);
    }
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const makeDateKey = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const formatMemoPreviewLines = (text: string) => {
    const compact = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u2028|\u2029/g, "\n").trim();
    if (!compact) {
      return [] as string[];
    }

    const explicitLines = compact
      .split(/(?:\r\n|\r|\n|\u2028|\u2029)/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 0);

    if (explicitLines.length === 1) {
      const singleLine = explicitLines[0];
      const totalLimit = 24;
      return [singleLine.length > totalLimit ? `${singleLine.slice(0, totalLimit - 1)}…` : singleLine];
    }

    const previewLines = explicitLines.slice(0, 3);
    if (explicitLines.length > 3 && previewLines.length === 3 && !previewLines[2].endsWith("…")) {
      previewLines[2] = `${previewLines[2]}…`;
    }
    return previewLines;
  };

  const selectedMemo = selectedDateKey ? memos.get(selectedDateKey) ?? "" : "";

  const setMemoForSelected = (text: string) => {
    if (!selectedDateKey) {
      return;
    }
    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\u2028|\u2029/g, "\n");
    memos.set(selectedDateKey, normalized);
  };

  const toggleImportantColor = (dateKey: string, color: string) => {
    if (!dateKey) {
      return;
    }
    const currentColor = importantColorsMap.get(dateKey);
    // If clicking the same color, remove it (toggle off)
    if (currentColor === color) {
      importantColorsMap.delete(dateKey);
    } else {
      // Otherwise, set/change the color
      importantColorsMap.set(dateKey, color);
    }
  };

  return (
    <AutoLayout direction="vertical" spacing={20} horizontalAlignItems="center">
      <AutoLayout
        direction="vertical"
        width={s(1600)}
        padding={s(28)}
        spacing={s(18)}
        fill={PALETTE.bg}
        cornerRadius={s(20)}
        stroke={PALETTE.black}
        strokeWidth={4}
      >
        <AutoLayout
          width="fill-parent"
          padding={{ top: s(12), bottom: s(10), left: s(18), right: s(18) }}
          fill={PALETTE.bg}
          verticalAlignItems="center"
          spacing={s(16)}
        >
          <AutoLayout direction="vertical" width="fill-parent" spacing={s(8)}>
            <AutoLayout direction="horizontal" width="fill-parent" padding={{ left: s(16), right: s(16), top: s(4), bottom: s(14) }} verticalAlignItems="center">

              {/* Year container (Left) */}
              <AutoLayout width="fill-parent" horizontalAlignItems="start" verticalAlignItems="center">
                <Text fontSize={Math.round(s(48))} fontWeight="bold" fill={PALETTE.muted}>
                  {viewYear}
                </Text>
              </AutoLayout>

              {/* Month controls container (Center) */}
              <AutoLayout width="fill-parent" horizontalAlignItems="center" verticalAlignItems="center" spacing={s(16)}>
                <Text
                  fontSize={Math.round(s(48))}
                  fontWeight="bold"
                  fill={PALETTE.black}
                  onClick={() => {
                    let m = viewMonth - 1;
                    let y = viewYear;
                    if (m < 0) {
                      m = 11;
                      y -= 1;
                    }
                    setViewMonth(m);
                    setViewYear(y);
                  }}
                >
                  {"<"}
                </Text>
                <Text fontSize={Math.round(s(80))} fontWeight="bold" fill={PALETTE.black}>
                  {String(viewMonth + 1).padStart(2, "0")}
                </Text>
                <Text
                  fontSize={Math.round(s(48))}
                  fontWeight="bold"
                  fill={PALETTE.black}
                  onClick={() => {
                    let m = viewMonth + 1;
                    let y = viewYear;
                    if (m > 11) {
                      m = 0;
                      y += 1;
                    }
                    setViewMonth(m);
                    setViewYear(y);
                  }}
                >
                  {">"}
                </Text>
              </AutoLayout>

              {/* Today Button container (Right) */}
              <AutoLayout width="fill-parent" horizontalAlignItems="end" verticalAlignItems="center">
                <AutoLayout
                  padding={{ left: s(12), right: s(12), top: s(8), bottom: s(8) }}
                  cornerRadius={s(8)}
                  fill={PALETTE.inputBg}
                  onClick={() => {
                    const now = new Date();
                    const todayYear = now.getFullYear();
                    const todayMonth = now.getMonth();
                    const todayDate = now.getDate();

                    setViewYear(todayYear);
                    setViewMonth(todayMonth);

                    const todayKey = `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-${String(todayDate).padStart(2, "0")}`;
                    setSelectedDateKey(todayKey);
                  }}
                  hoverStyle={{ fill: "#E0E0E0" }}
                >
                  <Text fontSize={Math.round(s(24))} fontWeight="bold" fill={PALETTE.muted}>
                    오늘 날짜
                  </Text>
                </AutoLayout>
              </AutoLayout>

            </AutoLayout>

            <AutoLayout direction="vertical" width="fill-parent" spacing={s(4)}>
              <AutoLayout
                direction="horizontal"
                width="fill-parent"
                minHeight={s(124)}
                spacing={s(14)}
                verticalAlignItems="center"
                fill="#FFFFFFD9"
                stroke="#00000014"
                strokeWidth={1}
                cornerRadius={s(18)}
                padding={{ top: s(14), bottom: s(14), left: s(14), right: s(14) }}
              >
                <AutoLayout
                  verticalAlignItems="center"
                  padding={{ top: s(8), bottom: s(8), left: s(14), right: s(14) }}
                  fill="#0000000A"
                  cornerRadius={s(12)}
                >
                  <Text fontSize={s(28)} fontWeight="bold" fill={PALETTE.black}>
                    월간 목표
                  </Text>
                </AutoLayout>
                <Input
                  value={monthlyGoal}
                  placeholder="Shift+Enter: 줄바꿈"
                  onTextEditEnd={(e) => setMonthlyGoal(e.characters)}
                  width="fill-parent"
                  fontSize={s(34)}
                  fontWeight="bold"
                  fill={PALETTE.black}
                  inputFrameProps={{
                    fill: "#F8F8F8",
                    cornerRadius: s(12),
                    padding: { top: s(10), bottom: s(10), left: s(12), right: s(12) },
                  }}
                />
              </AutoLayout>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>

        <AutoLayout direction="horizontal" width="fill-parent" spacing={s(8)} padding={{ left: s(8), right: s(8), top: s(2), bottom: s(2) }}>
          {daysOfWeek.map((day) => (
            <AutoLayout key={day} width="fill-parent" horizontalAlignItems="center">
              <Text fontSize={s(29)} fontWeight="bold" fill={day === "일" ? PALETTE.holidayText : PALETTE.muted}>
                {day}
              </Text>
            </AutoLayout>
          ))}
        </AutoLayout>

        <AutoLayout direction="vertical" width="fill-parent" spacing={s(8)}>
          {weeks.map((week, weekIndex) => (
            <AutoLayout key={`week-${weekIndex}`} direction="horizontal" width="fill-parent" spacing={s(8)}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <AutoLayout
                      key={`blank-${weekIndex}-${dayIndex}`}
                      width="fill-parent"
                      height={s(154)}
                      fill="#EFEFEF"
                      cornerRadius={s(18)}
                    />
                  );
                }

                const dateKey = makeDateKey(day);
                const assignedColor = importantColorsMap.get(dateKey);
                const isImportant = assignedColor !== undefined;
                const isSelected = selectedDateKey === dateKey;
                const mmdd = `${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isLegalHoliday = legalHolidaySet.has(mmdd);
                const isRedText = isLegalHoliday || dayIndex === 0;

                const memoPreviewLines = formatMemoPreviewLines(memos.get(dateKey) ?? "");
                const useBullets = memoPreviewLines.length > 1;

                return (
                  <AutoLayout
                    key={dateKey}
                    width="fill-parent"
                    height={s(154)}
                    padding={{ top: s(8), bottom: s(8), left: s(10), right: s(10) }}
                    direction="vertical"
                    spacing={s(2)}
                    fill={isImportant ? assignedColor : isSelected ? "#F0F0F0" : PALETTE.card}
                    cornerRadius={s(18)}
                    stroke={isSelected ? PALETTE.black : isImportant ? "#0000001F" : "#0000001F"}
                    strokeWidth={isSelected ? 2 : 1}
                    onClick={() => setSelectedDateKey(dateKey)}
                    hoverStyle={{ fill: isImportant ? assignedColor : "#F4F4F4", opacity: isImportant ? 0.9 : 1 }}
                  >
                    <AutoLayout width="fill-parent" direction="horizontal" verticalAlignItems="start">
                      <Text width="fill-parent" fontSize={Math.round(s(32))} fontWeight="bold" fill={isImportant ? PALETTE.white : isRedText ? PALETTE.holidayText : PALETTE.black}>
                        {String(day).padStart(2, "0")}
                      </Text>
                    </AutoLayout>
                    <AutoLayout direction="vertical" width="fill-parent" spacing={s(1)}>
                      {memoPreviewLines.map((line, index) => (
                        useBullets ? (
                          <AutoLayout
                            key={`${dateKey}-memo-${index}`}
                            direction="horizontal"
                            width="fill-parent"
                            spacing={s(4)}
                            verticalAlignItems="center"
                          >
                            <AutoLayout width={s(10)} horizontalAlignItems="center">
                              <AutoLayout
                                width={s(5)}
                                height={s(5)}
                                cornerRadius={999}
                                fill={isImportant ? PALETTE.white : isRedText ? PALETTE.holidayText : PALETTE.muted}
                              />
                            </AutoLayout>
                            <Text
                              width="fill-parent"
                              fontSize={Math.round(s(24))}
                              fontWeight="bold"
                              fill={isImportant ? PALETTE.white : isRedText ? PALETTE.holidayText : PALETTE.muted}
                            >
                              {line}
                            </Text>
                          </AutoLayout>
                        ) : (
                          <Text
                            key={`${dateKey}-memo-${index}`}
                            width="fill-parent"
                            fontSize={Math.round(s(24))}
                            fontWeight="bold"
                            fill={isImportant ? PALETTE.white : isRedText ? PALETTE.holidayText : PALETTE.muted}
                          >
                            {line}
                          </Text>
                        )
                      ))}
                    </AutoLayout>
                  </AutoLayout>
                );
              })}
            </AutoLayout>
          ))}
        </AutoLayout>

        <AutoLayout
          direction="horizontal"
          width="fill-parent"
          padding={s(14)}
          spacing={s(10)}
          verticalAlignItems="center"
          fill={PALETTE.card}
          cornerRadius={s(18)}
          stroke="#0000001F"
          strokeWidth={1}
        >
          <AutoLayout width={s(220)} horizontalAlignItems="center">
            <Text fontSize={Math.round(s(18) * 1.5)} fontWeight="bold" fill={PALETTE.black}>
              {selectedDateKey ? selectedDateKey.replace(/^\d{4}-/, "") : ""}
            </Text>
          </AutoLayout>

          <Input
            value={selectedMemo}
            placeholder={selectedDateKey ? "선택한 날짜 메모 입력" : "먼저 날짜를 선택"}
            onTextEditEnd={(e) => setMemoForSelected(e.characters)}
            inputBehavior="wrap"
            width="fill-parent"
            fontSize={Math.round(s(18) * 1.5)}
            fill={PALETTE.black}
            inputFrameProps={{
              fill: "#F5F5F5",
              cornerRadius: s(10),
              padding: { top: s(8), bottom: s(8), left: s(10), right: s(10) },
            }}
          />
          <AutoLayout direction="horizontal" spacing={s(8)}>
            {/* Red Color Chip */}
            <AutoLayout
              width={s(44)}
              height={s(44)}
              cornerRadius={999}
              fill="#FF3B30"
              onClick={() => toggleImportantColor(selectedDateKey, "#FF3B30")}
              hoverStyle={{ opacity: 0.8 }}
            />
            {/* Blue Color Chip */}
            <AutoLayout
              width={s(44)}
              height={s(44)}
              cornerRadius={999}
              fill="#007AFF"
              onClick={() => toggleImportantColor(selectedDateKey, "#007AFF")}
              hoverStyle={{ opacity: 0.8 }}
            />
            {/* Yellow Color Chip */}
            <AutoLayout
              width={s(44)}
              height={s(44)}
              cornerRadius={999}
              fill="#FFCC00"
              onClick={() => toggleImportantColor(selectedDateKey, "#FFCC00")}
              hoverStyle={{ opacity: 0.8 }}
            />
          </AutoLayout>
        </AutoLayout>
      </AutoLayout>

    </AutoLayout>
  );
}

widget.register(DearMonthWidget);
