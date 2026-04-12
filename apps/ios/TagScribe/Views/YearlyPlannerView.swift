import SwiftUI

extension Notification.Name {
    /// Posted after a saved list is updated (name / due date / priority) so Lists and Planner reload.
    static let tagScribeSavedListsDidChange = Notification.Name("tagScribeSavedListsDidChange")
}

/// Spec: monthly calendar after Add; items + lists with `dueDate` appear on that day; priority colors (high/medium/low).
struct YearlyPlannerView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var displayedMonthStart: Date = YearlyPlannerView.monthStart(containing: Date())
    @State private var items: [Item] = []
    @State private var lists: [SavedList] = []
    @State private var entriesByDay: [String: [PlannerEntry]] = [:]
    @State private var errorMessage: String?
    @State private var loading = true
    @State private var selectedDayToken: DaySheetToken?

    private let weekdaySymbols: [String] = {
        let f = DateFormatter()
        return f.shortWeekdaySymbols
    }()

    private var monthTitle: String {
        let f = DateFormatter()
        f.dateFormat = "LLLL yyyy"
        return f.string(from: displayedMonthStart)
    }

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack(spacing: 12) {
                    Text(err)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Text("Sign in to see your planner.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        monthHeader
                        weekdayHeader
                        monthGrid
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 24)
                }
            }
        }
        .navigationTitle("Planner")
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await load() }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .tagScribeSavedListsDidChange)) { _ in
            Task { await load() }
        }
        .sheet(item: $selectedDayToken) { token in
            DayEntriesSheet(dayISO: token.iso, entries: token.entries)
        }
    }

    private var monthHeader: some View {
        HStack {
            Button {
                shiftMonth(-1)
            } label: {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.title2)
                    .accessibilityLabel("Previous month")
            }
            Spacer()
            Text(monthTitle)
                .font(.title2.weight(.semibold))
            Spacer()
            Button {
                shiftMonth(1)
            } label: {
                Image(systemName: "chevron.right.circle.fill")
                    .font(.title2)
                    .accessibilityLabel("Next month")
            }
        }
        .padding(.top, 8)
    }

    private var weekdayHeader: some View {
        let cal = Calendar.current
        let ordered = (0 ..< 7).map { i -> String in
            let idx = (cal.firstWeekday - 1 + i) % 7
            return weekdaySymbols[idx]
        }
        return HStack(spacing: 0) {
            ForEach(Array(ordered.enumerated()), id: \.offset) { _, sym in
                Text(sym)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var monthGrid: some View {
        let cells = daysForMonthGrid()
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
        return LazyVGrid(columns: columns, spacing: 6) {
            ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
                if let date = cell {
                    dayCell(for: date)
                } else {
                    Color.clear
                        .frame(minHeight: 56)
                }
            }
        }
    }

    private func dayCell(for date: Date) -> some View {
        let iso = ItemScheduleFormat.isoString(from: date)
        let dayEntries = entriesByDay[iso] ?? []
        let cal = Calendar.current
        let dayNum = cal.component(.day, from: date)
        let isToday = cal.isDateInToday(date)

        return Button {
            if !dayEntries.isEmpty {
                selectedDayToken = DaySheetToken(iso: iso, entries: dayEntries)
            }
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text("\(dayNum)")
                    .font(.caption.weight(isToday ? .bold : .regular))
                    .foregroundStyle(isToday ? Color.accentColor : Color.primary)
                    .frame(maxWidth: .infinity, alignment: .topTrailing)
                    .padding(.trailing, 2)
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 2) {
                    ForEach(dayEntries.prefix(3)) { entry in
                        Text(entry.title)
                            .font(.caption2)
                            .lineLimit(1)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(PlannerPalette.background(for: entry.priority))
                            .clipShape(RoundedRectangle(cornerRadius: 3, style: .continuous))
                    }
                    if dayEntries.count > 3 {
                        Text("+\(dayEntries.count - 3) more")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 2)
                .padding(.bottom, 4)
            }
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(isToday ? Color.accentColor.opacity(0.6) : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .disabled(dayEntries.isEmpty)
    }

    private func shiftMonth(_ delta: Int) {
        let cal = Calendar.current
        if let next = cal.date(byAdding: .month, value: delta, to: displayedMonthStart) {
            displayedMonthStart = YearlyPlannerView.monthStart(containing: next)
        }
    }

    /// First moment of the month containing `date`.
    static func monthStart(containing date: Date) -> Date {
        let cal = Calendar.current
        let parts = cal.dateComponents([.year, .month], from: date)
        return cal.date(from: parts) ?? date
    }

    private func daysForMonthGrid() -> [Date?] {
        let cal = Calendar.current
        let start = displayedMonthStart
        guard let dayRange = cal.range(of: .day, in: .month, for: start) else { return [] }
        var cells: [Date?] = []
        let weekday = cal.component(.weekday, from: start)
        let leading = (weekday - cal.firstWeekday + 7) % 7
        for _ in 0 ..< leading {
            cells.append(nil)
        }
        for day in dayRange {
            if let date = cal.date(byAdding: .day, value: day - 1, to: start) {
                cells.append(date)
            }
        }
        while cells.count % 7 != 0 {
            cells.append(nil)
        }
        return cells
    }

    private func recomputeEntries() {
        var map: [String: [PlannerEntry]] = [:]
        for item in items {
            guard let d = item.dueDate?.trimmingCharacters(in: .whitespacesAndNewlines), !d.isEmpty else { continue }
            map[d, default: []].append(.fromItem(item))
        }
        for list in lists {
            guard let d = list.dueDate?.trimmingCharacters(in: .whitespacesAndNewlines), !d.isEmpty else { continue }
            map[d, default: []].append(.fromList(list))
        }
        for k in map.keys {
            map[k]?.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        }
        entriesByDay = map
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            async let itemsTask = APIClient.shared.getItems(archived: false)
            async let listsTask = APIClient.shared.getLists()
            items = try await itemsTask
            lists = try await listsTask
            recomputeEntries()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Day sheet

private struct DaySheetToken: Identifiable {
    var id: String { iso }
    let iso: String
    let entries: [PlannerEntry]
}

private struct DayEntriesSheet: View {
    @Environment(\.dismiss) private var dismiss
    let dayISO: String
    let entries: [PlannerEntry]

    private var title: String {
        ItemScheduleFormat.displayDueDate(fromIso: dayISO) ?? dayISO
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(entries) { entry in
                    HStack(alignment: .top, spacing: 10) {
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(PlannerPalette.background(for: entry.priority))
                            .frame(width: 6)
                            .padding(.vertical, 2)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.title)
                                .font(.body)
                            Text(entry.kindLabel)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let p = ItemScheduleFormat.displayPriority(entry.priority) {
                                Text("Priority: \(p)")
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Entries

struct PlannerEntry: Identifiable {
    enum Kind {
        case item(Item)
        case list(SavedList)
    }

    let id: String
    let title: String
    let priority: String?
    let kind: Kind

    var kindLabel: String {
        switch kind {
        case .item: return "Library item"
        case .list: return "List"
        }
    }

    static func fromItem(_ item: Item) -> PlannerEntry {
        let title: String
        if let t = item.title?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty {
            title = t
        } else {
            title = String(item.content.prefix(56))
        }
        return PlannerEntry(id: "i:\(item.id)", title: title, priority: item.priority, kind: .item(item))
    }

    static func fromList(_ list: SavedList) -> PlannerEntry {
        PlannerEntry(id: "l:\(list.id)", title: list.name, priority: list.priority, kind: .list(list))
    }
}

private enum PlannerPalette {
    static func background(for priority: String?) -> Color {
        switch (priority ?? "").lowercased() {
        case "high":
            return Color(red: 0.75, green: 0.95, blue: 0.80)
        case "medium":
            return Color(red: 0.99, green: 0.96, blue: 0.75)
        case "low":
            return Color(red: 0.99, green: 0.86, blue: 0.90)
        default:
            return Color(.secondarySystemFill)
        }
    }
}

#Preview {
    NavigationStack { YearlyPlannerView() }
}
