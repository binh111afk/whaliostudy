# 📊 Excel Import Feature - Implementation Guide

## ✅ Implementation Complete

The "Import Timetable from Excel" feature has been fully implemented for HCMUE university timetable format.

---

## 📁 Files Modified

### 1. **index.html**
- ✅ Added "Import File" button (green) next to "Add Class" button in timetable header
- ✅ Added complete `importTimetableModal` at the end of the file with:
  - File input (accepts `.xlsx`, `.xls`)
  - Preview area showing detected class count
  - Error display area
  - Cancel and Save buttons

### 2. **js/timetable.js**
- ✅ Added `importedData` array to store temporary import data
- ✅ Implemented complete import functionality with 8 new functions

---

## 🎯 Key Features

### **Excel Format Support**
The system expects HCMUE timetable Excel files with this column structure:
- **Column 0**: STT (Index number)
- **Column 1**: Subject Code & Name (e.g., "2521COMP182702- Xác suất thống kê")
- **Column 5**: Day (e.g., "Thứ Hai", "Thứ Ba", "Chủ Nhật")
- **Column 6**: Period (e.g., "10 (15h10) -> 12 (17h40)")
- **Column 7**: Room (e.g., "B.316")

### **Smart Parsing**
1. **Merged Cell Handling**: When subject cell is empty but period exists, uses previous subject
2. **Day Parsing**: Converts Vietnamese day names to codes (2-7, CN)
3. **Period Extraction**: Regex-based extraction of start period and calculation of duration
4. **Session Detection**: Automatically determines morning/afternoon/evening based on start period
5. **Time Range Calculation**: Maps periods to actual times using `periodTimes` object

---

## 🔧 Functions Implemented

| Function | Purpose |
|----------|---------|
| `openImportModal()` | Opens the import modal and resets state |
| `closeImportModal()` | Closes modal and clears imported data |
| `handleFileSelect(event)` | Reads Excel file using XLSX library |
| `processExcelData(rows)` | Main parser - iterates through rows and extracts classes |
| `parseDayString(dayStr)` | Converts "Thứ Hai" → "2", "Chủ Nhật" → "CN" |
| `parsePeriodString(periodStr)` | Extracts start period and calculates duration |
| `showPreview(count)` | Shows success preview with class count |
| `showError(message)` | Displays error message to user |
| `confirmImport()` | Sends all imported classes to server via API |

---

## 🎨 UI Elements

### Import Button
```html
<button class="btn-add-class" style="background: #10b981;" 
        onclick="Timetable.openImportModal()">
    📤 Nhập File
</button>
```

### Modal Structure
- **Header**: Title and description
- **File Input**: Excel file selector
- **Preview Area**: Green success box with class count
- **Error Area**: Red error box with error message
- **Footer**: Cancel and Save buttons

---

## 📋 Usage Flow

1. **User clicks "Nhập File" button** → Modal opens
2. **User selects Excel file** → `handleFileSelect()` reads file
3. **XLSX parses file** → Data converted to JSON array
4. **`processExcelData()` runs** → Iterates through rows:
   - Skips headers (first 3 rows)
   - Handles merged cells
   - Parses day, period, room
   - Calculates session and time range
   - Stores in `importedData` array
5. **Preview shown** → "Đã phát hiện X lớp học trong file"
6. **User clicks "Lưu vào TKB"** → `confirmImport()` sends to server
7. **Server processes** → All classes added via `/api/timetable` endpoint
8. **Timetable reloads** → Success message shown

---

## 🧪 Example Data Processing

### Input (Excel Row)
```
| STT | Subject                        | ... | Day       | Period              | Room  |
|-----|--------------------------------|-----|-----------|---------------------|-------|
| 1   | 2521COMP182702- Xác suất TK    | ... | Thứ Hai   | 10 (15h10) -> 12    | B.316 |
```

### Output (Parsed Object)
```javascript
{
    subject: "Xác suất TK",
    room: "B.316",
    campus: "CS1",
    day: "2",
    session: "afternoon",
    startPeriod: 10,
    numPeriods: 3,
    timeRange: "15:10 - 17:40"
}
```

---

## 🔍 Day Mapping

| Vietnamese | Code |
|------------|------|
| Thứ Hai / T2 | "2" |
| Thứ Ba / T3 | "3" |
| Thứ Tư / T4 | "4" |
| Thứ Năm / T5 | "5" |
| Thứ Sáu / T6 | "6" |
| Thứ Bảy / T7 | "7" |
| Chủ Nhật / CN | "CN" |

---

## ⚙️ Session Rules

- **Morning**: startPeriod ≤ 6
- **Afternoon**: 6 < startPeriod ≤ 12
- **Evening**: startPeriod > 12

---

## 🐛 Error Handling

1. **File read error** → "Không thể đọc file. Vui lòng thử lại!"
2. **Invalid format** → "Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file!"
3. **No classes found** → "Không tìm thấy lớp học nào trong file!"
4. **Parse errors** → Individual rows skipped with console warning

---

## 🚀 Testing

### Test Steps:
1. Export HCMUE timetable PDF to Excel
2. Open timetable page
3. Click "Nhập File" button
4. Select the Excel file
5. Verify preview shows correct class count
6. Click "Lưu vào TKB"
7. Check timetable grid for imported classes

### Expected Result:
- All valid classes imported
- Classes appear in correct day/session cells
- Time ranges calculated correctly
- No duplicate entries

---

## 📝 Notes

- **Merged cells**: Excel often merges subject cells for multiple periods - handled automatically
- **Row skipping**: First 3 rows assumed to be headers
- **Default campus**: Set to "CS1" (can be modified)
- **Error tolerance**: Invalid rows skipped, valid ones processed
- **Batch import**: All classes sent to server in parallel using `Promise.all()`

---

## 🎉 Success!

The feature is now fully functional and ready to use. Users can import their entire semester timetable in seconds!
