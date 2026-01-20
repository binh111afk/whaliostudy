# Testing Guide: Subject Card Navigation

## Quick Test Steps

### 1. Start the Server
```bash
node server.js
```
Navigate to: `http://localhost:3000`

### 2. Test Basic Navigation

#### Test Case 1: Navigate to "Pháp luật đại cương"
1. Go to Home Dashboard (Trang chủ)
2. Locate the "PHÁP LUẬT ĐẠI CƯƠNG" course card
3. Click on the card
4. **Expected Result:**
   - Documents page opens
   - "PLDC" filter button is automatically selected
   - Document list shows only PLDC-related files
   - Console shows: `📚 Navigating from subject: Pháp luật đại cương`

#### Test Case 2: Navigate to "Tâm lý học Đại cương"
1. Return to Home Dashboard
2. Click on "TÂM LÝ HỌC ĐẠI CƯƠNG" card
3. **Expected Result:**
   - Documents page opens with TLHDC filter active
   - Console shows filter application logs

#### Test Case 3: Navigate to "Toán rời rạc"
1. Return to Home Dashboard
2. Click on "TOÁN RỜI RẠC" card
3. **Expected Result:**
   - Documents page opens with TRR filter active

### 3. Test Edge Cases

#### Test Case 4: Manual Navigation After Auto-Filter
1. Click a subject card to navigate
2. Wait for filter to apply
3. Manually click a different filter button
4. **Expected Result:**
   - New filter applies correctly
   - No interference from previous auto-filter

#### Test Case 5: Refresh After Navigation
1. Click a subject card
2. Wait for Documents page to load with filter
3. Press F5 to refresh the page
4. **Expected Result:**
   - Page refreshes normally
   - Filter resets (no pending filter persists)
   - Shows all documents or default filter

#### Test Case 6: Direct Menu Navigation
1. Click "Kho tài liệu" in sidebar (without clicking subject card)
2. **Expected Result:**
   - Documents page opens normally
   - No auto-filter is applied
   - Shows all documents by default

### 4. Visual Feedback Tests

#### Test Case 7: Hover Effects
1. Hover over a course card
2. **Expected Result:**
   - Card lifts up (translateY)
   - Shadow becomes more prominent
   - Arrow (→) appears and slides in from right
   - Gradient overlay appears

#### Test Case 8: Click Feedback
1. Click and hold on a course card
2. **Expected Result:**
   - Card shows active state (slight compression)
   - Immediate visual feedback

### 5. Console Verification

Open browser DevTools (F12) and watch console for:

```
📚 Navigating from subject: [Subject Name]
💾 Stored pending filter: [Course ID]
📥 Loading documents...
✅ Applying pending filter: [Course ID]
✅ Documents loaded: [count] total
```

### 6. localStorage Inspection

Open DevTools → Application → Local Storage → localhost:3000

**Before clicking subject card:**
- No `pendingCourseFilter` key

**During navigation (briefly):**
- `pendingCourseFilter`: "10" (or relevant course ID)

**After filter applied:**
- `pendingCourseFilter` key removed automatically

## Expected Behavior Summary

| Action | Expected Outcome |
|--------|-----------------|
| Click "PHÁP LUẬT ĐẠI CƯƠNG" | Navigate to Docs → Filter: PLDC |
| Click "TÂM LÝ HỌC ĐẠI CƯƠNG" | Navigate to Docs → Filter: TLHDC |
| Click "TOÁN RỜI RẠC" | Navigate to Docs → Filter: TRR |
| Hover over card | Show arrow, lift animation |
| Refresh after navigation | No filter persists |

## Troubleshooting

### Issue: Filter not applying
**Check:**
- Console for error messages
- Subject name matches exactly in mapping
- Course ID exists in `AppState.allCourses`

### Issue: Navigation not working
**Check:**
- `DocumentManager` is available globally (`window.DocumentManager`)
- Onclick handler syntax is correct in HTML
- No JavaScript errors in console

### Issue: Multiple navigations interfere
**Check:**
- `localStorage.removeItem('pendingCourseFilter')` is called
- No race conditions in async operations

## Performance Notes

- Navigation should complete within 300-500ms
- Filter application happens after DOM load (100ms delay)
- No noticeable lag or flicker

## Browser Testing Checklist

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Success Criteria

✅ All 8 test cases pass
✅ No console errors
✅ Smooth visual transitions
✅ Filter correctly applied
✅ localStorage properly managed
