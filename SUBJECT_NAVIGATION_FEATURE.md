# Subject Card Navigation Feature

## Overview
This feature enables users to navigate directly from subject cards on the Home Dashboard to the filtered Documents page with the corresponding course automatically selected.

## How It Works

### 1. Subject-to-Course Mapping
A mapping object in `docs.js` links subject names to course IDs:

```javascript
const SUBJECT_TO_COURSE_MAP = {
    'Pháp luật đại cương': 10,
    'Tâm lý học Đại cương': 11,
    'Toán rời rạc': 2,
    'Giải tích 1': 1,
    // ... more mappings
};
```

### 2. Navigation Flow

#### Step 1: User Clicks Subject Card
- User clicks on a course card (e.g., "Pháp luật đại cương")
- HTML onclick handler: `DocumentManager.navigateFromSubjectCard('Pháp luật đại cương')`

#### Step 2: Store Filter Intent
```javascript
navigateFromSubjectCard(subjectName) {
    const courseId = SUBJECT_TO_COURSE_MAP[subjectName];
    localStorage.setItem('pendingCourseFilter', courseId.toString());
    // Navigate to documents page...
}
```

#### Step 3: Navigate to Documents Page
- The function triggers a click on the "Kho tài liệu" menu item
- `PageManager.showDocumentsPage()` is called

#### Step 4: Apply Filter Automatically
```javascript
showDocumentsPage(menuItem) {
    // ... show documents section
    DocumentManager.loadAllDocuments();
    DocumentManager.applyPendingFilter(); // ✅ Check for pending filter
}
```

#### Step 5: Filter Documents
```javascript
applyPendingFilter() {
    const pendingFilter = localStorage.getItem('pendingCourseFilter');
    if (pendingFilter) {
        localStorage.removeItem('pendingCourseFilter'); // Clean up
        setTimeout(() => {
            this.filterDocsByCourse(pendingFilter);
            // Scroll to documents section
        }, 100);
    }
}
```

## User Experience

### Before Navigation
- User is on Home Dashboard
- Sees subject cards: "PHÁP LUẬT ĐẠI CƯƠNG", "TÂM LÝ HỌC ĐẠI CƯƠNG", etc.

### During Navigation
- User clicks a subject card
- Console logs: `📚 Navigating from subject: Pháp luật đại cương`
- Console logs: `💾 Stored pending filter: 10`

### After Navigation
- Documents page opens
- Filter button for the subject is automatically activated
- Document list shows only files for that subject
- Console logs: `✅ Applying pending filter: 10`

## Code Locations

| File | Changes | Purpose |
|------|---------|---------|
| `docs.js` | Added mapping object & functions | Core navigation logic |
| `index.html` | Added onclick handlers to course cards | Trigger navigation |
| `main.js` | Updated `showDocumentsPage()` | Apply filter on page load |
| `home.css` | Enhanced hover effects | Better UX feedback |

## Adding New Subjects

To add a new subject card with navigation:

1. **Add mapping in `docs.js`:**
```javascript
const SUBJECT_TO_COURSE_MAP = {
    // ...existing mappings
    'New Subject Name': 12, // Use the course ID from AppState.allCourses
};
```

2. **Add HTML course card with onclick:**
```html
<div class="course-card" 
     onclick="DocumentManager.navigateFromSubjectCard('New Subject Name')" 
     style="cursor: pointer;">
    <img src="./img/new-subject.png" class="course-thumb" alt="Course">
    <div class="course-content">
        <h3 class="course-title">NEW SUBJECT NAME</h3>
        <!-- ... -->
    </div>
</div>
```

## Technical Notes

- Uses `localStorage` for cross-page state management
- Clears pending filter immediately to prevent persistence on refresh
- 100ms delay ensures DOM is ready before applying filter
- Smooth scroll to documents section for better UX
- Fallback to 'all' filter if mapping not found

## Browser Compatibility
- ✅ Chrome/Edge (modern)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires localStorage support (all modern browsers)

## Future Enhancements
- [ ] Add URL query parameters as alternative to localStorage
- [ ] Add breadcrumb navigation showing path
- [ ] Add animation transition between pages
- [ ] Support for multi-subject filtering
