# Cloudinary Integration Guide

## ✅ What Was Changed

All file uploads in the Whalio Student Dashboard now use **Cloudinary** cloud storage instead of local disk storage.

### Updated Routes:
1. **Document Uploads** (`/api/upload-document`) - PDF, Word, Excel, PowerPoint, etc.
2. **Avatar Uploads** (`/api/upload-avatar`) - User profile pictures
3. **Community Post Images** (`/api/posts`) - Images attached to posts
4. **Community Post Files** (`/api/posts`) - File attachments in posts
5. **Comment Attachments** (`/api/comments`) - Images and files in comments
6. **Reply Attachments** (`/api/reply-comment`) - Images and files in replies
7. **Document Deletion** (`/api/delete-document`) - Now deletes from Cloudinary

### Code Changes:
- Changed from `'/uploads/' + file.filename` to `file.path` (Cloudinary secure_url)
- Removed local file deletion logic (`fs.unlink`)
- Added Cloudinary deletion logic using `cloudinary.uploader.destroy()`
- All files stored in `whalio-documents` folder on Cloudinary

---

## 🌐 Render Deployment Checklist

### 1. Environment Variables (REQUIRED)
Add these to your Render dashboard:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/whalio
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Get Cloudinary Credentials
1. Sign up at https://cloudinary.com (free tier available)
2. Go to Dashboard
3. Copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Render Setup
1. Go to your Render dashboard
2. Select your web service
3. Go to **Environment** tab
4. Add all 4 environment variables above
5. Click **Save Changes**
6. Render will automatically redeploy

---

## 📂 File Storage Structure

### Cloudinary Folder:
- **Folder Name**: `whalio-documents`
- **Allowed Formats**: jpg, jpeg, png, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip, rar
- **Max File Size**: 50MB
- **Resource Type**: Auto-detect (images, raw files, videos)

### URL Format:
```
https://res.cloudinary.com/[cloud_name]/[type]/upload/[folder]/[filename].[ext]
```

Example:
```
https://res.cloudinary.com/whalio/raw/upload/whalio-documents/math-notes.pdf
```

---

## 🧪 Testing Checklist

### Test Document Upload:
1. Login to Whalio
2. Go to Documents tab
3. Upload a PDF or Word file
4. Check if it appears in the document list
5. Click to download/view the file

### Test Avatar Upload:
1. Click on profile
2. Upload a new avatar image
3. Check if it updates immediately
4. Refresh page to verify persistence

### Test Community Posts:
1. Go to Community tab
2. Create a post with images
3. Attach files to the post
4. Verify images display correctly
5. Test downloading attached files

### Test Deletion:
1. Upload a test document
2. Delete it
3. Check Cloudinary dashboard to verify it's removed
4. Verify it's removed from MongoDB

---

## 🔧 Troubleshooting

### Issue: "Cloudinary configured: ❌"
**Solution**: Check that all 3 Cloudinary environment variables are set in Render

### Issue: Files not uploading
**Solution**: 
- Check file size (must be < 50MB)
- Check file format (must be in allowed_formats list)
- Check Cloudinary dashboard for error logs

### Issue: Old uploads still in /uploads/ folder
**Solution**: 
- Old files are safe to delete
- Cloudinary is now handling all new uploads
- You can delete the entire `/uploads/` folder

### Issue: 404 on file access
**Solution**:
- Check MongoDB document.path field contains Cloudinary URL
- Verify Cloudinary URL is publicly accessible
- Check Cloudinary upload settings allow public access

---

## 📊 Cloudinary Dashboard

Monitor your uploads at:
https://console.cloudinary.com/console/media_library

You can:
- View all uploaded files
- See storage usage
- Delete files manually
- Check transformation logs
- Monitor API usage

---

## 🚀 Next Steps

1. ✅ Deploy to Render with environment variables
2. ✅ Test all upload functionality
3. ✅ Monitor Cloudinary usage (free tier: 25GB storage, 25GB bandwidth/month)
4. 🔄 Consider cleaning up old `/uploads/` folder
5. 🔄 Add more Cloudinary features (image transformations, automatic optimization)

---

## 💡 Advanced Features (Optional)

### Image Optimization:
Add transformations to automatically optimize images:
```javascript
// In CloudinaryStorage params:
transformation: [{ width: 1000, crop: "limit" }, { quality: "auto" }]
```

### Automatic Format Conversion:
```javascript
format: 'auto'
```

### Video Support:
Already configured with `resource_type: 'auto'`, but currently blocked on frontend

---

## 📝 Notes

- All file URLs are now permanent Cloudinary URLs
- No need to backup `/uploads/` folder anymore
- Cloudinary handles CDN distribution automatically
- Files are geo-distributed for faster access worldwide
- Free tier should be sufficient for most student projects
